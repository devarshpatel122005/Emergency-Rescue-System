import { useEffect, useMemo, useRef, useState } from 'react';
import { createMessage } from '../services/messageService';
import { onSocket } from '../services/socket';

function badgeClass(type) {
  if (type === 'admin') {
    return 'bg-blue-100 text-blue-700';
  }
  if (type === 'victim') {
    return 'bg-rose-100 text-rose-700';
  }
  return 'bg-emerald-100 text-emerald-700';
}

function resolveSpeechApi() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function ARTranscript({ incidentId, speakerType = 'rescuer' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Recognition = resolveSpeechApi();
    if (!Recognition) {
      setSupported(false);
      return undefined;
    }

    setSupported(true);
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setError('');
    };

    recognition.onerror = (event) => {
      setError(event.error || 'Speech recognition failed.');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = async (event) => {
      let interim = '';
      let finalTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const entry = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) {
          finalTranscript += `${entry} `;
        } else {
          interim += `${entry} `;
        }
      }

      setLiveText((finalTranscript + interim).trim());

      if (finalTranscript.trim() && incidentId) {
        try {
          await createMessage({
            incidentId,
            text: finalTranscript.trim(),
            senderType,
            isTranscript: true
          });
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Transcript send failed.');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [incidentId, senderType]);

  useEffect(() => {
    const offTranscript = onSocket('transcript:new', (payload) => {
      if (!payload || String(payload.incident) !== String(incidentId)) {
        return;
      }

      const entry = {
        _id: payload._id,
        text: payload.text,
        speakerType: payload.speakerType || 'victim',
        senderName: payload.senderName || payload.speakerType || 'speaker',
        at: payload.at
      };

      setHistory((prev) => [entry, ...prev].slice(0, 100));
    });

    return () => {
      offTranscript();
    };
  }, [incidentId]);

  const canInteract = useMemo(() => supported && Boolean(incidentId), [supported, incidentId]);

  const startListening = () => {
    if (!recognitionRef.current || !canInteract) {
      return;
    }
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) {
      return;
    }
    recognitionRef.current.stop();
  };

  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-lg font-semibold text-brand-900">Live Transcript</h2>

      {!supported ? <p className="text-sm text-slate-500">Web Speech API is not supported in this browser.</p> : null}

      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={startListening} disabled={!canInteract || listening}>
          Start
        </button>
        <button type="button" className="btn-secondary" onClick={stopListening} disabled={!listening}>
          Stop
        </button>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 min-h-[56px]">
        {liveText || 'Transcript text will appear here...'}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-slate-200 p-3">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No transcripts yet.</p>
        ) : (
          history.map((entry) => (
            <div key={entry._id || `${entry.at}-${entry.text}`} className="rounded-md border border-slate-200 bg-white p-2">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${badgeClass(entry.speakerType)}`}>{entry.senderName}</span>
                <span className="text-slate-500">{entry.at ? new Date(entry.at).toLocaleTimeString() : '-'}</span>
              </div>
              <p className="text-sm text-slate-800">{entry.text}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default ARTranscript;
