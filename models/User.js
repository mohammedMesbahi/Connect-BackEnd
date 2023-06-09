const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const bcrypt = require("bcrypt");
const mongodbErrorHandler = require("mongoose-mongodb-errors");

/* **************************************************** schemas **************************************************** */
const reactionSchema = new mongoose.Schema({
  owner: {
    type: ObjectId,
    ref: "User",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const replaySchema = new mongoose.Schema({
  owner: {
    type: ObjectId,
    ref: "User",
  },
  replayText: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const commentSchema = new mongoose.Schema({
  owner: {
    type: ObjectId,
    ref: "User",
  },
  commentText: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  replays: [replaySchema],
});

const postSchema = new mongoose.Schema({
  owner: {
    type: ObjectId,
    ref: "User",
  },
  caption: {
    type: String,
    default:undefined
  },
  media: {
    type: String,
    default:undefined
  },
  reactions: [reactionSchema],
  comments: [commentSchema],
  date: {
    type: Date,
    default: Date.now,
  },
});

const messageSchema = new mongoose.Schema({
  sender: {
    type: ObjectId,
    ref: "User",
    // required: true
    // unique: true
  },
  receivers: [
    {
      type: ObjectId,
      ref: "User",
      // required: true
      // unique: true
    },
  ],
  content: {
    type: String,
    required: true,
    // unique: true
    // trim: true
  },
  seenBy: [
    {
      type: ObjectId,
      ref: "User",
    },
  ],
  date: {
    type: Date,
    default: Date.now,
  },
});

const conversationSchema = new mongoose.Schema({
  participents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  messages: [messageSchema],
  date: {
    type: Date,
    default: Date.now,
  },
});

const notificationSchema = new mongoose.Schema({
  notifier: {
    type: ObjectId,
    ref: "User",
  },
  recipients: [
    {
      type: ObjectId,
      ref: "User",
    },
  ],
  type:{
    type:String,
  },
  notificationContent: {
    type: String,
  },
  url:{
    type:String
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "enter a valid user name"],
  },
  email: {
    type: String,
    unique: true,
    required: [true, "enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "password is required"],
    trim: true,
    min: 5,
    max: 100,
  },
  avatar: {
    type: String,
    default: "/static/images/profile-image.jpg",
  },
  posts: [postSchema],
  conversations: [conversationSchema],
  notifications: [notificationSchema],
  following: [{ type: ObjectId, ref: "User" }],
  followers: [{ type: ObjectId, ref: "User" }],
  suspended:{
    type:Boolean,
    default:false
  },
  checked:{
    type:Boolean,
    default:false
  }
});

/* **************************************************** schemas *****************************************************/

/* **************************************************** methods **************************************************** */

/* **************************************************** methods **************************************************** */

userSchema.pre("save", function (next) {
  const saltRounds = 10;
  this.password = bcrypt.hashSync(this.password, saltRounds);
  next();
});
userSchema.methods.isValidPassword = function (password) {
  const user = this;
  const compare = bcrypt.compareSync(password, user.password);
  return compare;
};

userSchema.plugin(mongodbErrorHandler);
const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const Comment = mongoose.model("Comment", commentSchema);
const LikeReaction = mongoose.model("LikeReaction", reactionSchema);
const Replay = mongoose.model("Replay", replaySchema);
const Message = mongoose.model("Message", messageSchema);

module.exports = {
  User,
  Post,
  Conversation,
  Notification,
  Comment,
  LikeReaction,
  Replay,
  Message,
};
