let isPublic = true;
let currentRoom = 'global';
let currentRoomObj;
let globalChatColor = 'default';
let roomChatColor = 'default';

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------//
                                                            Click Functions
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

// Function called when chatroom title is clicked - Joins the global room
$('#nav-title').click(function() {
    $('#main-content').css('display', 'block');
    $('#chatroom-div').css('display', 'none');
    
    if(currentRoom != 'global') {
        joinRoom('global', null)
        socketio.emit('get-all-rooms');
    }
})

//Switches room to private when clicked
$('#create-chat-room-private-btn').click(function() {
    showCreateRoomPassword();
    isPublic = false;
})

//Switches room to public when clicked
$('#create-chat-room-public-btn').click(function() {
    hideCreateRoomPassword();
    isPublic = true;
})

//Function called when create room button is clicked
$('#create-chat-room-btn').click(function() {
    let room = $('#create-chat-room-name').val();
    let host = username;
    if(username != 'anonymous user') {
     
        //Determines if room should be public or private
        if(isPublic) {

            //Create public room
            const data = {roomObj: new Room(room, host, false)}

            //Creates room
            socketio.emit('create', data);
        } else {

            //Create private room
            let password = $('#create-private-room-password-input').val();
            if(password != '') {
                let roomObj = new Room(room, host, true)
                roomObj.setPrivate(password)
                const data = {roomObj: roomObj}

                //Creates room
                socketio.emit('create', data);
            }
        }

    } else {

        //Give error message if not logged in
        error("You must be logged in to do this")
    }
})

//Attempts to join private room when button is clicked
$('#join-private-room-btn').click(function() {
    let name = $('#join-private-room-name-input').val()
    let password = $('#join-private-room-password-input').val()

    //Check if user is logged in and room name and passward are given
    if(username != 'anonymous user') {
        if(name != '' && password != '') {

            //Attempt to join private room
            socketio.emit('join room', {room: name, user: username, password: password})
        }
    } else {

        //Error if not logged in
        error("You must be logged in to do this")
    }

})

//Sends a message to the global chat when clicked
$('#global-send-message-btn').click(function() {
    let message = $('#global-chat-input').val();

    //Reset chat input
    document.getElementById('global-chat-input').value = '';

    //Send message to server
    socketio.emit('message-to-server', {message: message, room: 'global', user: username, color: globalChatColor})
})

//Kick user when button is clicked
$('#kick-user-btn').click(function() {
    let user = $('#kick-user-input').val();

    //Kick user if username given and username does not equal themselves
    if(user != '' && user != username) {
        kickUser(user);
    }
})

//Ban user when button is clicked
$('#ban-user-btn').click(function() {
    let user = $('#ban-user-input').val();

    //Make sure username given and username does not equal themselves
    if(user != '' && user != username) {
        banUser(user);
    }
})

//Send message when clicked
$('#room-chat-btn').click(function() {
    let message = $('#chat-input').val();
    document.getElementById('chat-input').value = '';

    //Send message to server
    socketio.emit('message-to-server', {message: message, room: currentRoom, user: username, id: id, color: roomChatColor})
})

//Show admin controls on click
$('#admin-controls').click(function() {
    $('#admin-modal').modal('show');
})

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------//
                                                            Socket Functions
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//Received from server on successful private room join
socketio.on('joined private room', function(data) {
    currentRoom = data.room;
    hideAdminControls();
    $('#main-content').css('display', 'none');
    $('#chatroom-title').text(data.room);
    document.getElementsByClassName('chatlog-name')[0].id = 'chatlog-' + data.room;
    $('#chatroom-div').css('display', 'block');
    document.getElementsByClassName('chatlog-name')[0].innerHTML = '';
})

//Received successful room join
socketio.on('successful-room-creation', function(data) {

    //Style room
    $('#main-content').css('display', 'none');
    $('#chatroom-title').text(data.room.name);
    $('#chatroom-div').css('display', 'block');

    //Join room
    joinRoom(data.room.name, data.room.password);
})

//Received message from the server
socketio.on('message-to-client', function(data) {

    //Create new text container
    let text_container = document.createElement('div');
    text_container.classList.add('message-text');
    text_container.style.color = data.color

    //Append text to container
    text_container.appendChild(document.createTextNode(data.message));
        
    //Append container to chatlog
    document.getElementById("chatlog-" + data.room).appendChild(text_container);

    //Scroll to bottom of chatlog
    if(currentRoom == 'global') {
        document.getElementById('global-chat').scrollTo(0, Number.MAX_SAFE_INTEGER)
    } else {
        document.getElementById('chatlog-container').scrollTo(0, Number.MAX_SAFE_INTEGER)
    }
})

