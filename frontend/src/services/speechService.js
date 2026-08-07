function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export async function submitAzureTranscription({ incidentId, audioBlob, language = 'en-US' }) {
  const formData = new FormData();
  if (incidentId) {
    formData.append('incidentId', incidentId);
  }
  formData.append('language', language);
  formData.append('audio', audioBlob, 'transcript.webm');

  const token = localStorage.getItem('ers_token');
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/speech/azure/transcribe`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || 'Azure transcription request failed.');
  }

  return payload.data;
}

export function createSpeechController({ onResult, onError, onEnd }) {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    return {
      supported: false,
      start: () => {},
      stop: () => {}
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      finalTranscript += event.results[i][0].transcript;
    }
    onResult(finalTranscript);
  };

  recognition.onerror = (event) => {
    if (onError) {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    if (onEnd) {
      onEnd();
    }
  };

  return {
    supported: true,
    start: () => recognition.start(),
    stop: () => recognition.stop()
  };
}
