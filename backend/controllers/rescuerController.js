const bcrypt = require('bcryptjs');
const path = require('path');
const Rescuer = require('../models/Rescuer');
const RescuerStatus = require('../models/RescuerStatus');
const User = require('../models/User');
const Incident = require('../models/Incident');
const { tryAssignPendingIncidentForRescuer } = require('./incidentController');
const {
  emitRescuerLocation,
  emitRescuerOnline,
  emitRescuerOnScene,
  emitRescuerStatus
} = require('../sockets/incidents');

const DEPARTMENTS = ['Fire', 'Assault', 'Medical'];

function toPoint(lat, lng) {
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

function isValidPhone(phone) {
  return /^\d{10}$/.test(String(phone || ''));
}

function toPublicUploadPath(filePath) {
  if (!filePath) {
    return '';
  }

  const uploadsIndex = filePath.lastIndexOf(`${path.sep}uploads${path.sep}`);
  if (uploadsIndex === -1) {
    return '';
  }

  const relativePath = filePath.slice(uploadsIndex + 1).split(path.sep).join('/');
  return `/${relativePath}`;
}

async function syncRescuerState({ rescuerId, status, location, incidentId = null, onScene = false }) {
  const online = status !== 'offline';

  await User.findOneAndUpdate(
    { _id: rescuerId, role: 'rescuer' },
    {
      status,
      online
    },
    { new: true }
  );

  await Rescuer.findOneAndUpdate(
    { user: rescuerId },
    {
      user: rescuerId,
      status,
      online,
      ...(location ? { location } : {}),
      lastSeenAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const rescuerStatus = await RescuerStatus.findOneAndUpdate(
    { rescuer: rescuerId },
    {
      rescuer: rescuerId,
      ...(location ? { location } : {}),
      online,
      incident: incidentId,
      onScene,
      lastPing: new Date()
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('rescuer', 'name email role department status online phone age gender blood_group');

  emitRescuerStatus({
    rescuerId: String(rescuerId),
    status,
    online,
    incidentId: incidentId ? String(incidentId) : null,
    at: new Date().toISOString()
  });

  emitRescuerLocation(rescuerStatus);

  return rescuerStatus;
}

async function registerRescuer(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      department,
      customDepartment = '',
      age,
      gender,
      blood_group,
      phone
    } = req.body;

    if (!name || !email || !password || !department || !age || !gender || !blood_group || !phone) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, age, gender, blood_group, phone and department are required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ID card image is required.'
      });
    }

    const parsedAge = Number(age);
    if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
      return res.status(400).json({
        success: false,
        message: 'age must be a valid number.'
      });
    }

    if (!User.GENDERS.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: `gender must be one of: ${User.GENDERS.join(', ')}`
      });
    }

    if (!User.BLOOD_GROUPS.includes(blood_group)) {
      return res.status(400).json({
        success: false,
        message: `blood_group must be one of: ${User.BLOOD_GROUPS.join(', ')}`
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'phone must be exactly 10 digits.'
      });
    }

    const normalizedDepartment = department === 'Custom' ? String(customDepartment || '').trim() : department;
    if (!normalizedDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Custom department text is required when Custom is selected.'
      });
    }

    if (department !== 'Custom' && !DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `department must be one of ${DEPARTMENTS.join(', ')} or Custom.`
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const idCardImage = toPublicUploadPath(req.file.path);

    const rescuerUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'rescuer',
      department: normalizedDepartment,
      status: 'offline',
      online: false,
      approvalStatus: 'pending',
      idCardImage,
      age: parsedAge,
      gender,
      blood_group,
      phone: String(phone)
    });

    await Rescuer.create({
      user: rescuerUser._id,
      department: normalizedDepartment,
      status: 'offline',
      online: false,
      location: { type: 'Point', coordinates: [0, 0] }
    });

    await RescuerStatus.findOneAndUpdate(
      { rescuer: rescuerUser._id },
      {
        rescuer: rescuerUser._id,
        online: false,
        location: { type: 'Point', coordinates: [0, 0] },
        incident: null,
        onScene: false,
        lastPing: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      data: rescuerUser.toJSON(),
      message: 'Rescuer registered and pending admin approval.'
    });
  } catch (error) {
    return next(error);
  }
}

async function getPendingRescuers(req, res, next) {
  try {
    const pendingRescuers = await User.find({
      role: 'rescuer',
      approvalStatus: 'pending'
    })
      .select('name email department phone idCardImage approvalStatus createdAt')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: pendingRescuers,
      message: 'Pending rescuers fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function approveRescuer(req, res, next) {
  try {
    const rescuer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rescuer' },
      { approvalStatus: 'approved', status: 'offline', online: false },
      { new: true }
    ).select('name email department approvalStatus idCardImage status');

    if (!rescuer) {
      return res.status(404).json({
        success: false,
        message: 'Rescuer not found.'
      });
    }

    await Rescuer.findOneAndUpdate(
      { user: rescuer._id },
      { status: 'offline', online: false, lastSeenAt: new Date() },
      { new: true }
    );

    await RescuerStatus.findOneAndUpdate(
      { rescuer: rescuer._id },
      { online: false, incident: null, onScene: false, lastPing: new Date() },
      { new: true }
    );

    return res.json({
      success: true,
      data: rescuer,
      message: 'Rescuer approved.'
    });
  } catch (error) {
    return next(error);
  }
}

