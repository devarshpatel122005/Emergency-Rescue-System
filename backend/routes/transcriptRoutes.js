const express = require('express');
const { submitTranscript, listTranscripts } = require('../controllers/transcriptController');
const { authenticateOptional } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateOptional, submitTranscript);
router.get('/', authenticateOptional, listTranscripts);

module.exports = router;
