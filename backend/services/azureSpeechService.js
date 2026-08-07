function getAzureConfig() {
  return {
    key: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION || 'eastus'
  };
}

function parseAzureRecognitionResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      transcript: '',
      confidence: null,
      language: 'en-US',
      providerMeta: payload || {}
    };
  }

  const topNBest = Array.isArray(payload.NBest) ? payload.NBest[0] : null;

  return {
    transcript: payload.DisplayText || topNBest?.Display || '',
    confidence: topNBest?.Confidence ?? null,
    language: payload.PrimaryLanguage?.Language || payload.Offset ? 'en-US' : 'en-US',
    providerMeta: payload
  };
}

async function transcribeAudioBuffer({ audioBuffer, contentType = 'audio/wav', language = 'en-US' }) {
  const { key, region } = getAzureConfig();

  if (!key) {
    const error = new Error('Azure Speech is not configured.');
    error.statusCode = 501;
    throw error;
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    const error = new Error('Audio payload is required.');
    error.statusCode = 400;
    throw error;
  }

  const endpoint =
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1` +
    `?language=${encodeURIComponent(language)}&format=detailed`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': contentType,
      Accept: 'application/json;text/xml'
    },
    body: audioBuffer
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const azureError = new Error(`Azure Speech request failed (${response.status}).`);
    azureError.statusCode = response.status;
    azureError.providerMeta = parsed;
    throw azureError;
  }

  return parseAzureRecognitionResponse(parsed);
}

module.exports = {
  getAzureConfig,
  transcribeAudioBuffer,
  parseAzureRecognitionResponse
};
