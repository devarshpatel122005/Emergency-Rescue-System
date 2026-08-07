const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  registerRescuer,
  getPendingRescuers,
  approveRescuer,
  rejectRescuer,
  updateRescuerStatus,
  getNearbyRescuers,
  getMyRescuerStatus
} = require('../controllers/rescuerController');
const { authenticateRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

const router = express.Router();

const idCardUploadPath = path.resolve(process.cwd(), process.env.STORAGE_PATH || './uploads', 'id-cards');
fs.mkdirSync(idCardUploadPath, { recursive: true });

const upload = multer({
  dest: idCardUploadPath,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/register', upload.single('idCardImage'), registerRescuer);

router.get('/pending', authenticateRequired, requireRoles('admin'), getPendingRescuers);
router.post('/:id/approve', authenticateRequired, requireRoles('admin'), approveRescuer);
router.post('/:id/reject', authenticateRequired, requireRoles('admin'), rejectRescuer);
router.post('/status', authenticateRequired, requireRoles('admin', 'rescuer'), updateRescuerStatus);
router.get('/nearby', authenticateRequired, getNearbyRescuers);
router.get('/me/status', authenticateRequired, requireRoles('rescuer'), getMyRescuerStatus);

module.exports = router;
