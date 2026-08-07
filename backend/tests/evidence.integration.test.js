const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

const Incident = require('../models/Incident');
const Evidence = require('../models/Evidence');
const { uploadEvidence } = require('../controllers/evidenceController');
const storageAdapterService = require('../services/storageAdapterService');
const evidenceSignatureService = require('../services/evidenceSignatureService');
const custodyService = require('../services/custodyService');

function buildRes() {
  return httpMocks.createResponse({ eventEmitter: EventEmitter });
}

describe('Evidence Integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads and signs evidence metadata with custody entry', async () => {
    jest.spyOn(Incident, 'findById').mockResolvedValue({ _id: 'inc-1' });

    jest.spyOn(storageAdapterService, 'persistEvidenceFile').mockResolvedValue({
      storagePath: 'evidence/inc-1/file.jpg',
      filename: 'file.jpg',
      originalName: 'camera.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024
    });

    jest.spyOn(evidenceSignatureService, 'signEvidenceMetadata').mockReturnValue({
      algorithm: 'HMAC-SHA256',
      signature: 'signed-value'
    });

    jest.spyOn(Evidence, 'create').mockResolvedValue({
      _id: 'ev-1',
      signature: 'signed-value',
      signatureAlgo: 'HMAC-SHA256',
      signedAt: new Date(),
      storagePath: 'evidence/inc-1/file.jpg',
      filename: 'file.jpg'
    });

    jest.spyOn(custodyService, 'appendCustodyLog').mockResolvedValue({
      _id: 'log-1',
      entryHash: 'hash-1'
    });

    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/incidents/inc-1/evidence',
      params: { id: 'inc-1' },
      user: { id: 'user-1', role: 'rescuer' },
      body: {
        lat: '19.076',
        lng: '72.8777',
        capturedAt: '2026-03-06T12:00:00.000Z',
        deviceId: 'device-1',
        note: 'Scene capture'
      },
      file: {
        originalname: 'camera.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/tmp/camera.jpg'
      }
    });
    const res = buildRes();

    await uploadEvidence(req, res, () => {});

    expect(res.statusCode).toBe(201);
    expect(res._getJSONData().success).toBe(true);
    expect(res._getJSONData().data.signature.value).toBe('signed-value');
    expect(res._getJSONData().data.custodyEntry._id).toBe('log-1');
  });
});
