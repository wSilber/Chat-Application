# Chat Application
This project was made as my module 6 project for the class CSE 330. The application utilized Node.JS with Socket.io to allow for instantanious messaging between two or more people. People can create their own public or private rooms in which to chat with others.

![Chat app image](https://williamsilberste.in/res/chatroom.png)

## How to use
 - Configure port number (defaults to 3456)
 - run "node server.js"

## Image sending
 - Users can send images to anyone in the same room
 - Max image size is 500Kb so it does not overload the server
 - Users can only send images to the whole room (cannot message image)
 - Users can click on the image to enlarge it

 We've added a few stock images in the pictures folder (one contains more than 500Kb) for testing purposes, but feel free to use any image

## Chat color
 - Users can send messages in 7 predefined colors
 - Messages are displayed to everyone in the room with the chosen color