//Receives all users in room from server
socketio.on('get-room-users', function(data) {

    //Create container to hold users
    let container = document.getElementById('online-users');
    container.classList.add('centered')
    container.innerHTML = '';

    //Add all users to container
    data.users.forEach(function(user) {

        //Create user container
        let userP = document.createElement('button');
        userP.classList.add('dark-blue-btn');
        userP.classList.add('btn');
        userP.style.width = '100%';

        //Append username to container
        userP.innerText = user;

        //Append container to all user's container
        container.appendChild(userP);

        //Add a click listener for whisper function
        userP.addEventListener('click', function() {
            document.getElementById('chat-input').value = "/w " + user + " ";
        })
    })
})

//Receives user in banned from room
socketio.on('banned', function(data) {

    //Checks for username
    if(data.user == username) {
        $('#main-content').css('display', 'block');
        $('#chatroom-div').css('display', 'none');
        
        //Joins global room
        joinRoom('global', null)
        socketio.emit('get-all-rooms');
        info("You are banned from this room")
    }
})

//Received whisper from server
socketio.on('whisper-to-client', function(data) {

    //Checks if user is sender or receiver
    if(username == data.sender || username == data.receiver) {
        
        //Check if room is global room
        if(data.room == 'global') {

            //Create text container
            let text_container = document.createElement('div');
            text_container.classList.add('whisper-text');

            //Append text to text container
            text_container.appendChild(document.createTextNode(data.message));

            //Append text container to chatlog
            document.getElementById("chatlog-global").appendChild(text_container);
        } else {

            //Create text container
            let text_container = document.createElement('div');
            text_container.classList.add('whisper-text');

            //Append message to text container
            text_container.appendChild(document.createTextNode(data.message));
                
            //Append text container to chatlog
            document.getElementById("chatlog-" + data.room).appendChild(text_container);
        }
    }
})

//Received client error from server
socketio.on('client-error', function(data) {

    //Display error to user
    error(data.error)
})

//Received room does not exist error from server
socketio.on('room-does-not-exist-error', function(data) {

    //Change room back to global
    $('#main-content').css('display', 'block');
    $('#chatroom-div').css('display', 'none');
    
    currentRoom = 'global';
    error("That room does not exist")
    socketio.emit('get-all-rooms');
})

//Received room information from server (Used for granting admin controls)
socketio.on('get current room', function(data) {
    currentRoomObj = data.room;

    //Check to make sure user is host of the room
    if(currentRoomObj.name == currentRoom && currentRoomObj.host == username) {

        //Grant user admin controls
        showAdminControls();
    }
})

//Received kick user from server
socketio.on('kick-user-client', function(data) {
    
    //Check if username matches given user
    if(data.user == username) {

        //Join room global
        joinRoom('global', null);

        //Tell user they have been kicked
        info('You have been kicked from the room');
    }
})

//Received image from server
socketio.on('image-to-client', function(data) {
    let img = new Image();
    let image = new Uint8Array(data.img);

    //Create image from given Uint8Array
    let encodedImage = 'data:image/png;base64,' + encodeImageToBase64(image);

    //set image constraints and source
    img.src = encodedImage
    img.style.maxWidth = "30%";
    img.style.maxHeight = "20%";

    //Create image container
    let text_container = document.createElement('div');
    text_container.classList.add('message-text');
    text_container.innerText = data.user + ": ";

    //Append image to container
    text_container.appendChild(img)
        
    //Append container to chatlog
    document.getElementById("chatlog-" + data.room).appendChild(text_container);

    //Scroll to the bottom of the chatlog
    if(currentRoom == 'global') {
        document.getElementById('global-chat').scrollTo(0, Number.MAX_SAFE_INTEGER)
    } else {
        document.getElementById('chatlog-container').scrollTo(0, Number.MAX_SAFE_INTEGER)
    }

    //Add a click listener to the image
    img.addEventListener('click', function() {
        document.getElementById('image-header').innerText = data.user;

        //Create bigger image
        let bigImg = new Image();
        bigImg.src = encodedImage;
        bigImg.style.maxHeight = "100%"
        bigImg.style.maxWidth = "100%"

        //Append bigger image to modal body
        document.getElementById('image-modal-body').innerHTML = '';
        document.getElementById('image-modal-body').appendChild(bigImg)

        //Show modal
        showImageModal();
    })
})

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------//
                                                            User Functions
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//Join room function
function joinRoom(room, password) {

    //Check to make sure user is logged in
    if(username != 'anonymous user') {

        //Leaves current room
        leaveRoom(currentRoom)

        //Sets the current room to the new room
        currentRoom = room

        //Check to make sure room is not global
        if(room != 'global') {

            //Hide admin controls
            hideAdminControls();

            //Display room content
            $('#main-content').css('display', 'none');
            $('#chatroom-title').text(room);
            document.getElementsByClassName('chatlog-name')[0].id = 'chatlog-' + room;
            $('#chatroom-div').css('display', 'block');
            document.getElementsByClassName('chatlog-name')[0].innerHTML = '';
        } else {
            $('#main-content').css('display', 'block');
            $('#chatroom-div').css('display', 'none');
            
        }

        //Join private room if password given
        if(password != null) {

            //Join private room
            socketio.emit('join room', {room:room, user: username, password: password});
        } else {

            //Join public room
            socketio.emit('join room', {room:room, user: username});
        }
    } else {

        //Send error message if not logged in
        error("You must be logged in to do that")
    }
}

