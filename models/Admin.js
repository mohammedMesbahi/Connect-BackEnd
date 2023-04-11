const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const bcrypt = require("bcrypt");
const mongodbErrorHandler = require("mongoose-mongodb-errors");

const adminSchema = new mongoose.Schema({
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
});

adminSchema.pre("save", function (next) {
    const saltRounds = 10;
    this.password = bcrypt.hashSync(this.password, saltRounds);
    next();
});
adminSchema.methods.isValidPassword = function (password) {
    const admin = this;
    const compare = bcrypt.compareSync(password, admin.password);
    return compare;
};

adminSchema.plugin(mongodbErrorHandler);
const Admin = mongoose.model("Admin", adminSchema);

module.exports = {
    Admin,
};