// messageController.js
const multer = require('multer');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');

// File upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

module.exports = {
  getMessages: async (req, res) => {
    // Pagination support
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search ? { message: { $regex: search, $options: 'i' } } : {};
    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(messages);
  },
  sendMessage: async (req, res) => {
    const { message, sender, senderId, to, isPrivate, roomId } = req.body;
    const newMsg = await Message.create({
      message,
      sender,
      senderId,
      to,
      isPrivate,
      room: roomId,
      timestamp: new Date().toISOString(),
    });
    res.json(newMsg);
  },
  uploadFile: [upload.single('file'), async (req, res) => {
    const { sender, senderId, to, isPrivate, roomId } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    const newMsg = await Message.create({
      message: req.file.originalname,
      sender,
      senderId,
      to,
      isPrivate,
      room: roomId,
      fileUrl,
      timestamp: new Date().toISOString(),
    });
    res.json(newMsg);
  }],
  reactMessage: async (req, res) => {
    const { messageId, reaction } = req.body;
    const msg = await Message.findByIdAndUpdate(
      messageId,
      { $push: { reactions: reaction } },
      { new: true }
    );
    res.json(msg);
  },
  markAsRead: async (req, res) => {
    const { messageId, userId } = req.body;
    const msg = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    );
    res.json(msg);
  },
};
