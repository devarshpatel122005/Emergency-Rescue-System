const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Message = require('../models/Message');
const { emitEvent } = require('../services/socketService');

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

function resolveSenderIdentity(reqUser, senderType) {
  const fallbackRole = senderType || 'victim';

  if (!reqUser) {
    return {
      senderUser: null,
      senderId: 'anonymous',
      senderName: 'Anonymous',
      senderRole: fallbackRole
    };
  }

  const rawId = String(reqUser.id || reqUser._id || '');
  const hasValidObjectId = mongoose.Types.ObjectId.isValid(rawId);

  if (!hasValidObjectId) {
    if (senderType === 'admin' || reqUser.role === 'admin') {
      return {
        senderUser: null,
        senderId: rawId || 'admin-static',
        senderName: 'Admin',
        senderRole: 'admin'
      };
    }

    return {
      senderUser: null,
      senderId: rawId || 'anonymous',
      senderName: reqUser.name || fallbackRole,
      senderRole: fallbackRole
    };
  }

  return {
    senderUser: rawId,
    senderId: rawId,
    senderName: reqUser.name || fallbackRole,
    senderRole: fallbackRole
  };
}

function toMessagePayload(row) {
  const incidentId = row.incident?._id ? String(row.incident._id) : String(row.incident);
  const senderId = row.senderId || (row.senderUser?._id ? String(row.senderUser._id) : 'anonymous');
  const senderType = row.senderType || row.senderRole || 'victim';
  const senderName = row.senderName || row.senderUser?.name || (senderType === 'admin' ? 'Admin' : senderType);

  return {
    _id: row._id,
    incidentId,
    senderId,
    senderType,
    senderRole: row.senderRole || senderType,
    senderName,
    text: row.text,
    timestamp: row.timestamp || row.createdAt,
    isTranscript: Boolean(row.isTranscript || row.type === 'transcript')
  };
}

async function createMessage(req, res, next) {
  try {
    const { incidentId, text, senderType, isTranscript = false } = req.body;

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
    const senderIdentity = resolveSenderIdentity(req.user, normalizedSenderType);
    const transcriptFlag = Boolean(isTranscript);

    const message = await Message.create({
      incident: incidentId,
      senderUser: senderIdentity.senderUser,
      senderId: senderIdentity.senderId,
      senderName: senderIdentity.senderName,
      senderType: normalizedSenderType,
      senderRole: senderIdentity.senderRole,
      text: String(text).trim(),
      timestamp: new Date(),
      isTranscript: transcriptFlag,
      type: transcriptFlag ? 'transcript' : 'text',
      source: transcriptFlag ? 'webspeech' : 'manual',
      draft: false
    });

    const populated = await Message.findById(message._id).populate('senderUser', 'name role');
    const payload = toMessagePayload(populated);

    emitEvent('message:new', payload);

    if (payload.isTranscript) {
      emitEvent('transcript:new', {
        _id: payload._id,
        incident: payload.incidentId,
        text: payload.text,
        speakerType: payload.senderType,
        senderName: payload.senderName,
        at: payload.timestamp
      });
    }

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
