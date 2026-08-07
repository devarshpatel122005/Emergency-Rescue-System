const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const Rescuer = require('../models/Rescuer');
const RescuerStatus = require('../models/RescuerStatus');
const {
  emitIncidentNew,
  emitIncidentAssigned,
  emitIncidentUpdate,
  emitIncidentCompleted,
  emitVictimLocation,
  emitRescuerStatus
} = require('../sockets/incidents');

const DEPARTMENTS = ['Fire', 'Assault', 'Medical', 'Other'];

function parseCoordinates(lat, lng) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [parsedLng, parsedLat]
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function getIncidentWithRefs(incidentId) {
  return Incident.findById(incidentId)
    .populate('reporterUser', 'name email role phone age gender blood_group')
    .populate('assignedRescuer', 'name email role department status online phone age gender blood_group');
}

async function syncRescuerAvailability(rescuerId, nextStatus, incidentId = null) {
  const online = nextStatus !== 'offline';

  await User.findOneAndUpdate(
    { _id: rescuerId, role: 'rescuer' },
    { status: nextStatus, online },
    { new: true }
  );

  await Rescuer.findOneAndUpdate(
    { user: rescuerId },
    { status: nextStatus, online, lastSeenAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await RescuerStatus.findOneAndUpdate(
    { rescuer: rescuerId },
    {
      online,
      incident: incidentId || null,
      onScene: false,
      lastPing: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  emitRescuerStatus({
    rescuerId: String(rescuerId),
    status: nextStatus,
    online,
    incidentId: incidentId ? String(incidentId) : null,
    at: new Date().toISOString()
  });
}

async function findNearestRescuerByDepartment({ department, incidentCoordinates }) {
  const blockedRescuerIds = await Incident.distinct('assignedRescuer', {
    status: { $ne: 'resolved' },
    assignedRescuer: { $ne: null }
  });

  const rescuers = await User.find({
    role: 'rescuer',
    approvalStatus: 'approved',
    status: 'online',
    _id: { $nin: blockedRescuerIds },
    department
  }).select('_id name email department status online phone age gender blood_group');

  if (rescuers.length === 0) {
    return null;
  }

  const statuses = await RescuerStatus.find({
    rescuer: { $in: rescuers.map((rescuer) => rescuer._id) },
    online: true
  })
    .populate('rescuer', 'name email role department status online phone age gender blood_group')
    .sort({ lastPing: -1 });

  if (statuses.length === 0) {
    return null;
  }

  const ranked = statuses
    .filter((status) => Array.isArray(status.location?.coordinates) && status.location.coordinates.length === 2)
    .map((status) => ({
      status,
      distanceMeters: haversineMeters(status.location.coordinates, incidentCoordinates)
    }))
    .sort((a, b) => {
      if (a.distanceMeters !== b.distanceMeters) {
        return a.distanceMeters - b.distanceMeters;
      }

      const aPing = new Date(a.status.lastPing || 0).getTime();
      const bPing = new Date(b.status.lastPing || 0).getTime();
      if (aPing !== bPing) {
        return bPing - aPing;
      }

      return String(a.status.rescuer?._id || '').localeCompare(String(b.status.rescuer?._id || ''));
    });

  return ranked[0] || null;
}

async function assignIncidentToRescuer({ incident, rescuerId, assignedBy, note, distanceMeters = null }) {
  const rescuer = await User.findOne({
    _id: rescuerId,
    role: 'rescuer',
    approvalStatus: 'approved'
  }).select('_id status online');

  if (!rescuer) {
    throw new Error('Rescuer not found.');
  }

  if (rescuer.status !== 'online') {
    throw new Error('Rescuer is not online.');
  }

  if (incident.assignedRescuer && String(incident.assignedRescuer) !== String(rescuerId)) {
    await syncRescuerAvailability(incident.assignedRescuer, 'online', null);
  }

  const assignedByUser = mongoose.Types.ObjectId.isValid(assignedBy)
    ? assignedBy
    : mongoose.Types.ObjectId.isValid(rescuerId)
      ? rescuerId
      : null;

  const assignment = await Assignment.findOneAndUpdate(
    { incident: incident._id },
    {
      incident: incident._id,
      rescuer: rescuerId,
      assignedBy: assignedByUser,
      status: 'assigned',
      note: note || 'Auto assigned by department and distance'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .populate('incident')
    .populate('rescuer', 'name email role department status online phone age gender blood_group')
    .populate('assignedBy', 'name email role');

  incident.assignedRescuer = rescuerId;
  incident.status = 'assigned';
  await incident.save();

  await syncRescuerAvailability(rescuerId, 'busy', incident._id);

  const incidentWithRefs = await getIncidentWithRefs(incident._id);

  emitIncidentAssigned({
    incident: incidentWithRefs,
    rescuer: assignment.rescuer,
    distanceMeters: distanceMeters === null ? null : Number(distanceMeters.toFixed(2))
  });

  return { assignment, incident: incidentWithRefs };
}

async function tryAssignPendingIncidentForRescuer(rescuerId, assignedBy = null) {
  const rescuer = await User.findOne({
    _id: rescuerId,
    role: 'rescuer',
    approvalStatus: 'approved',
    status: 'online'
  }).select('_id department status');

  if (!rescuer || !rescuer.department) {
    return null;
  }

  const pendingIncidents = await Incident.find({
    status: 'new',
    assignedRescuer: null,
    department: rescuer.department
  }).sort({ createdAt: 1 });

  if (pendingIncidents.length === 0) {
    return null;
  }

  const rescuerStatus = await RescuerStatus.findOne({ rescuer: rescuer._id, online: true }).select('location');

  let selectedIncident = pendingIncidents[0];
  let selectedDistance = null;

  if (rescuerStatus?.location?.coordinates?.length === 2) {
    const ranked = pendingIncidents
      .filter((incident) => incident.location?.coordinates?.length === 2)
      .map((incident) => ({
        incident,
        distanceMeters: haversineMeters(rescuerStatus.location.coordinates, incident.location.coordinates)
      }))
      .sort((a, b) => {
        if (a.distanceMeters !== b.distanceMeters) {
          return a.distanceMeters - b.distanceMeters;
        }
        return new Date(a.incident.createdAt).getTime() - new Date(b.incident.createdAt).getTime();
      });

    if (ranked.length > 0) {
      selectedIncident = ranked[0].incident;
      selectedDistance = ranked[0].distanceMeters;
    }
  }

  return assignIncidentToRescuer({
    incident: selectedIncident,
    rescuerId: rescuer._id,
    assignedBy,
    note: 'Auto assigned when rescuer came online',
    distanceMeters: selectedDistance
  });
}

async function createIncident(req, res, next) {
  try {
    const {
      lat,
      lng,
      shortMessage,
      deviceId,
      details = '',
      templateType = 'custom',
      anonymous = false,
      media = [],
      department,
      reporterLiveTracking = true
    } = req.body;

    if (lat === undefined || lng === undefined || !shortMessage || !deviceId || !department) {
      return res.status(400).json({
        success: false,
        message: 'lat, lng, shortMessage, deviceId and department are required.'
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `department must be one of: ${DEPARTMENTS.join(', ')}`
      });
    }

    const location = parseCoordinates(lat, lng);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates.'
      });
    }

    const incident = await Incident.create({
      anonymous: anonymous || !req.user,
      reporterUser: anonymous || !req.user ? null : req.user.id,
      templateType,
      department,
      shortMessage,
      details,
      location,
      deviceId,
      reporterLiveTracking: reporterLiveTracking !== false,
      media
    });

    const nearest = await findNearestRescuerByDepartment({
      department,
      incidentCoordinates: location.coordinates
    });

    let assignment = null;
    let noRescuerAvailable = false;
    let populatedIncident;

    if (nearest) {
      const assigned = await assignIncidentToRescuer({
        incident,
        rescuerId: nearest.status.rescuer?._id || nearest.status.rescuer,
        assignedBy: req.user ? req.user.id : null,
        note: 'Auto assigned by department and distance',
        distanceMeters: nearest.distanceMeters
      });
      assignment = assigned.assignment;
      populatedIncident = assigned.incident;
    } else {
      noRescuerAvailable = true;
      populatedIncident = await getIncidentWithRefs(incident._id);
    }

    emitIncidentNew(populatedIncident);

    return res.status(noRescuerAvailable ? 200 : 201).json({
      success: true,
      data: {
        incident: populatedIncident,
        assignment,
        no_rescuer_available: noRescuerAvailable
      },
      message: noRescuerAvailable ? 'No rescuer available' : 'Incident created and assigned.'
    });
  } catch (error) {
    return next(error);
  }
}

async function listIncidents(req, res, next) {
  try {
    const { status, assignedTo, template, anonymous, department } = req.query;
    const filters = {};

    if (status) {
      filters.status = status;
    }
    if (template) {
      filters.templateType = template;
    }
    if (department) {
      filters.department = department;
    }
    if (assignedTo) {
      filters.assignedRescuer = assignedTo;
    }
    if (anonymous !== undefined) {
      filters.anonymous = anonymous === 'true';
    }

    const incidents = await Incident.find(filters)
      .populate('reporterUser', 'name email role phone age gender blood_group')
      .populate('assignedRescuer', 'name email role department status online phone age gender blood_group')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: incidents,
      message: 'Incidents fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function getIncidentById(req, res, next) {
  try {
    const incident = await getIncidentWithRefs(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    return res.json({
      success: true,
      data: incident,
      message: 'Incident fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function updateIncident(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    if (req.user.role === 'rescuer') {
      const assignedToCurrentRescuer = incident.assignedRescuer && String(incident.assignedRescuer) === String(req.user.id);
      if (!assignedToCurrentRescuer) {
        return res.status(403).json({
          success: false,
          message: 'Rescuers can only update incidents assigned to them.'
        });
      }
    }

    const allowedUpdates = ['status', 'details', 'media'];
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        incident[key] = req.body[key];
      }
    }

    await incident.save();

    const updated = await getIncidentWithRefs(incident._id);
    emitIncidentUpdate(updated);

    return res.json({
      success: true,
      data: updated,
      message: 'Incident updated successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function completeIncident(req, res, next) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    if (req.user.role === 'rescuer') {
      const assignedToCurrentRescuer = incident.assignedRescuer && String(incident.assignedRescuer) === String(req.user.id);
      if (!assignedToCurrentRescuer) {
        return res.status(403).json({
          success: false,
          message: 'You can complete only your assigned incident.'
        });
      }
    }

    incident.status = 'resolved';
    await incident.save();

    if (incident.assignedRescuer) {
      await syncRescuerAvailability(incident.assignedRescuer, 'online', null);
    }

    const updated = await getIncidentWithRefs(incident._id);
    emitIncidentCompleted(updated);

    return res.json({
      success: true,
      data: updated,
      message: 'Incident marked as completed.'
    });
  } catch (error) {
    return next(error);
  }
}

async function updateIncidentLocation(req, res, next) {
  try {
    const { lat, lng, deviceId } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng are required.'
      });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    if (!incident.reporterLiveTracking) {
      return res.status(400).json({
        success: false,
        message: 'Live tracking is disabled for this incident.'
      });
    }

    if (req.user?.role === 'victim' && incident.reporterUser && String(incident.reporterUser) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own incident location.'
      });
    }

    if (!req.user && deviceId && incident.deviceId && String(deviceId) !== String(incident.deviceId)) {
      return res.status(403).json({
        success: false,
        message: 'deviceId mismatch for anonymous incident location update.'
      });
    }

    const point = parseCoordinates(lat, lng);
    if (!point) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates.'
      });
    }

    incident.location = point;
    await incident.save();

    const payload = {
      incidentId: String(incident._id),
      location: {
        lat: point.coordinates[1],
        lng: point.coordinates[0]
      },
      at: new Date().toISOString()
    };

    emitVictimLocation(payload);

    return res.json({
      success: true,
      data: payload,
      message: 'Victim location updated.'
    });
  } catch (error) {
    return next(error);
  }
}

async function assignIncident(req, res, next) {
  try {
    const { rescuerId, note = '' } = req.body;

    if (!rescuerId) {
      return res.status(400).json({
        success: false,
        message: 'rescuerId is required.'
      });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    const rescuer = await User.findOne({
      _id: rescuerId,
      role: 'rescuer',
      approvalStatus: 'approved'
    }).select('_id name email role department status online phone age gender blood_group');

    if (!rescuer) {
      return res.status(404).json({
        success: false,
        message: 'Rescuer not found.'
      });
    }

    if (rescuer.status !== 'online') {
      return res.status(400).json({
        success: false,
        message: 'Rescuer is not online.'
      });
    }

    const assigned = await assignIncidentToRescuer({
      incident,
      rescuerId: rescuer._id,
      assignedBy: req.user.id,
      note: note || 'Manual assignment by admin'
    });

    return res.json({
      success: true,
      data: {
        assignment: assigned.assignment,
        incident: assigned.incident
      },
      message: 'Incident assigned successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createIncident,
  listIncidents,
  getIncidentById,
  updateIncident,
  updateIncidentLocation,
  assignIncident,
  completeIncident,
  tryAssignPendingIncidentForRescuer
};
