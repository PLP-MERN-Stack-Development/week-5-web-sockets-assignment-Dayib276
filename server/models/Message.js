const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  message: String,
  sender: String,
  senderId: String,
  timestamp: String,
  isPrivate: Boolean,
  to: String,
  fileUrl: String, // For file/image sharing
  reactions: [{ type: String }], // For message reactions
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For read receipts
});

module.exports = mongoose.model('Message', messageSchema);