//Leave room function
function leaveRoom(room) {

    //Send leave room to server
    socketio.emit('leave room', {room:room, user: username})
    currentRoom = 'JUST-LEFT-ROOM';
}

//Function to encode an image from Base64 to Uint8Array
function encodeImageFromBase64(file, room) {
    let fileReader = new FileReader();

    //Called when fileReader is loaded
    fileReader.onload = function(FileLoadEvent) {

        //Create array with given file
        const bytes = new Uint8Array(this.result);

        let data = FileLoadEvent.target.result;

        //Check if byte size is over 500Kb
        if(bytes.length > 500000) {
            error("Please keep image size less than 500kb")
        } else {

            //Send array to the server
            socketio.emit('image-to-server', {img: data, room: room, user: username})
        }
    }

    //Tell fileReader to read image as an Array buffer
    fileReader.readAsArrayBuffer(file)
}

//Function to encode an image from Uint8Array to Base64
function encodeImageToBase64(image) {
    let encodedImg = '';
    let bytes = new Uint8Array(image);

    //Convert bytes to characters
    for (let i = 0; i < bytes.length; i++) {
        encodedImg += String.fromCharCode(bytes[i]);
    }

    //Encode the string with Base64
    return window.btoa(encodedImg);
}

//Function to kick a user
function kickUser(user) {
    
    //Send kick info to server
    socketio.emit('kick-user-server', {room: currentRoomObj, user: user})
}

//Function to ban a user
function banUser(user) {
    
    //Send ban info to server
    socketio.emit('ban-user-server', {room: currentRoomObj, user: user})
}

//Function to hide admin controls
function hideAdminControls() {
    $('#admin-controls').hide();
}

//Function to show admin controls
function showAdminControls() {
    $('#admin-controls').show();
}

//Function to hide password
function hideCreateRoomPassword() {
    $('#create-private-room-password-input').hide();
}

//Function to show password
function showCreateRoomPassword() {
    $('#create-private-room-password-input').show();
}

//Function to show image modal
function showImageModal() {
    $('#image-modal').modal('show');
}

//Function to hide image modal
function hideImageModal() {
    $('#image-modal').modal('hide');
}

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------//
                                                            Change Listeners
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

//Listener to send image to server when file input is changed
document.getElementById('global-upload-photo').addEventListener('change', function() {

    //Send image to global room
    encodeImageFromBase64(document.getElementById('global-upload-photo').files[0], 'global')

    //Reset file input
    document.getElementById('global-upload-photo').value = '';
})

//Listener to send image to server when file input is changed
document.getElementById('room-upload-photo').addEventListener('change', function() {
    
    //Send image to room
    encodeImageFromBase64(document.getElementById('room-upload-photo').files[0], currentRoom);

    //Reset file input
    document.getElementById('global-upload-photo').value = '';
})

//Add click listeners to change chat color
for(let i = 0; i < document.getElementById('colors-global').children.length; i++) {
    document.getElementById('colors-global').children[i].addEventListener('click', function() {
        globalChatColor = this.innerText;
    })
}

//Add click listener to change chat color
for(let i = 0; i < document.getElementById('colors-room').children.length; i++) {
    document.getElementById('colors-room').children[i].addEventListener('click', function() {
        roomChatColor = this.innerText;
    })
}

/*---------------------------------------------------------------------------------------------------------------------------------------------------------------------//
                                                            Room Object
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

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
