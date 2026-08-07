const express = require('express');
const { createMessage, listMessages } = require('../controllers/messagesController');
const { authenticateOptional } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateOptional, createMessage);
router.get('/', authenticateOptional, listMessages);

module.exports = router;
