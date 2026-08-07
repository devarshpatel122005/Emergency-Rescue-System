import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emitSocket, onSocket } from '../services/socket';
import {
  joinPTTChannel,
  leavePTTChannel,
  toggleTalk,
  setMute,
  subscribePTTStats
} from '../services/webrtcService';

function speakerClass(speakerType) {
  if (speakerType === 'admin') {
    return 'bg-blue-100 text-blue-800';
  }
  if (speakerType === 'rescuer') {
    return 'bg-emerald-100 text-emerald-800';
  }
  return 'bg-rose-100 text-rose-800';
}

function PTTButton({ incidentId, speakerType = 'victim', large = false }) {
  const { t } = useTranslation();
  const [connected, setConnected] = useState(false);
  const [talking, setTalking] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [transcripts, setTranscripts] = useState([]);

  const holdButtonClass = useMemo(() => {
    const base = talking ? 'bg-red-700' : 'bg-red-600';
    const size = large ? 'min-h-28 text-lg' : 'min-h-16 text-sm';
    return `w-full rounded-lg px-4 py-4 font-bold text-white ${base} ${size}`;
  }, [talking, large]);

  useEffect(() => {
    const unsubscribeStats = subscribePTTStats((stats) => {
      setConnected(stats.connected);
      setTalking(stats.talking);
      setMutedState(stats.muted);
      setPeerCount(stats.peerCount);
    });

    const offTranscript = onSocket('transcript:new', (payload) => {
      if (!payload || String(payload.incident) !== String(incidentId)) {
        return;
      }

      setTranscripts((prev) => [payload, ...prev].slice(0, 100));
    });

    return () => {
      unsubscribeStats();
      offTranscript();
      leavePTTChannel();
    };
  }, [incidentId]);

  const connect = async () => {
    if (!incidentId) {
      return;
    }
    await joinPTTChannel(incidentId);
  };

  const disconnect = () => {
    leavePTTChannel();
  };

  const startTalk = () => {
    if (!connected) {
      return;
    }
    toggleTalk(true);
    emitSocket('ptt:start', { incidentId, speakerType });
  };

  const endTalk = () => {
    toggleTalk(false);
    emitSocket('ptt:stop', { incidentId, speakerType });
  };

  const handleMuteToggle = () => {
    setMute(!muted);
  };

  const sendTranscript = () => {
    const text = transcriptInput.trim();
    if (!text || !incidentId) {
      return;
    }

    emitSocket('transcript:send', {
      incidentId,
      speakerType,
      text
    });
    setTranscriptInput('');
  };

  const speakerLabel = (type) => {
    if (type === 'admin') {
      return t('admin');
    }
    if (type === 'rescuer') {
      return t('rescuer');
    }
    return t('victim');
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={connect} disabled={!incidentId || connected}>
          {t('joinChannel')}
        </button>
        <button type="button" className="btn-secondary" onClick={disconnect} disabled={!connected}>
          {t('leaveChannel')}
        </button>
        <button type="button" className="btn-secondary" onClick={handleMuteToggle} disabled={!connected}>
          {muted ? t('unmute') : t('mute')}
        </button>
      </div>

      <button
        type="button"
        className={holdButtonClass}
        disabled={!connected}
        onMouseDown={startTalk}
        onMouseUp={endTalk}
        onMouseLeave={endTalk}
        onTouchStart={startTalk}
        onTouchEnd={endTalk}
      >
        {talking ? t('talking') : t('holdToTalk')}
      </button>

      <p className="text-xs text-slate-600">
        {t('peers')}: {peerCount}
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className="input"
          value={transcriptInput}
          onChange={(event) => setTranscriptInput(event.target.value)}
          placeholder={t('transcripts')}
        />
        <button type="button" className="btn-secondary" onClick={sendTranscript}>
          {t('submit')}
        </button>
      </div>

      <div className="max-h-52 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
        {transcripts.length === 0 ? (
          <p className="text-xs text-slate-500">{t('transcripts')}</p>
        ) : (
          transcripts.map((item) => (
            <div key={item._id || `${item.at}-${item.text}`} className="text-xs">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 ${speakerClass(item.speakerType)}`}>
                  {speakerLabel(item.speakerType)}
                </span>
                <span className="text-slate-500">{new Date(item.at).toLocaleTimeString()}</span>
              </div>
              <p className="rounded-md bg-slate-50 p-2 text-slate-700">{item.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PTTButton;
