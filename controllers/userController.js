const mongoose = require("mongoose");
const User = mongoose.model("User");
const multer = require("multer");
const jimp = require("jimp");
const { checkUser } = require("./authController");

exports.getUsers = async (req, res) => {
  const { name } = req.query;
  let users = [];
  if (name) {
    users = await User.find({
      name: { $regex: `^${name}`, $options: "i" },
    }).select("_id name email avatar createdAt updatedAt");
  } else {
    users = await User.find().select(
      "_id name email avatar createdAt updatedAt"
    );
  }
  res.json(users);
};

exports.getAuthUser = (req, res) => {
  if (!req.isAuthUser) {
    return res.status(403).send({
      message: "You are unauthenticated. Please sign in or sign up",
    });
    // return res.redirect("/signin");
  }
  res.json(req.profile);
};

exports.getUserById = async (req, res, next, id) => {
  try {
    const user = await User.findOne({ _id: id }).select({ password: 0 });
    req.profile = user;
    checkUser(req);
    const profileId = mongoose.Types.ObjectId(req.profile?._id);
    if (req.user && profileId.equals(req.user?._id)) {
      req.isAuthUser = true;
      return next();
    }
  } catch (error) {
    console.log(error.message);
    return res.status(400).send({message:"Invalid id"})
  }
  next();
};

exports.getUserProfile = (req, res) => {
  if (!req.profile) {
    return res.status(404).json({
      message: "No user found",
    });
  }
  const { _id, following, followers, name, email, posts ,avatar} = req.profile;
  res.json({ _id, following, followers, name, email, posts,avatar });
};

exports.getUserFeed = async (req, res) => {
  const { following, _id } = req.profile;

  following.push(_id);
  const users = await User.find({ _id: { $nin: following } }).select(
    "_id name avatar"
  );
  res.json(users);
};

const avatarUploadOptions = {
  storage: multer.memoryStorage(),
  limits: {
    // storing images files up to 1mb
    fileSize: 1024 * 1024 * 1,
  },
  fileFilter: (req, file, next) => {
    if (file.mimetype.startsWith("image/")) {
      next(null, true);
    } else {
      next(null, false);
    }
  },
};

exports.uploadAvatar = multer(avatarUploadOptions).single("avatar");

exports.resizeAvatar = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  const extension = req.file.mimetype.split("/")[1];
  req.body.avatar = `/static/uploads/avatars/${
    req.user.name
  }-${Date.now()}.${extension}`;
  const image = await jimp.read(req.file.buffer);
  await image.resize(250, jimp.AUTO);
  await image.write(`./${req.body.avatar}`);
  next();
};

exports.updateUser = async (req, res) => {
  req.body.updatedAt = new Date().toISOString();
  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  res.json(updatedUser);
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;

  if (!req.isAuthUser) {
    return res.status(400).json({
      message: "You are not authorized to perform this action",
    });
  }
  const deletedUser = await User.findOneAndDelete({ _id: userId });
  res.json(deletedUser);
};

exports.addFollowing = async (req, res, next) => {
  const { followId } = req.body;

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $addToSet: { following: followId } },
    { new: true }
  ).select("following followers");
  res.json(user);
  next();
};

exports.addFollower = async (req, res) => {
  const { followId } = req.body;

  const user = await User.findOneAndUpdate(
    { _id: followId },
    { $addToSet: { followers: req.user._id } },
    { new: true }
  ).select("following followers");
  res.json(user);
};

exports.deleteFollowing = async (req, res, next) => {
  const { followId } = req.body;

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $pull: { following: followId } }
  ).select("following followers");
  res.json(user);
  next();
};

exports.deleteFollower = async (req, res) => {
  const { followId } = req.body;

  const user = await User.findOneAndUpdate(
    { _id: followId },
    { $pull: { followers: req.user._id } },
    { new: true }
  ).select("following followers");
  res.json(user);
};
