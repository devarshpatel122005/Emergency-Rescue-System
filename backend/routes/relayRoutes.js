const express = require('express');
const { relayItems } = require('../controllers/relayController');
const { authenticateOptional } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateOptional, relayItems);

module.exports = router;
