const Incident = require('../models/Incident');
const Transcript = require('../models/Transcript');
const { emitEvent } = require('../services/socketService');

function normalizeSpeakerType(reqSpeakerType, reqUser) {
  if (reqSpeakerType && ['admin', 'rescuer', 'victim'].includes(reqSpeakerType)) {
    return reqSpeakerType;
  }

  if (!reqUser) {
    return 'victim';
  }

  if (reqUser.role === 'admin') {
    return 'admin';
  }

  if (reqUser.role === 'rescuer') {
    return 'rescuer';
  }

  return 'victim';
}

async function submitTranscript(req, res, next) {
  try {
    const { incidentId, transcript, speakerType } = req.body;

    if (!incidentId || !transcript) {
      return res.status(400).json({
        success: false,
        message: 'incidentId and transcript are required.'
      });
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    const entry = await Transcript.create({
      incident: incidentId,
      speakerType: normalizeSpeakerType(speakerType, req.user),
      text: transcript,
      at: new Date()
    });

    const payload = {
      _id: entry._id,
      incident: entry.incident,
      speakerType: entry.speakerType,
      text: entry.text,
      at: entry.at
    };

    emitEvent('transcript:new', payload);

    return res.status(201).json({
      success: true,
      data: payload,
      message: 'Transcript accepted.'
    });
  } catch (error) {
    return next(error);
  }
}

async function listTranscripts(req, res, next) {
  try {
    const { incidentId } = req.query;

    if (!incidentId) {
      return res.status(400).json({
        success: false,
        message: 'incidentId is required.'
      });
    }

    const rows = await Transcript.find({ incident: incidentId }).sort({ at: -1 }).limit(400);

    return res.json({
      success: true,
      data: rows,
      message: 'Transcripts fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitTranscript,
  listTranscripts
};
