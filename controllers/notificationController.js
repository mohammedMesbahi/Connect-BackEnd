const { User } = require('../models/User');
exports.getNotifications = async (req, res) => {
    try {
        let response = await User.find({ _id: req.user._id }).populate({
            path: "notifications",
            populate: [{
                path: "notifier",
                select: "name avatar email"
            }
            ]
        }).select("notifications -_id").lean();
        // let a = [...response[0].notifications]
        res.send(response[0].notifications);
    } catch (error) {
        res.status(500).send({message:error.message})
    }

}