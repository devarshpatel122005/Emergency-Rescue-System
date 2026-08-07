import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BUTTONS = [
  { key: 'Fire', labelKey: 'fire' },
  { key: 'Assault', labelKey: 'assault' },
  { key: 'Medical', labelKey: 'medical' },
  { key: 'Other', labelKey: 'other' }
];

function SOSButtons({ onSOS, loading }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  const handleSOS = async (department) => {
    await onSOS({ department, message });
    setMessage('');
  };

  return (
    <section className="card p-4">
      <div className="mb-3 grid grid-cols-2 gap-3">
        {BUTTONS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="sos-large-button"
            disabled={loading}
            onClick={() => handleSOS(item.key)}
          >
            {loading ? t('sending') : t(item.labelKey)}
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder={t('optionalMessage')}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
    </section>
  );
}

export default SOSButtons;
