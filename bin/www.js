#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require("../app");
var debug = require("debug")("project:server");
var http = require("http");
var cookie = require("cookie");
const { verifyToken } = require("../lib/authTools");

const mongoose = require("mongoose");

const {
  User,
  Post,
  Conversation,
  Notification,
  Comment,
  LikeReaction,
  Replay,
  Message,
} = require("../models/User");

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
      socket.id = user.id;
      next();
    })
    .catch((err) => {
      next(err);
    });
});

// on each connection
//1 - update the list of connected users and send it; to other users
io.of("/messages_notifications").on("connection", (socket) => {
  if (!connectedUsers.find((user) => user == socket.id)) {
    connectedUsers.push(socket.id);
    io.of("/messages_notifications").emit("connection", {
      ConnectedUsers: connectedUsers,
    });
  }
  /* **
  // message from the frontend
  message = {
    receivers:["mqsdfkljqsmdfkmklqsfdj"],
    content:"lreem ipusum inlulm "
    conversationId:"msqldfkjsmqdflkjqs" this proporty may exist or it may not exist
  }
*/
  // if user send an event "message" stor it in the dataBases and send it to the corresponding users
  socket.on("message", async (message) => {
    console.log(message);
    try {
      if (message.conversationId && message.conversationId.length) {
        let _message = new Message({
          sender: socket.id,
          receivers: [socket.id, ...message.receivers],
          content: message.content,
          seenBy: [socket.id],
        });
        let response1 = await User.updateMany(
          {
            "conversations._id": message.conversationId,
          },
          {
            $push: {
              "conversations.$.messages": _message,
            },
          }
        );
        console.log(
          "**************** ******************* A ************* **************"
        );
        console.log(
          "a new message has been added to the conversation specified by the client"
        );
        console.log(response1);
        _message = JSON.parse(JSON.stringify(_message));
        console.log(_message);
        io.of("messages_notifications")
          .to(_message.receivers)
          .emit("newMessage", {
            conversationId: message.conversationId,
            message: _message,
          });
        console.log(
          "**************** ******************* A ************* **************"
        );
      } else {
        let _conversation = new Conversation({
          participents: [socket.id, ...message.receivers],
          messages: [
            new Message({
              sender: socket.id,
              receivers: [socket.id, ...message.receivers],
              content: message.content,
              seenBy: [socket.id],
            }),
          ],
        });

        let response2 = await User.updateMany(
          {
            _id: { $in: [socket.id, ...message.receivers] },
          },
          {
            $push: {
              conversations: _conversation,
            },
          }
        );

        console.log(
          "**************** ******************* B ************* **************"
        );
        console.log("a new conversation has been added to all the receivers :");
        console.log(response2);
        console.log("conversation : ");
        let participents = JSON.parse(JSON.stringify(_conversation.participents));
        console.log(participents);
        await _conversation.populate({ path: 'participents', select: "name avatar email" })
        _conversation = JSON.parse(JSON.stringify(_conversation));
        console.log(_conversation);
        io.of("messages_notifications")
          .to(participents)
          .emit("newConversation", _conversation);
        console.log(
          "**************** ******************* B ************* **************"
        );
      }
    } catch (error) {
      console.log(error.message);
      socket.emit("badRequest", { error: error.message });
    }
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

  socket.on("markAsSeenMessages", async (data) => {
    try {
      let r1 = await User.updateMany(
        {
          "conversations._id": data.conversationId,
          "conversations.messages._id": { $in: data.messages },
        },
        { $addToSet: { "conversations.$[t].messages.$[l].seenBy": socket.id } },
        {
          arrayFilters: [
            { "t._id": data.conversationId },
            { "l._id": { $in: [...data.messages] } },
          ],
        }
      );
      if (r1.modifiedCount) {
        let peopleWhoMustUpdateTheirLocalStorage = await User.find({
          "conversations._id": data.conversationId,
          "conversations.messages._id": { $in: data.messages },
        })
          .select("_id")
          .lean();
        let a = [];
        peopleWhoMustUpdateTheirLocalStorage.forEach(e => a.push(JSON.parse(JSON.stringify(e._id))))
        data.seenBy = socket.id;
        io.of('/messages_notifications').to(a).emit("newSeenMessages", data);
      }
    } catch (error) {
      console.log(error.message);
    }

    /* try {
      let response = await User.updateMany(
        {
          "conversations._id": data.conversationId,
        },
        { $addToSet: { "conversations.$[message].seenBy": socket.id } },
        { arrayFilters: [{ "message._id": { $in: data.messages } }] }
      );
      console.log(response);
      if (response.matchedCount === 0) {
        console.log("No documents were matched for the update operation");
      }
    } catch (error) {
      console.log(error.message)
    } */
  });

  /** notifications */

  socket.on("notification", (notification) => {
    let newNotification = new Notification({
      notifier: notification.notifier,
      recipients : notification.recipients.length ? notification.recipients : [],
      notificationContent: notification.notificationContent,
      type:notification.type,
      url: `/feed#${notification.postId}`,
    });


    let query = notification.recipients.length ?  { _id: { $in: newNotification.recipients } } : {};
    User.updateMany(query, {
      $push: { notifications: newNotification }
    }).then(res => {
      newNotification.populate({ path: 'notifier', select: 'name avatar _id' })
        .then(newN => {
          io.of('/messages_notifications').to(notification.recipients).emit('newNotification', {notification:newN,body:notification.body});
        })

    }).catch(err => {
      console.log(err.message);
    })

  })
});
/* 
  [connection] - [message] - [comment] - [replay] - [disconnection] - [markAsSeenMessages]
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
