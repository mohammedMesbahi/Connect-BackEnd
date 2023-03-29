const mongoose = require("mongoose");
const Message = require('../models/Message');
exports.getChats = async (req,res)=>{
    let userId = new mongoose.Types.ObjectId(req.user.userid)
   let messages = await  Message.find({$or: [{ sender:userId  }, { reciever: userId }]});
   res.send(messages);
}