const express = require('express');
const multer = require('multer');
const { transcribeWithAzure } = require('../controllers/speechController');
const { authenticateRequired } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/azure/transcribe', authenticateRequired, upload.single('audio'), transcribeWithAzure);

module.exports = router;
