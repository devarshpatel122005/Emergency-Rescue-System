const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Message = require('../models/Message');
const Evidence = require('../models/Evidence');
const ChainOfCustodyLog = require('../models/ChainOfCustodyLog');
const { resolveStoragePath } = require('./storageAdapterService');

async function buildCasePacketPayload(incidentId) {
  const incident = await Incident.findById(incidentId)
    .populate('reporterUser', 'name email role')
    .populate('assignedRescuer', 'name email role');

  if (!incident) {
    const error = new Error('Incident not found.');
    error.statusCode = 404;
    throw error;
  }

  const [assignment, messages, evidenceItems, custodyLogs] = await Promise.all([
    Assignment.findOne({ incident: incidentId })
      .populate('rescuer', 'name email role')
      .populate('assignedBy', 'name email role'),
    Message.find({ incident: incidentId })
      .populate('senderUser', 'name email role')
      .sort({ createdAt: 1 }),
    Evidence.find({ incident: incidentId }).sort({ createdAt: 1 }),
    ChainOfCustodyLog.find({ incident: incidentId }).sort({ createdAt: 1 })
  ]);

  return {
    incident,
    assignment,
    messages,
    evidenceItems,
    custodyLogs
  };
}

function buildManifest(payload) {
  return {
    incidentId: String(payload.incident._id),
    generatedAt: new Date().toISOString(),
    evidenceCount: payload.evidenceItems.length,
    messageCount: payload.messages.length,
    custodyEntries: payload.custodyLogs.length,
    evidence: payload.evidenceItems.map((item) => ({
      id: String(item._id),
      filename: item.filename,
      signature: item.signature,
      signatureAlgo: item.signatureAlgo,
      storagePath: item.storagePath,
      sizeBytes: item.sizeBytes
    }))
  };
}

async function streamCasePacket(incidentId, res) {
  const payload = await buildCasePacketPayload(incidentId);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('warning', (warning) => {
    if (warning.code !== 'ENOENT') {
      throw warning;
    }
  });

  archive.on('error', (error) => {
    throw error;
  });

  const safeIncidentId = String(payload.incident._id);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="incident-${safeIncidentId}-case-packet.zip"`);

  archive.pipe(res);

  archive.append(JSON.stringify(payload.incident.toObject(), null, 2), { name: 'incident.json' });
  archive.append(JSON.stringify(payload.assignment ? payload.assignment.toObject() : null, null, 2), {
    name: 'assignment.json'
  });
  archive.append(
    JSON.stringify(
      payload.messages.map((message) => message.toObject()),
      null,
      2
    ),
    { name: 'messages.json' }
  );
  archive.append(
    JSON.stringify(
      payload.custodyLogs.map((entry) => entry.toObject()),
      null,
      2
    ),
    { name: 'chain-of-custody.json' }
  );

  const manifest = buildManifest(payload);
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  for (const evidence of payload.evidenceItems) {
    const absolutePath = resolveStoragePath(evidence.storagePath);
    if (fs.existsSync(absolutePath)) {
      const evidenceDir = path.join('evidence', String(evidence._id));
      archive.file(absolutePath, { name: path.join(evidenceDir, evidence.filename) });
      archive.append(JSON.stringify(evidence.toObject(), null, 2), {
        name: path.join(evidenceDir, 'metadata.json')
      });
    }
  }

  await archive.finalize();
  return payload;
}

module.exports = {
  buildCasePacketPayload,
  streamCasePacket
};
