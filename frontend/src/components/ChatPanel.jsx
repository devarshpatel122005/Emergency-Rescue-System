import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createMessage, listMessages } from '../services/messageService';
import { onSocket } from '../services/socket';

function bubbleClass(type) {
  if (type === 'admin') {
    return 'bg-blue-50 border-blue-200';
  }
  if (type === 'rescuer') {
    return 'bg-emerald-50 border-emerald-200';
  }
  return 'bg-rose-50 border-rose-200';
}

function senderLabel(type, t) {
  if (type === 'admin') {
    return t('admin');
  }
  if (type === 'rescuer') {
    return t('rescuer');
  }
  return t('victim');
}

function resolveSenderType(user, explicitSenderType) {
  if (explicitSenderType && ['admin', 'rescuer', 'victim'].includes(explicitSenderType)) {
    return explicitSenderType;
  }
  if (user?.role === 'admin') {
    return 'admin';
  }
  if (user?.role === 'rescuer') {
    return 'rescuer';
  }
  return 'victim';
}

function ChatPanel({ incidentId, user, senderType }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentSenderType = useMemo(() => resolveSenderType(user, senderType), [user, senderType]);

  useEffect(() => {
    if (!incidentId) {
      setRows([]);
      return;
    }

    listMessages(incidentId)
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }, [incidentId]);

  useEffect(() => {
    const offNewMessage = onSocket('message:new', (payload) => {
      if (!payload || String(payload.incidentId) !== String(incidentId)) {
        return;
      }

      setRows((prev) => {
        const exists = prev.some((entry) => String(entry._id) === String(payload._id));
        if (exists) {
          return prev;
        }
        return [...prev, payload];
      });
    });

    return () => {
      offNewMessage();
    };
  }, [incidentId]);

  const send = async () => {
    const text = input.trim();
    if (!incidentId || !text || loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createMessage({
        incidentId,
        text,
        senderType: currentSenderType
      });
      setInput('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('chatSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!incidentId) {
    return (
      <section className="card p-4">
        <h3 className="mb-2 text-lg font-semibold text-brand-900">{t('chat')}</h3>
        <p className="text-sm text-slate-500">{t('noChatIncident')}</p>
      </section>
    );
  }

  return (
    <section className="card space-y-3 p-4">
      <h3 className="text-lg font-semibold text-brand-900">{t('chat')}</h3>

      <div className="max-h-64 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{t('noMessages')}</p>
        ) : (
          rows.map((row) => (
            <article key={row._id || `${row.timestamp}-${row.text}`} className={`rounded-md border p-2 ${bubbleClass(row.senderType)}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">{row.senderName || senderLabel(row.senderType, t)}</span>
                <span className="text-slate-500">
                  {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '-'}
                </span>
              </div>
              <p className="text-sm text-slate-800">{row.text}</p>
            </article>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('typeMessage')}
          maxLength={1000}
        />
        <button type="button" className="btn-primary" onClick={send} disabled={loading || !input.trim()}>
          {t('send')}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

export default ChatPanel;
