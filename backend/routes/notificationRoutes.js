const express = require('express');
const {
  queueNotification,
  triggerNotification,
  listNotifications
} = require('../controllers/notificationController');
const { authenticateRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticateRequired, requireRoles('admin'), listNotifications);
router.post('/queue', authenticateRequired, requireRoles('admin'), queueNotification);
router.post('/:id/trigger', authenticateRequired, requireRoles('admin'), triggerNotification);

module.exports = router;
