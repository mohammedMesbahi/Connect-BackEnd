const jwt = require('jsonwebtoken');
exports.checkAuth = (req, res, next) => {
    // check json web token exists & is verified
    /* if (!req.cookie["jwt"]) {
        return next(new Error("Invalid token"))
    }
    else {
        jwt.verify(req.cookie["jwt"], process.env.jwtSecret, (err, decodedToken) => {
            err ? next(new Error(err.message)) : next(decodedToken)
        })
    }; */
    console.log(req);
    next();
}
exports.verifyToken = async (token) => {
    return jwt.verify(token, process.env.jwtSecret)
}
