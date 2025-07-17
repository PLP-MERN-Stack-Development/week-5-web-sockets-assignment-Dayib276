const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: String,
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.models.Room || mongoose.model('Room', roomSchema);

// Usage example:
// const Room = require('./models/Room');
// Room.find(...)
// Room.create(...)
// Room.findByIdAndUpdate(...)
//
