const mongoose = require("mongoose");
const Admin = mongoose.model("Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

exports.validateSignup = (req, res, next) => {
    req.sanitizeBody("name");
    req.sanitizeBody("email");
    req.sanitizeBody("password");
    // req.sanitizeBody("rPassword");

    // Name is non-null and is 4 to 10 characters
    req.checkBody("name", "Enter a name").notEmpty();
    req
        .checkBody("name", "Name must be between 4 and 10 characters")
        .isLength({ min: 4, max: 10 });

    // Email is non-null, valid, and normalized
    req.checkBody("email", "Enter a valid email").isEmail().normalizeEmail();

    // Password must be non-null, between 4 and 10 characters
    req.checkBody("password", "Enter a password").notEmpty();
    req
        .checkBody("password", "Password must be between 4 and 10 characters")
        .isLength({ min: 4, max: 10 });

    // req.assert("password", "Passwords do not match").equals(req.body.rPassword);

    const errors = req.validationErrors();
    if (errors) {
        const firstError = errors.map((error) => error.msg)[0];
        return res.status(400).send(firstError);
    }
    next();
};

exports.createAdmin = async (req, res) => {
    /* ***************** */
    if (req.file) {
        const extension = req.file.mimetype.split("/")[1];
        req.body.avatar = `/static/uploads/avatars/${Date.now()}.${extension}`;
        const image = await jimp.read(req.file.buffer);
        await image.resize(250, jimp.AUTO);
        await image.write(`./${req.body.avatar}`);
      }
    /* **************** */
    let { name, email, password, avatar } = req.body;
    avatar = avatar.length ? avatar : "/static/images/profile-image.jpg";
    try {
        Admin.create({ name, email, password, avatar })
            .then((user) => {
                res.send({ message: user });
            })
            .catch((err) => {
                const errors = handleErrors(err);
                res.status(400).json({ errors: errors });
            });
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ error: error.message });
    }
};

exports.signin = (req, res, next) => {
    const { email, password } = req.body;
    if (!(req.body.email) || !(req.body.password)) {
        return res.status(400).send({message:'email and password are both required'})
    }
    console.log(req.body);
    Admin.findOne({ email: email })
        .then((admin) => {
            if (!admin) {
                return res.status(404).send("this email is not registered");
            } else {
                if (admin.isValidPassword(password)) {
                    var token = jwt.sign(
                        {
                            _id: admin.id,
                            email: admin.email,
                            name: admin.name,
                            id: admin.id,
                            admin: true
                        },
                        process.env.jwtSecret,
                        { expiresIn: maxAge }
                    );
                    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
                    return res.status(201).json(admin);
                } else {
                    res.status(403).send("wrong cridentials");
                }
            }
        })
        .catch((err) => {
            const errors = handleErrors(err);
            res.status(400).json({ errors: errors });
        });
};

exports.signout = (req, res) => {
    res.cookie("jwt", "", { maxAge: 1 });
    res.send({ mrssage: "succsess" });
    // res.redirect('/');
};

exports.checkAuth = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.jwtSecret, (err, decodedToken) => {
            if (err || !(decodedToken.admin)) {
                console.log(err);
                return res.status(402).send({ message: "unAuthorized" });
            } else {
                req.admin = decodedToken;
                return next();
            }
        });
    } else {
        res.status(401).send({ message: "unAuthorized" });
    }
};

exports.isAuthenticated = (req, res) => {
    const token = req.cookies.jwt;
    // check json web token exists & is verified
    if (token) {
        jwt.verify(token, process.env.jwtSecret, (err, decodedToken) => {
            if (err || !decodedToken.admin) {
                console.log(err.message);
                return res.send({ authenticated: false });
            } else {
                return res.send({ authenticated: true });
            }
        });
    } else {
        res.send({ authenticated: false });
    }
};

const maxAge = 5 * 24 * 60 * 60;
// handle errors
const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { email: "" };

    // incorrect email
    if (err.message === "incorrect email") {
        errors.email =
            "The email address is already in use, please choose another one";
    }

    // incorrect password
    if (err.message === "incorrect password") {
        errors.password = "the password is incorrect";
    }

    // duplicate email error
    if (err.code === 11000) {
        errors.email =
            "The email address is already in use, please choose another one";
        return errors;
    }

    // validation errors
    if (err.message.includes("user validation failed")) {
        // console.log(err);
        Object.values(err.errors).forEach(({ properties }) => {
            // console.log(val);
            // console.log(properties);
            errors[properties.path] = properties.message;
        });
    }

    return errors;
};