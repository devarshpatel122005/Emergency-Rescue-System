import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateProfile } from '../services/authService';

function Profile({ user, onAuth }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || 'Male',
    blood_group: user?.blood_group || 'O+',
    phone: user?.phone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (!/^\d{10}$/.test(form.phone)) {
        setError(t('phoneValidation'));
        setLoading(false);
        return;
      }

      const response = await updateProfile(form);
      onAuth(response.user);
      setNotice(t('profileUpdated'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('completeProfileFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-4 pt-14">
      <form className="card space-y-4 p-6" onSubmit={submit}>
        <h1 className="text-2xl font-bold text-brand-900">{t('profile')}</h1>

        <input
          className="input"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder={t('name')}
          required
        />

        <input
          className="input"
          type="number"
          value={form.age}
          onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
          placeholder={t('age')}
          min={1}
          required
        />

        <select
          className="input"
          value={form.gender}
          onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
          required
        >
          <option value="Male">{t('male')}</option>
          <option value="Female">{t('female')}</option>
          <option value="Other">{t('otherGender')}</option>
        </select>

        <select
          className="input"
          value={form.blood_group}
          onChange={(event) => setForm((prev) => ({ ...prev, blood_group: event.target.value }))}
          required
        >
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>

        <input
          className="input"
          value={form.phone}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              phone: event.target.value.replace(/\D/g, '').slice(0, 10)
            }))
          }
          placeholder={t('phone')}
          inputMode="numeric"
          pattern="[0-9]{10}"
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? t('sending') : t('save')}
        </button>
      </form>
    </main>
  );
}

export default Profile;
