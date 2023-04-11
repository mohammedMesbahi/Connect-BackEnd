const express = require("express");

const authController = require("../controllers/adminControllers/authController");
const usersController = require("../controllers/adminControllers/usersController");
const postsController = require("../controllers/adminControllers/postsController");

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

/* Error handler for async / await functions */
const catchErrors = fn => {
  return function(req, res, next) {
    return fn(req, res, next).catch(next);
  };
};
/**
 * AUTH ROUTES: /api/admin/auth
*/
router.post(
    "/api/admin/auth/signup",
    uploadAvatar,
    authController.validateSignup,
    catchErrors(authController.createAdmin)
);
router.post("/api/admin/auth/signin", authController.signin);
router.get("/api/admin/auth/signout", authController.signout);
router.get("/api/admin/auth/isAuthenticated", authController.isAuthenticated);

/**
 * USER ROUTES: /api/admin/users
 */
router.param("userId", usersController.getUserById);

router
    .route("/api/admin/users/:userId")
    .get(
        authController.checkAuth,
        catchErrors(usersController.getUser))
    .delete(
        authController.checkAuth,
        catchErrors(usersController.deleteUser));

router.put('/api/admin/users/add/:userId',
    authController.checkAuth,
    catchErrors(usersController.add))

router.put('/api/admin/users/suspend/:userId',
    authController.checkAuth,
    catchErrors(usersController.suspend))

router.put('/api/admin/users/unsuspend/:userId',
    authController.checkAuth,
    catchErrors(usersController.unsuspend))

router.get("/api/admin/users",
    authController.checkAuth,
    catchErrors(usersController.getUsers));


/**
 * POST ROUTES: /api/admin/posts
 */
/* router.param("postId", postsController.getPostById);

router.delete(
    "/api/admin/posts/:postId",
    authController.checkAuth,
    catchErrors(postsController.deletePost)
);

router.get("/api/admin/posts", catchErrors(postsController.getPosts));

router.get("/api/admin/posts/by/:userId", catchErrors(postsController.getPostsByUser));
router.get("/api/admin/posts/feed/:userId", catchErrors(postsController.getPostFeed));
 */
/**
 * announce ROUTES: /api/admin/announces
 */
/* router.post(
    "/api/admin/announces/",
    announcesController.uploadImage,
    catchErrors(announcesController.resizeImage),
    catchErrors(announcesController.addPost)
);
router.get(
    "/api/admin/announces/",
    catchErrors(announcesController.getAnnounces)
);
router.param("announceId", postsController.getPostById);

router.delete(
    "/api/admin/announces/:announceId",
    catchErrors(announcesController.deleteAnnounce)
);
router.put(
    "/api/admin/announces/:announceId",
    announcesController.uploadImage,
    catchErrors(announcesController.resizeImage),
    catchErrors(announcesController.updateAnnounce)
); */



module.exports = router;
