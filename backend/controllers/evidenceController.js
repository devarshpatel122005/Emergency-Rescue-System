const geohash = require('ngeohash');

const Incident = require('../models/Incident');
const Evidence = require('../models/Evidence');
const custodyService = require('../services/custodyService');
const evidenceSignatureService = require('../services/evidenceSignatureService');
const storageAdapterService = require('../services/storageAdapterService');
const casePacketService = require('../services/casePacketService');
const { incrementEvidenceMetric, incrementCasePacketMetric } = require('../services/metricsService');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/webm',
  'audio/wav',
  'audio/mpeg'
]);

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

function parseLocation(lat, lng) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return {
      point: {
        type: 'Point',
        coordinates: [0, 0]
      },
      geohash: ''
    };
  }

  return {
    point: {
      type: 'Point',
      coordinates: [parsedLng, parsedLat]
    },
    geohash: geohash.encode(parsedLat, parsedLng, 9)
  };
}

async function uploadEvidence(req, res, next) {
  try {
    const incidentId = req.params.id || req.params.incidentId;
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Evidence media file is required.'
      });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported media type: ${file.mimetype}`
      });
    }

    if (Number(file.size || 0) > MAX_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum 25MB limit.'
      });
    }

    const { capturedAt, lat, lng, deviceId = '', note = '' } = req.body;
    const { point, geohash: encodedGeohash } = parseLocation(lat, lng);

    const storageInfo = await storageAdapterService.persistEvidenceFile(file, incidentId);

    const metadataSnapshot = {
      incidentId: String(incident._id),
      uploadedBy: req.user ? String(req.user.id) : null,
      uploadedByRole: req.user ? req.user.role : 'anonymous',
      deviceId,
      note,
      capturedAt: capturedAt ? new Date(capturedAt).toISOString() : null,
      receivedAt: new Date().toISOString(),
      filename: storageInfo.filename,
      originalName: storageInfo.originalName,
      mimeType: storageInfo.mimeType,
      sizeBytes: storageInfo.sizeBytes,
      storagePath: storageInfo.storagePath,
      location: point,
      geoHash: encodedGeohash
    };

    const signedAt = new Date();
    const signaturePayload = {
      ...metadataSnapshot,
      signedAt: signedAt.toISOString()
    };

    const signatureResult = evidenceSignatureService.signEvidenceMetadata(signaturePayload);

    const evidence = await Evidence.create({
      incident: incident._id,
      uploadedBy: req.user ? req.user.id : null,
      uploadedByRole: req.user ? req.user.role : 'anonymous',
      deviceId,
      note,
      storagePath: storageInfo.storagePath,
      filename: storageInfo.filename,
      originalName: storageInfo.originalName,
      mimeType: storageInfo.mimeType,
      sizeBytes: storageInfo.sizeBytes,
      location: point,
      geoHash: encodedGeohash,
      capturedAt: capturedAt ? new Date(capturedAt) : null,
      receivedAt: new Date(metadataSnapshot.receivedAt),
      signedAt,
      signatureAlgo: signatureResult.algorithm,
      signature: signatureResult.signature,
      metadataSnapshot
    });

    const custodyEntry = await custodyService.appendCustodyLog({
      incidentId: incident._id,
      evidenceId: evidence._id,
      action: 'evidence_uploaded',
      actorUser: req.user ? req.user.id : null,
      actorRole: req.user ? req.user.role : 'anonymous',
      eventPayload: {
        evidenceId: String(evidence._id),
        signature: evidence.signature,
        storagePath: evidence.storagePath,
        filename: evidence.filename
      }
    });

    incrementEvidenceMetric('upload', 'success');

    return res.status(201).json({
      success: true,
      data: {
        evidence,
        signature: {
          algorithm: evidence.signatureAlgo,
          value: evidence.signature,
          signedAt: evidence.signedAt
        },
        custodyEntry
      },
      message: 'Evidence uploaded and signed successfully.'
    });
  } catch (error) {
    incrementEvidenceMetric('upload', 'failed');
    return next(error);
  }
}

async function exportCasePacket(req, res, next) {
  try {
    const incidentId = req.params.id || req.params.incidentId;
    await casePacketService.streamCasePacket(incidentId, res);
    incrementCasePacketMetric('export', 'success');
  } catch (error) {
    incrementCasePacketMetric('export', 'failed');
    next(error);
  }
}

async function listEvidence(req, res, next) {
  try {
    const incidentId = req.params.id || req.params.incidentId;
    const rows = await Evidence.find({ incident: incidentId })
      .select('incident uploadedBy uploadedByRole filename originalName mimeType sizeBytes createdAt storagePath')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: rows,
      message: 'Evidence list fetched successfully.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadEvidence,
  exportCasePacket,
  listEvidence
};
