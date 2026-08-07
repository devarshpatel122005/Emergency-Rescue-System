const express = require('express');

const {
  createIncident,
  listIncidents,
  getIncidentById,
  updateIncident,
  updateIncidentLocation,
  assignIncident,
  completeIncident
} = require('../controllers/incidentController');
const { exportCasePacket } = require('../controllers/evidenceController');
const { authenticateOptional, authenticateRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/rbac');

const router = express.Router();

router.post('/', authenticateOptional, createIncident);

router.get('/', authenticateRequired, listIncidents);
router.get('/:id', authenticateRequired, getIncidentById);
router.patch('/:id', authenticateRequired, requireRoles('admin', 'rescuer'), updateIncident);
router.post('/:id/location', authenticateOptional, updateIncidentLocation);
router.patch('/:id/complete', authenticateRequired, requireRoles('admin', 'rescuer'), completeIncident);
router.post('/:id/assign', authenticateRequired, requireRoles('admin'), assignIncident);
router.get('/:id/export-case-packet', authenticateRequired, requireRoles('admin'), exportCasePacket);

module.exports = router;
