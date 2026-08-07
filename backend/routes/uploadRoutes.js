const express = require('express');
const { uploadChunk, finalizeUpload } = require('../controllers/uploadController');
const { authenticateRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/chunk', authenticateRequired, uploadChunk);
router.post('/complete', authenticateRequired, finalizeUpload);

module.exports = router;
