const mongoose = require("mongoose");
const User = mongoose.model("User");
const multer = require("multer");
const jimp = require("jimp");

exports.getUserById = async (req, res, next, id) => {
    const user = await User.findOne({ _id: id }).select({ password: 0, conversations: 0 });
    req.profile = user;
    next();
};

exports.getUser = async (req, res, next, id) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found",
        });
    }
    res.send({ user: req.profile });
};

exports.deleteUser = async (req, res, next, id) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found",
        });
    }
    try {
        User.deleteOne({ _id: id }).then(response => {
            res.send({ user: req.profile });
        })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message);
    }
};

exports.suspend = async (req, res, next, id) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found",
        });
    }
    try {
        User.updateOne({ _id: id }, { suspended: true }).then(response => {
            res.send({ message: 'success' })
        })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message);
    }
}

exports.unsuspend = async (req, res, next, id) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found",
        });
    }
    try {
        User.updateOne({ _id: id }, { suspended: false }).then(response => {
            res.send({ message: 'success' })
        })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message);
    }
}

exports.add = async (req, res, next, id) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found",
        });
    }
    try {
        User.updateOne({ _id: id }, { checked: true }).then(response => {
            res.send({ message: 'success' })
        })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message);
    }
}

exports.getUsers = async (req, res) => {
    const { name } = req.query;
    let users = [];
    if (name) {
        users = await User.find({
            name: { $regex: `^${name}`, $options: "i" },
        }).select("name email avatar");
    } else {
        users = await User.find().select(
            "name email avatar"
        );
    }
    res.json(users);
};

exports.getUserProfile = (req, res) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found",
        });
    }
    const { _id, following, followers, name, email, posts, avatar } = req.profile;
    res.json({ _id, following, followers, name, email, posts, avatar });
};