// Require all packages needed
var http = require("http"),
	socketio = require("socket.io")(app),
	url = require('url'),
	path = require('path'),
	fs = require('fs');
	request = require('request');

	//Keeps track of all users
	let users = {}

	//Keeps track of all rooms
	let rooms = {};

	//Create global room on start of server
	rooms['global'] = new Room('global', 'wSilberstein', false);

// Listen for HTTP connections.
var app = http.createServer(function(req, resp){

	//Parse filename
	fileName = url.parse(req.url).pathname
	
	//Direct file to index.html if none was given
	if(fileName == '/') {
		fileName = '/index.html';
	}

	filePath = path.join(__dirname, fileName);

	//Read the file given
	fs.readFile(filePath, function(err, data){
		
		//Return a response code of 500 if an error was thrown
		if(err) return resp.writeHead(500);

		//Return a successfull response code of 200
		resp.writeHead(200);
		
		//Display the file
		resp.end(data);
	});
});

//Listen for connections on port 3456
app.listen(3456);

// Do the Socket.IO magic:
var io = socketio.listen(app);

//Function called when a connection to a socket is made
io.sockets.on("connection", function(socket){

	//Send all public rooms to the user
	let publicRooms = [];
		for(let key in rooms) {
			if(!rooms[key].isPrivate && key != 'global') {
				publicRooms.push(rooms[key])
			}
		}
	//Send all public rooms to the client
	socket.emit('send-all-rooms', publicRooms)

	//Function called when login is called
	socket.on('login', function(data) {
		let error;

		//Create random id in base 32
		let id = Math.random().toString(32).substring(2);

		//Throw user exists error if user already exists
		for(let user in users) {
			if(data.username == user) {
				error = 1;
			}
		}

		//Send client error 
		if(error != null) {
			io.sockets.emit('client-error', {id: data.id, error: "User already exists"})
		} else {

			//Log user with id into all users array
			users[data.username] = id;

			//Send successful login with id to client
			socket.emit('logged in', {id: id, username: data.username})
		}
	})

	//Function called when user logs out
	socket.on('logout', function(data) {

		//Remove user from users array
		delete users[data.username]
	})
	
	//Function called when a user attempts to join a room
	socket.on('join room', function (data) {
		let bannedUser = false;
		let validRoom = false;

		//Check if room exists
		for(let key in rooms) {
			if(key == data.room) {
				validRoom = true;
			}
		}
		if(validRoom) {

			//Check to see if user is banned
			rooms[data.room].bannedUsers.forEach(function(user) {
				if(data.user == user) {
					bannedUser = true;
				}
			})

			//Check if user is banned from room
			if(bannedUser) {

				//Tell user they are bannen
				io.sockets.emit('banned', {user: data.user});
			} else {

				//Check to see if room is private
				if(rooms[data.room].isPrivate) {

					//Check to see if password is given
					if(data.password == undefined) {
						socket.emit('client-error', {error: "Invalid roomname or password", id: data.id})
					} else {

						//Check if passwords match
						if(data.password == rooms[data.room].password) {

							//Join the socket for the room
							socket.join(data.room)

							//Add user to room
							rooms[data.room].users.push(data.user)
							let publicRooms = [];
							for(let key in rooms) {
								if(!rooms[key].isPrivate && key != 'global') {
									publicRooms.push(rooms[key])
								}
							}

							//Sucessfully join private room
							socket.emit('joined private room', {room: data.room})

							//Send a recount of all users in the room
							io.sockets.in(data.room).emit('get-room-users', {users: rooms[data.room].users})

							//Send new room data to everyone in global
							io.sockets.in('global').emit('send-all-rooms', publicRooms)

							//Send new room data to all in the room
							io.sockets.in(data.room).emit('get current room', {room: rooms[data.room]});
						}
					}
				} else {
					//Join the socket for the room
					socket.join(data.room)

					//Add user to room
					rooms[data.room].users.push(data.user)
					let publicRooms = [];
					for(let key in rooms) {
						if(!rooms[key].isPrivate && key != 'global') {
							publicRooms.push(rooms[key])
						}
					}

					//Send a recount of all users in the room
					io.sockets.in(data.room).emit('get-room-users', {users: rooms[data.room].users})

					//Send new room data to everyone in global
					io.sockets.in('global').emit('send-all-rooms', publicRooms)

					//Send new room data to all in the room
					io.sockets.in(data.room).emit('get current room', {room: rooms[data.room]});
				}
				
			}
		} else {
			
			//Send user an error if room does not exist
			socket.emit('room-does-not-exist-error', {error: data.room + " does not exist"})
		}
	});

	//Function called when server receives an image
	socket.on('image-to-server', function(data) {

		//Create buffer for sending image back to client
		const buffer = Buffer.from(data.img, 'base64')

		//Send image buffer back to clients
		io.sockets.in(data.room).emit('image-to-client', {user: data.user, img: data.img, room: data.room})
	})

	//Function called when user attempts to leave a room
	socket.on('leave room', function(data) {

		//remove user from room's socket
		socket.leave(data.room)

		//Remove user from room
		for(let i = 0; i < rooms[data.room].users.length; i++) {
			if(rooms[data.room].users[i] == data.user) {
				rooms[data.room].users.splice(i, i+1);
			}
		}

		//Send users in room new room data
		io.sockets.in(data.room).emit('get-room-users', {users: rooms[data.room].users})

		//Delete the room if there is no one left
		if(rooms[data.room].users.length == 0 && data.room != 'global') {
			delete rooms[data.room]
		}

		let publicRooms = [];
		
		//Get all public rooms
		for(let key in rooms) {
			if(!rooms[key].isPrivate && key != 'global') {
				publicRooms.push(rooms[key])
			}
		}

		//Send all users in global all public rooms
		io.sockets.in('global').emit('send-all-rooms', publicRooms)
	})

	//Sends user data for room specified
	socket.on('get room', function(data) {
		for(let key in rooms) {
			if(key == data.room) {

				//Send room back to client
				socket.emit('get-room-client', {room: rooms[key]})
			}
		}
	})

	//Function called when a user attempt to create a public/ private room
	socket.on('create', function (data) {

		let publicRooms = [];

		let error = '';

		//Get all public rooms & check for duplicate room name
		for(let key in rooms) {
			if(!rooms[key].isPrivate && key != 'global') {
				publicRooms.push(rooms[key])
			}
			if(key == data.roomObj.name) {
				error = 1;
			}
		}

		//Throw error if one exists
		if(error != '') {
			socket.emit('client-error', {error: "Room name already exists"})
		} else {
			//Create/join socket for room
			socket.join(data.roomObj.name);

			//Create room
			createPublicRoom(data.roomObj, socket);

			//Emit successful room creation
			socket.emit('successful-room-creation', {room: data.roomObj});

			//Send users in global new room data
			io.sockets.in('global').emit('send-all-rooms', publicRooms)
		}
	});

	//Function called when client needs data on all public rooms
	socket.on('get-all-rooms', function(data) {

		let publicRooms = [];

		//Gets all public rooms
		for(let key in rooms) {
			if(!rooms[key].isPrivate && key != 'global') {
				publicRooms.push(rooms[key])
			}
		}
		//Sends all public rooms
		socket.emit('send-all-rooms', publicRooms)
	})

	//Function called when server receives a message
	socket.on('message-to-server', function(data) {
		//send message back to client

		for(let key in rooms) {

			//Check if room exists
			if(key == data.room) {
				let message = data.message;
				const matchMessage = /\/w\s\w.+\s\w/;

				//Check for global room - some users may not be logged in
				if(key != 'global') {

					//Check userid
					if(data.id == users[data.user]) {

						//Check to see if message is a whisper
						if(match2=matchMessage.exec(message)) {
							let user = data.user;
							let user2;
							let arr = match2[0].split(" ");
							let userCounter = 0;
							for(let user in users) {

								//Check if receiver user exists
								if(user == arr[1]) {
									rooms[data.room].users.forEach(function(roomUser) {

										//Check room for both users
										if(roomUser == user || roomUser == data.user) {
											userCounter++;
											user2 = user;				
										}
									})
								}
							}

							//Run if message is a whisper
							if(userCounter >= 2) {

								//Split message by spaces
								let parsedMessage = data.message.split(' ');

								//Format whisper
								let whisper = data.user + "-->" + user2 + ": ";

								//Append message word by word to the end of the message
								for(let i = 2; i < parsedMessage.length; i++) {
									whisper+=" " + parsedMessage[i];
								}

								//Send whisper to users in the room
								io.sockets.in(data.room).emit('whisper-to-client', {room: data.room, message: whisper, sender: data.user, receiver: user2, color: data.color})
							}
						} else {

							//Send message to all users in the room
							io.sockets.in(data.room).emit('message-to-client', {room: data.room, message:data.user + ": " + data.message, color: data.color})
						}
					} else {

						//Forgery detected error - ID does not match
						socket.emit('client-error', {error: "Invalid ID: Forgery detected"})
					}
				} else {
					//Check to see if message is a whisper
					if(match2=matchMessage.exec(message)) {
						let user = data.user;
						let user2;
						let arr = match2[0].split(" ");
						let userCounter = 0;
						for(let user in users) {

							//Check if receiver user exists
							if(user == arr[1]) {
								rooms[data.room].users.forEach(function(roomUser) {

									//Check room for both users
									if(roomUser == user || roomUser == data.user) {
										userCounter++;
										user2 = user;				
									}
								})
							}
						}

						//Run if message is a whisper
						if(userCounter >= 2) {

							//Split message by spaces
							let parsedMessage = data.message.split(' ');

							//Format whisper
							let whisper = data.user + "-->" + user2 + ": ";

							//Append message word by word to the end of the message
							for(let i = 2; i < parsedMessage.length; i++) {
								whisper+=" " + parsedMessage[i];
							}

							//Send whisper to users in the room
							io.sockets.in(data.room).emit('whisper-to-client', {room: data.room, message: whisper, sender: data.user, receiver: user2, color: data.color})
						}
					} else {

						//Send message to all users in the room
						io.sockets.in(data.room).emit('message-to-client', {room: data.room, message:data.user + ": " + data.message, color: data.color})
					}
				}
			}
		}
	})

	//Function called when a host attempts to kick a user from a room
	socket.on('kick-user-server', function(data) {
		let room = rooms[data.room.name];
		room.users.forEach(function(username) {

			//Check if user exists
			if(username == data.user) {

				//Remove user from the room
				room.users.splice(room.users.indexOf(data.user), room.users.indexOf(data.user) + 1);

				//Send data back to the room
				io.sockets.in(room.name).emit("kick-user-client", {user: data.user})

				//Send a recount of all users in the room
				io.sockets.in(room.name).emit('get-room-users', {users: rooms[room.name].users})
			}
		})
	})

	//Function called when a host attempts to ban a user from a room
	socket.on('ban-user-server', function(data) {
		let room = rooms[data.room.name];
		room.users.forEach(function(username) {

			//Check if user exists in the room
			if(username == data.user) {

				//Remove user from room
				room.users.splice(room.users.indexOf(data.user), room.users.indexOf(data.user) + 1);

				//Add user to banned users list
				room.bannedUsers.push(data.user)

				//Save room object
				rooms[data.room.name] = room;

				//Send back data to the room
				io.sockets.in(room.name).emit("kick-user-client", {user: data.user})

				//Send a recount of all users in the room
				io.sockets.in(room.name).emit('get-room-users', {users: rooms[room.name].users})
			}
		})
	})
});

//Function to create a room
function createPublicRoom(roomObj, socket) {
	rooms[roomObj.name] = roomObj
}

//Room object
function Room(name, host, isPrivate) {
    this.name = name;
    this.host = host;
    this.isPrivate = isPrivate;
    this.password;
    this.users = [];
    this.bannedUsers = [];
    this.messages = [];

    //Sets the room private
    this.setPrivate = function(password) {
        isPrivate = true;
        this.password = password;
    }

    //Sets the room public
    this.setPublic = function() {
        this.password = '';
        this.isPrivate = false;
    }
}