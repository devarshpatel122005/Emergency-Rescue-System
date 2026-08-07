const express = require('express');
const { getRoute } = require('../controllers/navigationController');
const { authenticateRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/route', authenticateRequired, getRoute);

module.exports = router;
