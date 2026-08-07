const Incident = require('../models/Incident');
const Message = require('../models/Message');
const { emitMessageNew } = require('../sockets/incidents');

function normalizeSenderType(reqUser, requestedType) {
  if (reqUser?.role === 'admin') {
    return 'admin';
  }
  if (reqUser?.role === 'rescuer') {
    return 'rescuer';
  }
  if (reqUser?.role === 'victim') {
    return 'victim';
  }

  if (requestedType && ['admin', 'rescuer', 'victim'].includes(requestedType)) {
    return requestedType;
  }

  return 'victim';
}

function toMessagePayload(row) {
  return {
    _id: row._id,
    incidentId: String(row.incident?._id || row.incident),
    senderId: row.senderId || (row.senderUser ? String(row.senderUser._id) : 'anonymous'),
    senderType: row.senderType || row.senderRole || 'victim',
    senderName: row.senderUser?.name || row.senderType || row.senderRole || 'victim',
    text: row.text,
    timestamp: row.timestamp || row.createdAt
  };
}

async function createMessage(req, res, next) {
  try {
    const { incidentId, text, senderType } = req.body;

    if (!incidentId || !text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: 'incidentId and text are required.'
      });
    }

    const incident = await Incident.findById(incidentId).select('_id');
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    const normalizedSenderType = normalizeSenderType(req.user, senderType);
    const senderId = req.user ? String(req.user.id) : 'anonymous';

    const message = await Message.create({
      incident: incidentId,
      senderUser: req.user ? req.user.id : null,
      senderId,
      senderType: normalizedSenderType,
      senderRole: normalizedSenderType,
      text: String(text).trim(),
      timestamp: new Date(),
      type: 'text',
      source: 'manual',
      draft: false
    });

    const populated = await Message.findById(message._id).populate('senderUser', 'name role');
    const payload = toMessagePayload(populated);

    emitMessageNew(payload);

    return res.status(201).json({
      success: true,
      data: payload,
      message: 'Message sent.'
    });
  } catch (error) {
    return next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const { incidentId } = req.query;

    if (!incidentId) {
      return res.status(400).json({
        success: false,
        message: 'incidentId is required.'
      });
    }

    const rows = await Message.find({ incident: incidentId })
      .populate('senderUser', 'name role')
      .sort({ timestamp: 1, createdAt: 1 })
      .limit(500);

    return res.json({
      success: true,
      data: rows.map(toMessagePayload),
      message: 'Messages fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMessage,
  listMessages
};
