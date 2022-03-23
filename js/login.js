//Variables to keep track of username and id
let username = 'anonymous user';
let id = 0;

//Function called when page is fully loaded
$(document).ready(function() {

    //Style page correctly
    showLoginButton(true);
    hideError();
    hideCreateRoomPassword();

    //Have user join global room at start
    socketio.emit('join room', {room:'global', user: 'anonymous user'});
})

//Attempts to set username when button clicked
$('#set-username-btn').click(function() {
    let user = document.getElementById('username-input').value;

    //Make sure username is given
    if(user == '') {

        error("Please provide a valid username")
    } else {
        
        //Set username
        setUsername(user);
    }

})

//Logs user out when button is clicked
$('#logout-btn').click(function() {

    //Join global room
    joinRoom('global');

    //Logout user
    logout();

    //Style page accordingly
    $('#main-content').css('display', 'block');
    $('#chatroom-div').css('display', 'none');
    
    showLoginButton(true);
})

//Hides errors when clicked
$('#error-dismiss').click(function() {
    hideError();
})

//Function to show or hide login button
function showLoginButton(value) {
    if(value) {
        $('#show-login-btn').show();
        $('#show-logout-btn').hide();
    } else {
        $('#show-login-btn').hide();
        $('#show-logout-btn').show();
    }
}

//Function to set username
function setUsername(username) {
    const matchUsername = /^\w+$/;

    //Check to make sure username is valid
    if(match=matchUsername.exec(username)){

        //Send login data so server
        socketio.emit('login', {username: username})
	}
}

//Function to hide errors
function hideError() {
    $('#error-alert').hide();
}

//Function to give an error
function error(error) {
    $('#error').text('ERROR: ' + error)
    $('#error-alert').show();
}

//Function to tell user info
function info(info) {
    $('#error').text(info)
    $('#error-alert').show();
}

//Function to logout
function logout() {
    socketio.emit('logout', {username: username});
    username = 'anonymous user';
    id = null;
}

//Function called when server sends successfull login callback
socketio.on('logged in', function(data) {

    //Set username and id
    id = data.id
    username = data.username

    //Style page
    document.getElementById('show-username').innerText = "Welcome " + username;
    showLoginButton(false);

    //Join global room
    socketio.emit('join room', {room: 'global', user: username})
})

