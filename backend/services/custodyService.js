const crypto = require('crypto');
const ChainOfCustodyLog = require('../models/ChainOfCustodyLog');

function computeEntryHash({ incidentId, evidenceId, action, actorUser, actorRole, previousHash, eventPayload, createdAt }) {
  const base = JSON.stringify({
    incidentId: String(incidentId),
    evidenceId: evidenceId ? String(evidenceId) : null,
    action,
    actorUser: actorUser ? String(actorUser) : null,
    actorRole,
    previousHash,
    eventPayload,
    createdAt: new Date(createdAt).toISOString()
  });

  return crypto.createHash('sha256').update(base).digest('hex');
}

async function appendCustodyLog({ incidentId, evidenceId = null, action, actorUser = null, actorRole = 'system', eventPayload = {} }) {
  const previous = await ChainOfCustodyLog.findOne({ incident: incidentId }).sort({ createdAt: -1 });
  const previousHash = previous ? previous.entryHash : '';
  const createdAt = new Date();

  const entryHash = computeEntryHash({
    incidentId,
    evidenceId,
    action,
    actorUser,
    actorRole,
    previousHash,
    eventPayload,
    createdAt
  });

  return ChainOfCustodyLog.create({
    incident: incidentId,
    evidence: evidenceId,
    action,
    actorUser,
    actorRole,
    previousHash,
    entryHash,
    eventPayload,
    createdAt
  });
}

module.exports = {
  computeEntryHash,
  appendCustodyLog
};
