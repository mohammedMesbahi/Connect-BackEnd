const mongoose = require("mongoose");
const {User} = require('../models/User');
exports.getConversations = async (req,res)=>{
   let response = await  User.find({_id:req.user._id}).populate({
    path:"conversations",
    populate:[{
      path: "participents",
      select:"name avatar"
    }
    ]
  }).select("conversations -_id").lean();
  let a = [...response[0].conversations]
   res.send(a);
}