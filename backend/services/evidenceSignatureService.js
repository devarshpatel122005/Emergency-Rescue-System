const crypto = require('crypto');

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(value[key]);
        return acc;
      }, {});
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function canonicalize(payload) {
  return JSON.stringify(sortObject(payload));
}

function getSecret() {
  return process.env.EVIDENCE_SECRET || process.env.JWT_SECRET || 'ers-evidence-secret';
}

function signEvidenceMetadata(payload) {
  const canonicalPayload = canonicalize(payload);
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(canonicalPayload)
    .digest('hex');

  return {
    canonicalPayload,
    signature,
    algorithm: 'HMAC-SHA256'
  };
}

function verifyEvidenceMetadata(payload, signature) {
  const { signature: expectedSignature } = signEvidenceMetadata(payload);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(String(signature || ''));
  if (expected.length !== received.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, received);
}

module.exports = {
  canonicalize,
  signEvidenceMetadata,
  verifyEvidenceMetadata
};
