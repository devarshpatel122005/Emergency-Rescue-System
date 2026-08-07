const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

const speechController = require('../controllers/speechController');
const azureSpeechService = require('../services/azureSpeechService');
const Incident = require('../models/Incident');
const Message = require('../models/Message');

function buildRes() {
  return httpMocks.createResponse({ eventEmitter: EventEmitter });
}

describe('Azure Speech Integration', () => {
  const originalKey = process.env.AZURE_SPEECH_KEY;

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.AZURE_SPEECH_KEY = originalKey;
  });

  it('returns 501 when Azure Speech key is missing', async () => {
    delete process.env.AZURE_SPEECH_KEY;

    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/speech/azure/transcribe',
      body: { language: 'en-US' },
      user: { id: 'user-1', role: 'admin' }
    });
    const res = buildRes();

    await speechController.transcribeWithAzure(req, res, () => {});

    expect(res.statusCode).toBe(501);
    expect(res._getJSONData().success).toBe(false);
  });

  it('stores transcript message when Azure transcription succeeds', async () => {
    process.env.AZURE_SPEECH_KEY = 'test-key';

    jest.spyOn(azureSpeechService, 'transcribeAudioBuffer').mockResolvedValue({
      transcript: 'Responder en route',
      confidence: 0.91,
      language: 'en-US',
      providerMeta: { provider: 'azure' }
    });

    jest.spyOn(Incident, 'findById').mockResolvedValue({ _id: 'inc-1' });
    jest.spyOn(Message, 'create').mockResolvedValue({ _id: 'msg-1' });

    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/speech/azure/transcribe',
      body: {
        incidentId: 'inc-1',
        audioBase64: Buffer.from('dummy-audio').toString('base64'),
        language: 'en-US',
        contentType: 'audio/wav'
      },
      user: { id: 'user-1', role: 'admin' }
    });
    const res = buildRes();

    await speechController.transcribeWithAzure(req, res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().success).toBe(true);
    expect(res._getJSONData().data.transcript).toBe('Responder en route');
  });
});
