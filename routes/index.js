/* var express = require('express');
var router = express.Router(); */


/* module.exports = router; */
const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const postController = require("../controllers/postController");
const messageController = require("../controllers/messageController");
const notificationController = require('../controllers/notificationController')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
/* ******************************* upload *************************** */

const avatarUploadOptions = {
  storage: multer.memoryStorage(),
  limits: {
    // storing images files up to 1mb
    fileSize: 1024 * 1024 * 2
  },
  fileFilter: (req, file, next) => {
    if (file.mimetype.startsWith("image/")) {
      next(null, true);
    } else {
      next(null, false);
    }
  }
};

const uploadAvatar = multer(avatarUploadOptions).single("avatar");

/* ******************************* upload *************************** */

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
/* Error handler for async / await functions */
const catchErrors = fn => {
  return function(req, res, next) {
    return fn(req, res, next).catch(next);
  };
};

/**
 * AUTH ROUTES: /api/auth
 */
router.post(
  "/api/auth/signup",
  uploadAvatar,
  authController.validateSignup,
  catchErrors(authController.signup)
);
router.post("/api/auth/signin", authController.signin);
router.get("/api/auth/signout", authController.signout);
router.get("/api/auth/isAuthenticated", authController.isAuthenticated);

/**
 * USER ROUTES: /api/users
 */
router.param("userId",userController.getUserById);

router.put(
  "/api/users/follow",
  authController.checkAuth,
  catchErrors(userController.addFollowing),
  catchErrors(userController.addFollower)
);
router.put(
  "/api/users/unfollow",
  authController.checkAuth,
  catchErrors(userController.deleteFollowing),
  catchErrors(userController.deleteFollower)
);

router
  .route("/api/users/:userId")
  .get(userController.getAuthUser)
  .put(
    authController.checkAuth,
    userController.uploadAvatar,
    catchErrors(userController.resizeAvatar),
    catchErrors(userController.updateUser)
  )
  .delete(authController.checkAuth, catchErrors(userController.deleteUser));

router.get("/api/users", userController.getUsers);
router.get("/api/users/profile/:userId", userController.getUserProfile);
router.get(
  "/api/users/feed/:userId",
  authController.checkAuth,
  catchErrors(userController.getUserFeed)
);

/**
 * POST ROUTES: /api/posts
 */
router.param("postId", postController.getPostById);

router.put(
  "/api/posts/toggleLike",
  authController.checkAuth,
  catchErrors(postController.toggleLike)
);
router.put(
  "/api/posts/unlike",
  authController.checkAuth,
  catchErrors(postController.toggleLike)
);

router.put(
  "/api/posts/comment",
  authController.checkAuth,
  catchErrors(postController.addComment)
);
router.delete(
  "/api/posts/comment",
  authController.checkAuth,
  catchErrors(postController.deleteComment)
);
router.get('/api/posts/comments/:id',
authController.checkAuth,catchErrors(postController.getComment));

router.delete(
  "/api/posts/:postId",
  authController.checkAuth,
  catchErrors(postController.deletePost)
);

router.post(
  "/api/posts/",
  authController.checkAuth,
  postController.uploadImage,
  catchErrors(postController.resizeImage),
  catchErrors(postController.addPost)
);
router.get("/api/posts",authController.checkAuth,catchErrors(postController.getPosts));

router.get("/api/posts/by/:userId", catchErrors(postController.getPostsByUser));
router.get("/api/posts/feed/:userId", catchErrors(postController.getPostFeed));


/**
 * MESSAGE ROUTES: /api/messages
 */
router.get("/api/messages/conversations",authController.checkAuth,catchErrors(messageController.getConversations));

/**
 * NOTIFICATIONS ROUTES: /api/notifications
 */
router.get("/api/notifications",authController.checkAuth,catchErrors(notificationController.getNotifications));

module.exports = router;
