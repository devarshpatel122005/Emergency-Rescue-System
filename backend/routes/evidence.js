const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const { uploadEvidence, listEvidence } = require('../controllers/evidenceController');
const { authenticateRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

const tempUploadDir = path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads', 'tmp');
fs.mkdirSync(tempUploadDir, { recursive: true });

const upload = multer({
  dest: tempUploadDir,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const router = express.Router();

router.get('/:incidentId', authenticateRequired, requireRoles('admin', 'rescuer'), listEvidence);
router.post('/:incidentId', authenticateRequired, requireRoles('rescuer'), upload.single('media'), uploadEvidence);

module.exports = router;
