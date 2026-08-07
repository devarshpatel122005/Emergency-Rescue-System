const express = require('express');
const { metrics, healthcheck } = require('../controllers/systemController');

const router = express.Router();

router.get('/metrics', metrics);
router.get('/healthcheck', healthcheck);

module.exports = router;
