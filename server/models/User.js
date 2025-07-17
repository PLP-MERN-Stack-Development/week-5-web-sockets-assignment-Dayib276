const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  socketId: String,
  online: Boolean,
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
