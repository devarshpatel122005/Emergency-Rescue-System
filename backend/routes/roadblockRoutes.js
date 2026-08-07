const express = require('express');
const { listRoadblocks } = require('../controllers/roadblockController');
const { authenticateRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateRequired, listRoadblocks);

module.exports = router;
