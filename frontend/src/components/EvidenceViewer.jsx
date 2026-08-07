import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

function buildEvidenceUrl(row) {
  if (!row?.storagePath) {
    return '';
  }

  const normalized = String(row.storagePath).replace(/^\/+/, '');
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  const root = apiBase.replace(/\/api\/?$/, '');
  return `${root}/uploads/${normalized}`;
}

function isImage(mimeType = '') {
  return mimeType.startsWith('image/');
}

function isVideo(mimeType = '') {
  return mimeType.startsWith('video/');
}

function EvidenceViewer({ rows }) {
  const { t } = useTranslation();
  const [activeRow, setActiveRow] = useState(null);
  const activeUrl = useMemo(() => buildEvidenceUrl(activeRow), [activeRow]);

  return (
    <div className="rounded-md border border-slate-200 p-3 text-sm">
      {rows.length === 0 ? (
        <p className="text-slate-500">{t('noEvidence')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row._id} className="rounded-md border border-slate-200 p-2">
              <p className="font-medium text-slate-800">{row.originalName || row.filename}</p>
              <p className="text-xs text-slate-500">{row.mimeType}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => setActiveRow(row)}>
                  {t('viewEvidence')}
                </button>
                <a className="btn-secondary" href={buildEvidenceUrl(row)} target="_blank" rel="noreferrer">
                  Open in new tab
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activeRow && activeUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">{activeRow.originalName || activeRow.filename}</h3>
              <button type="button" className="btn-secondary" onClick={() => setActiveRow(null)}>
                Close
              </button>
            </div>

            {isImage(activeRow.mimeType) ? (
              <img src={activeUrl} alt={activeRow.originalName || activeRow.filename} className="mx-auto max-h-[70vh] rounded-md" />
            ) : null}

            {isVideo(activeRow.mimeType) ? (
              <video src={activeUrl} controls className="mx-auto max-h-[70vh] w-full rounded-md" />
            ) : null}

            {!isImage(activeRow.mimeType) && !isVideo(activeRow.mimeType) ? (
              <div className="rounded-md border border-slate-200 p-4 text-sm text-slate-600">
                Preview not available for this file type.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default EvidenceViewer;
