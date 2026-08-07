const crypto = require('crypto');
const RelayItem = require('../models/RelayItem');
const { incrementRelay } = require('../services/metricsService');

function normalizeItems(body) {
  if (Array.isArray(body.items)) {
    return body.items;
  }

  return [body];
}

function validateRelayItem(item) {
  if (!item || !item.idempotencyKey || !item.kind || item.payload === undefined) {
    return 'idempotencyKey, kind and payload are required for relay items.';
  }

  if (!['incident', 'message', 'notification'].includes(item.kind)) {
    return 'kind must be one of incident, message, notification.';
  }

  return null;
}

async function relayItems(req, res, next) {
  try {
    const forwardedBy = req.body.forwardedBy || null;
    const forwardSignature = req.body.forwardSignature || null;
    const relaySecret = process.env.RELAY_SHARED_SECRET || process.env.JWT_SECRET;

    if (!req.user) {
      const payloadForSignature = JSON.stringify({ forwardedBy, items: normalizeItems(req.body) });
      const expected = crypto
        .createHmac('sha256', relaySecret)
        .update(payloadForSignature)
        .digest('hex');

      if (
        !forwardSignature ||
        forwardSignature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(forwardSignature), Buffer.from(expected))
      ) {
        return res.status(401).json({
          success: false,
          message: 'Relay authentication required (token or valid forward signature).'
        });
      }
    }

    const items = normalizeItems(req.body);
    const accepted = [];
    const rejected = [];

    for (const item of items) {
      const validationError = validateRelayItem(item);
      if (validationError) {
        rejected.push({ item, reason: validationError });
        incrementRelay(item?.kind || 'unknown', 'rejected');
        continue;
      }

      const existing = await RelayItem.findOne({ idempotencyKey: item.idempotencyKey });
      if (existing) {
        accepted.push(existing);
        incrementRelay(item.kind, 'accepted');
        continue;
      }

      const created = await RelayItem.create({
        idempotencyKey: item.idempotencyKey,
        kind: item.kind,
        payload: item.payload,
        sourceUser: req.user ? req.user.id : null,
        sourcePeerId: item.sourcePeerId || forwardedBy || null,
        status: 'accepted',
        acceptedAt: new Date()
      });

      accepted.push(created);
      incrementRelay(item.kind, 'accepted');
    }

    return res.status(rejected.length > 0 ? 207 : 201).json({
      success: rejected.length === 0,
      data: {
        accepted,
        rejected
      },
      message: 'Relay request processed.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  relayItems
};
