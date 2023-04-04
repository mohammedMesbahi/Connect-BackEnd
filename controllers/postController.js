const multer = require("multer");
const jimp = require("jimp");
const mongoose = require("mongoose");
const { Post, User, LikeReaction, Comment } = require("../models/User");
const { checkUser } = require("./authController");

const imageUploadOptions = {
  storage: multer.memoryStorage(),
  limits: {
    // storing images files up to 1mb
    fileSize: 1024 * 1024 * 2,
  },
  fileFilter: (req, file, next) => {
    if (file.mimetype.startsWith("image/")) {
      next(null, true);
    } else {
      next(null, false);
    }
  },
};

exports.uploadImage = multer(imageUploadOptions).single("media");

exports.resizeImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  const extension = req.file.mimetype.split("/")[1];
  req.body.media = `/static/uploads/${
    req.user.name
  }-${Date.now()}.${extension}`;
  const image = await jimp.read(req.file.buffer);
  image.resize(420, jimp.AUTO);
  image.write(`./${req.body.media}`);
  next();
};

exports.addPost = async (req, res) => {
  console.log(req.body);
  if (req.body.caption || req.body.media) {
    let post = new Post({
      owner: req.user.id,
      caption:req.body.caption,
      media:req.body.media
    });
    try {
      await User.updateOne({ _id: req.user.id }, { $push: { posts: post } });
      res.send(post);
    } catch (error) {
      console.log(error.message);
      return res.status(500).send({message:error.message})
    }
  } else {
    return res.status(400).send({message:"provide at least one field"})
  }

};

exports.getPostById = async (req, res, next, id) => {
  checkUser(req);
  const post = await User.findOne({ _id: req.user.id });
  req.post = post;

  const posterId = mongoose.Types.ObjectId(req.post?.owner);
  if (req.user && posterId.equals(req.user?._id)) {
    req.isPoster = true;
    return next();
  }
  next();
};

exports.deletePost = async (req, res) => {
  const { _id } = req.post;

  if (!req.isPoster) {
    return res.status(400).json({
      message: "You are not authorized to perform this action",
    });
  }
  const deletedPost = await Post.findOneAndDelete({ _id });
  res.json(deletedPost);
};

exports.getPostsByUser = async (req, res) => {
  const posts = await Post.find({ postedBy: req.profile._id }).sort({
    createdAt: "desc",
  });
  res.json(posts);
};

exports.getPostFeed = async (req, res) => {
  const { following, _id } = req.profile;

  following.push(_id);
  const posts = await Post.find({ postedBy: { $in: following } }).sort({
    createdAt: "desc",
  });
  res.json(posts);
};
exports.getPosts = async (req, res) => {
  try {
    let ArrayOfpostsArray = await User.find({}, { _id: 0, posts: 1 })
      .populate({
        path: "posts",
        populate: [
          {
            path: "owner",
            select: "name avatar",
          },
          {
            path: "reactions",
            populate: {
              path: "owner",
              select: "name avatar _id",
            },
          },
          {
            path: "comments",
            populate: [
              {
                path: "owner",
                select: "name avatar _id",
              },
              {
                path: "replays",
                populate: {
                  path: "owner",
                  select: "name avatar _id",
                },
              },
            ],
          },
        ],
      })
      .lean();
    let postsArray = [];

    ArrayOfpostsArray.forEach((obj) => {
      obj.posts.forEach((post) => {
        postsArray.push(post);
      });
    });
    postsArray.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    res.status(200).json(postsArray);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleLike = async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;
  const reaction = new LikeReaction({ owner: userId });

  try {
    const post = await User.findOne({ "posts._id": postId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userReaction = post.posts
      .find((p) => p._id.toString() === postId)
      .reactions.find((r) => r.owner.toString() === userId);

    if (userReaction) {
      // User has already liked the post, remove the like
      await User.updateOne(
        { "posts._id": postId },
        { $pull: { "posts.$.reactions": { owner: userId } } }
      );
    } else {
      // User hasn't liked the post, add the like
      await User.updateOne(
        { "posts._id": postId },
        { $push: { "posts.$.reactions": reaction } }
      );
    }
    // let r = await User.findOne({ "posts._id": postId ,"posts.reactions._id": reaction._id })
    await reaction.populate({path:'owner',select:'avatar name _id'});
    res.send({ liked: !userReaction, reaction });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.addComment = async (req, res) => {
  const { postId, commentText } = req.body;
  const userId = req.user.id;
  const comment = new Comment({ owner: userId, commentText: commentText });

  try {
    const post = await User.findOne({ "posts._id": postId });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    await User.updateOne(
      { "posts._id": postId },
      { $push: { "posts.$.comments": comment } }
    );
    await comment.populate({path:'owner',select:'name avatar _id'})
    res.send({postId,comment});
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId } = req.body;

  try {
    const post = await User.findOne({
      $or: [
        { "posts.$.owner": req.user.id },
        { "comments.owner": req.user.id },
      ],
      "posts.comments._id": commentId,
    });
    if (!post) {
      return res.status(404).json({ error: "comment not found" });
    }

    User.updateOne(
      {
        $or: [
          { "posts.$.owner": req.user.id },
          { "comments.owner": req.user.id },
        ],
        "posts.comments._id": commentId,
      },
      { $pull: { "posts.$.comments": { _id: commentId } } }
    )
      .then((r) => {
        res.send({ commentId: commentId });
      })
      .catch((error) => {
        console.log(error.message);
        res.status(500).json({ error: "Server error" });
      });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Server error" });
  }
};
