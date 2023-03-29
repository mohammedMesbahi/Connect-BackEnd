const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: ObjectId,
      ref: "User",
      // required: true
      // unique: true
    },
    reciever: {
      type: ObjectId,
      ref: "User",
      // required: true
      // unique: true
    },
    content: {
      type: String,
      required: true,
      // unique: true
      // trim: true
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);
/* const autoPopulatePostedBy = function(next) {
  this.populate("user", "_id firstName lastName");
  this.populate("comments.user", "_id firstName lastName");
  next();
};
messageSchema
  .pre("findOne", autoPopulatePostedBy)
  .pre("find", autoPopulatePostedBy)
  .pre("findByIdAndUpdate", autoPopulatePostedBy)
  .pre("create", autoPopulatePostedBy); */
const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
