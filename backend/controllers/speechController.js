const Message = require('../models/Message');
const Incident = require('../models/Incident');
const azureSpeechService = require('../services/azureSpeechService');
const { incrementSpeechMetric } = require('../services/metricsService');

function decodeAudioBase64(audioBase64) {
  if (!audioBase64) {
    return null;
  }

  try {
    return Buffer.from(String(audioBase64), 'base64');
  } catch (error) {
    return null;
  }
}

async function transcribeWithAzure(req, res, next) {
  try {
    const { incidentId = null, language = 'en-US', contentType = null, audioBase64 = null } = req.body;

    const hasAzure = Boolean(azureSpeechService.getAzureConfig().key);
    if (!hasAzure) {
      incrementSpeechMetric('azure_transcribe', 'not_configured');
      return res.status(501).json({
        success: false,
        data: {
          transcript: '',
          confidence: null,
          language,
          providerMeta: { reason: 'AZURE_SPEECH_KEY missing' }
        },
        message: 'Azure Speech is not configured.'
      });
    }

    const bufferFromFile = req.file ? req.file.buffer : null;
    const bufferFromBase64 = decodeAudioBase64(audioBase64);
    const audioBuffer = bufferFromFile || bufferFromBase64;

    if (!audioBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Audio file or audioBase64 payload is required.'
      });
    }

    const result = await azureSpeechService.transcribeAudioBuffer({
      audioBuffer,
      contentType: contentType || req.file?.mimetype || 'audio/wav',
      language
    });

    let transcriptMessage = null;
    if (incidentId && result.transcript) {
      const incident = await Incident.findById(incidentId);
      if (incident) {
        transcriptMessage = await Message.create({
          incident: incident._id,
          senderUser: req.user ? req.user.id : null,
          senderRole: req.user ? req.user.role : 'system',
          text: result.transcript,
          type: 'transcript',
          confidence: result.confidence,
          language: result.language || language,
          source: 'azure_batch',
          draft: false
        });
      }
    }

    incrementSpeechMetric('azure_transcribe', 'success');

    return res.json({
      success: true,
      data: {
        ...result,
        transcriptMessage
      },
      message: 'Azure transcription completed.'
    });
  } catch (error) {
    incrementSpeechMetric('azure_transcribe', 'failed');
    return next(error);
  }
}

module.exports = {
  transcribeWithAzure
};
