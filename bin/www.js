#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require("../app");
var debug = require("debug")("project:server");
var http = require("http");
var cookie = require("cookie");
const { verifyToken } = require("../lib/authTools");
const Message = require("../models/Message");
const mongoose = require("mongoose");
/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/*  ********** integrating socketIo ✔🎉 ********
 */

const { Server } = require("socket.io");
const { default: axios } = require("axios");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});
/* 

const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  }
});

*/
let connectedUsers = [];
// a middleware to authenticate a user
io.of("/messages_notifications").use((socket, next) => {
  var cookies = cookie.parse(socket.handshake.headers.cookie || "");
  verifyToken(cookies.jwt)
    .then((user) => {
      socket.user = user;
      socket.id = user.userid;
      next();
    })
    .catch((err) => {
      next(err);
    });
});

// on each connection
//1 - update the list of connected users and send it to other users
io.of("/messages_notifications").on("connection", (socket) => {
  if (!connectedUsers.find((user) => user == socket.id)) {
    connectedUsers.push(socket.id);
    io.of("/messages_notifications").emit("connection", {
      ConnectedUsers: connectedUsers,
    });
  }

  // if user send an event "message" send it to the corresponding user and stor it in the dataBase
  socket.on("notification-message", (message) => {
    message.sender = socket.id;
    // save the message to the database
    Message.create({ ...message, sender: socket.id })
      .then((doc) => {
        const plainDoc = JSON.parse(JSON.stringify(doc));
        io.of("/messages_notifications")
          .to(plainDoc.reciever)
          .to(plainDoc.sender)
          .emit("notification-message",plainDoc);
      })
      .catch((err) => console.error(err.message));
  });
  socket.on("comment", (comment) => {
    // if the reciever is connected: send him the comment as a notification
    // if he acknolodes the comment: registr the comment in the database as seen comment
    // else as unseen comment
  });
  socket.on("disconnect", () => {
    connectedUsers = connectedUsers.filter((user) => user !== socket.id);
    io.of("/messages_notifications").emit("disconnection", {
      ConnectedUsers: connectedUsers,
    });
  });

  socket.on("markAsSeenMessages", (messages) => {
    let messagesId = messages.map((message) => {
      return new mongoose.Types.ObjectId(message._id);
    });
    if (messagesId.length) {
      Message.updateMany(
        {
          _id: {
            $in: messages,
          },
        },
        { $set: { seen: true } }
      )
        .then((seenMessages) => {
          socket.emit("seenMessages", messages);
        })
        .catch(console.log);
    }
  });
});
/* 
  [connection] - [notification-message] - [notification-comment] - [notification-replay] - [disconnection] - [markAsSeenMessages]
*/

// *********************************************************** 🤞🤞 ********************************

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}
