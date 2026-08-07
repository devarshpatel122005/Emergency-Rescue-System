import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const TEMPLATES = {
  Assault: {
    templateType: 'assault',
    shortMessageKey: 'templateAssaultMessage',
    detailsKey: 'templateAssaultDetails'
  },
  Fire: {
    templateType: 'fire',
    shortMessageKey: 'templateFireMessage',
    detailsKey: 'templateFireDetails'
  },
  Drowning: {
    templateType: 'drowning',
    shortMessageKey: 'templateDrowningMessage',
    detailsKey: 'templateDrowningDetails'
  }
};

function IncidentTemplates({ onSubmit, loading }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    department: 'Other',
    templateType: 'custom',
    shortMessage: '',
    details: ''
  });

  const applyTemplate = (templateName) => {
    const selected = TEMPLATES[templateName];
    if (!selected) {
      return;
    }

    const departmentMap = {
      Assault: 'Assault',
      Fire: 'Fire',
      Drowning: 'Medical'
    };

    setForm({
      department: departmentMap[templateName] || 'Other',
      templateType: selected.templateType,
      shortMessage: t(selected.shortMessageKey),
      details: t(selected.detailsKey)
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    await onSubmit(form);
    setForm({
      department: 'Other',
      templateType: 'custom',
      shortMessage: '',
      details: ''
    });
  };

  return (
    <section className="card p-4">
      <button type="button" className="btn-secondary w-full" onClick={() => setOpen((value) => !value)}>
        {t('moreDetails')}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn-secondary" onClick={() => applyTemplate('Assault')}>
              {t('templateAssault')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => applyTemplate('Fire')}>
              {t('templateFire')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => applyTemplate('Drowning')}>
              {t('templateDrowning')}
            </button>
          </div>

          <form className="space-y-2" onSubmit={submit}>
            <select
              className="input"
              value={form.department}
              onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
            >
              <option value="Fire">{t('fire')}</option>
              <option value="Assault">{t('assault')}</option>
              <option value="Medical">{t('medical')}</option>
              <option value="Other">{t('other')}</option>
            </select>

            <input
              className="input"
              value={form.shortMessage}
              onChange={(event) => setForm((prev) => ({ ...prev, shortMessage: event.target.value }))}
              placeholder={t('details')}
              required
            />

            <textarea
              className="input min-h-24"
              value={form.details}
              onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
              placeholder={t('details')}
            />

            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? t('sending') : t('submitReport')}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default IncidentTemplates;