async function rejectRescuer(req, res, next) {
  try {
    const rescuer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'rescuer' },
      { approvalStatus: 'rejected', status: 'offline', online: false },
      { new: true }
    ).select('name email department approvalStatus idCardImage status');

    if (!rescuer) {
      return res.status(404).json({
        success: false,
        message: 'Rescuer not found.'
      });
    }

    await RescuerStatus.findOneAndUpdate(
      { rescuer: rescuer._id },
      { online: false, incident: null, onScene: false, lastPing: new Date() },
      { new: true }
    );

    await Rescuer.findOneAndUpdate(
      { user: rescuer._id },
      { status: 'offline', online: false, lastSeenAt: new Date() },
      { new: true }
    );

    return res.json({
      success: true,
      data: rescuer,
      message: 'Rescuer rejected.'
    });
  } catch (error) {
    return next(error);
  }
}

async function updateRescuerStatus(req, res, next) {
  try {
    const { rescuerId, lat, lng, online, incidentId = null } = req.body;

    const targetRescuerId = req.user.role === 'admin' && rescuerId ? rescuerId : req.user.id;

    const rescuerUser = await User.findOne({ _id: targetRescuerId, role: 'rescuer' });
    if (!rescuerUser) {
      return res.status(404).json({
        success: false,
        message: 'Rescuer not found.'
      });
    }

    if (rescuerUser.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Account pending admin approval'
      });
    }

    const currentStatus = await RescuerStatus.findOne({ rescuer: targetRescuerId });

    let location = currentStatus?.location;
    if (lat !== undefined && lng !== undefined) {
      location = toPoint(lat, lng);
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates.'
        });
      }
    }

    if (!location) {
      location = {
        type: 'Point',
        coordinates: [0, 0]
      };
    }

    let activeIncidentId = incidentId || currentStatus?.incident || null;

    if (!activeIncidentId) {
      const assignedIncident = await Incident.findOne({
        assignedRescuer: targetRescuerId,
        status: { $ne: 'resolved' }
      })
        .sort({ createdAt: -1 })
        .select('_id location');

      activeIncidentId = assignedIncident?._id || null;
    }

    const requestedOnline = typeof online === 'boolean' ? online : rescuerUser.status !== 'offline';

    if (!requestedOnline && activeIncidentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot go offline while assigned incident is active.'
      });
    }

    const nextStatus = !requestedOnline ? 'offline' : activeIncidentId ? 'busy' : 'online';

    let onScene = false;
    if (activeIncidentId) {
      const assignedIncident = await Incident.findById(activeIncidentId).select('location');
      if (assignedIncident?.location?.coordinates && location?.coordinates) {
        const distance = haversineMeters(location.coordinates, assignedIncident.location.coordinates);
        const radiusMeters = Number(process.env.ONSCENE_RADIUS_METERS || 30);
        onScene = distance <= radiusMeters;
      }
    }

    let rescuerStatus = await syncRescuerState({
      rescuerId: targetRescuerId,
      status: nextStatus,
      location,
      incidentId: activeIncidentId,
      onScene
    });

    if (nextStatus === 'online') {
      emitRescuerOnline({
        rescuerId: targetRescuerId,
        online: true,
        at: new Date().toISOString()
      });

      const assignmentActorId = req.user.role === 'rescuer' ? req.user.id : null;
      const assigned = await tryAssignPendingIncidentForRescuer(targetRescuerId, assignmentActorId);

      if (assigned?.incident?._id) {
        activeIncidentId = assigned.incident._id;
        rescuerStatus = await syncRescuerState({
          rescuerId: targetRescuerId,
          status: 'busy',
          location,
          incidentId: activeIncidentId,
          onScene: false
        });
      }
    }

    if (onScene) {
      emitRescuerOnScene({
        rescuerId: targetRescuerId,
        incidentId: activeIncidentId,
        at: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: {
        ...rescuerStatus.toObject(),
        status: activeIncidentId ? 'busy' : nextStatus
      },
      message: 'Rescuer status updated successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function getNearbyRescuers(req, res, next) {
  try {
    const { lat, lng, radius = 10, department } = req.query;

    let query = { online: true };

    if (lat !== undefined && lng !== undefined) {
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      const radiusMeters = Number(radius) * 1000;

      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) || !Number.isFinite(radiusMeters)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid nearby query params.'
        });
      }

      query = {
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parsedLng, parsedLat]
            },
            $maxDistance: radiusMeters
          }
        }
      };
    }

    const rescuers = await RescuerStatus.find(query)
      .populate('rescuer', 'name email role department status online phone age gender blood_group')
      .sort({ lastPing: -1 });

    const filtered = department ? rescuers.filter((entry) => entry.rescuer?.department === department) : rescuers;

    return res.json({
      success: true,
      data: filtered,
      message: 'Rescuers fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyRescuerStatus(req, res, next) {
  try {
    const rescuer = await User.findOne({ _id: req.user.id, role: 'rescuer' }).select(
      'online status department approvalStatus'
    );
    if (!rescuer) {
      return res.status(404).json({ success: false, message: 'Rescuer not found.' });
    }

    const status = await RescuerStatus.findOne({ rescuer: req.user.id }).select('location incident onScene lastPing online');

    return res.json({
      success: true,
      data: {
        online: status?.online ?? rescuer.online,
        status: rescuer.status || (status?.online ? 'online' : 'offline'),
        department: rescuer.department,
        approvalStatus: rescuer.approvalStatus,
        incidentId: status?.incident || null,
        location: status?.location || { type: 'Point', coordinates: [0, 0] },
        onScene: Boolean(status?.onScene)
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerRescuer,
  getPendingRescuers,
  approveRescuer,
  rejectRescuer,
  updateRescuerStatus,
  getNearbyRescuers,
  getMyRescuerStatus
};
