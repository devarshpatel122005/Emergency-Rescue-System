const express = require('express');
const { getKpis, getResponseTimes } = require('../controllers/analyticsController');
const { authenticateRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

const router = express.Router();

router.get('/kpis', authenticateRequired, requireRoles('admin'), getKpis);
router.get('/response-times', authenticateRequired, requireRoles('admin'), getResponseTimes);

module.exports = router;
