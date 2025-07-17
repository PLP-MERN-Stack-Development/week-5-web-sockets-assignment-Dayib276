//week-5-web-sockets-assignment-Dayib276\server

// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const roomRoutes = require('./routes/roomRoutes');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const Room = require('./models/Room');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rooms', roomRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Store connected users and messages
const users = {};
const typingUsers = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', async (username) => {
    users[socket.id] = { username, id: socket.id };
    await User.findOneAndUpdate(
      { socketId: socket.id },
      { username, socketId: socket.id, online: true },
      { upsert: true, new: true }
    );
    const userList = await User.find({ online: true });
    io.emit('user_list', userList);
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', async (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      isPrivate: false,
    };
    await Message.create(message);
    io.emit('receive_message', message);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }
      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on('private_message', async ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      to,
    };
    await Message.create(messageData);
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle file/image sharing
  socket.on('send_file', async (fileData) => {
    // fileData: { sender, senderId, to, isPrivate, roomId, fileUrl }
    const message = await Message.create({
      message: fileData.fileName,
      sender: fileData.sender,
      senderId: fileData.senderId,
      to: fileData.to,
      isPrivate: fileData.isPrivate,
      room: fileData.roomId,
      fileUrl: fileData.fileUrl,
      timestamp: new Date().toISOString(),
    });
    io.emit('receive_file', message);
  });

  // Handle message reactions
  socket.on('react_message', async ({ messageId, reaction }) => {
    const msg = await Message.findByIdAndUpdate(
      messageId,
      { $push: { reactions: reaction } },
      { new: true }
    );
    io.emit('message_reacted', msg);
  });

  // Handle read receipts
  socket.on('read_message', async ({ messageId, userId }) => {
    const msg = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    );
    io.emit('message_read', msg);
  });

  // Message delivery acknowledgment
  socket.on('message_delivered', ({ messageId, userId }) => {
    io.emit('message_delivered', { messageId, userId });
  });

  // Unread message count
  socket.on('get_unread_count', async ({ userId }) => {
    const count = await Message.countDocuments({ readBy: { $ne: userId } });
    socket.emit('unread_count', count);
  });

  // Message search
  socket.on('search_messages', async (search) => {
    const msgs = await Message.find({ message: { $regex: search, $options: 'i' } });
    socket.emit('search_results', msgs);
  });

  // Sound and browser notifications are handled on the frontend.

  // Handle disconnection
  socket.on('disconnect', async () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
      await User.findOneAndUpdate({ socketId: socket.id }, { online: false });
    }
    delete users[socket.id];
    delete typingUsers[socket.id];
    const userList = await User.find({ online: true });
    io.emit('user_list', userList);
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// API routes
app.get('/api/messages', async (req, res) => {
  const msgs = await Message.find({ isPrivate: false }).sort({ timestamp: 1 }).limit(100);
  res.json(msgs);
});

app.get('/api/users', async (req, res) => {
  const userList = await User.find({ online: true });
  res.json(userList);
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };