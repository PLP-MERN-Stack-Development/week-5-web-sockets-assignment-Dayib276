const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/', messageController.getMessages);
router.post('/', messageController.sendMessage);
router.post('/upload', messageController.uploadFile);
router.post('/react', messageController.reactMessage);
router.post('/read', messageController.markAsRead);

module.exports = router;
