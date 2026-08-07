import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerRescuer } from '../services/rescuerService';

function RescuerRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Fire',
    customDepartment: '',
    age: '',
    gender: 'Male',
    blood_group: 'O+',
    phone: '',
    idCardImage: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!/^\d{10}$/.test(form.phone)) {
        setError(t('phoneValidation'));
        setLoading(false);
        return;
      }

      if (!form.idCardImage) {
        setError('ID card image is required.');
        setLoading(false);
        return;
      }

      await registerRescuer(form);
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('rescuerRegistrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-4 pt-14">
      <form className="card space-y-4 p-6" onSubmit={submit}>
        <h1 className="text-2xl font-bold text-brand-900">
          {t('rescuer')} {t('register')}
        </h1>

        <input
          className="input"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder={t('name')}
          required
        />
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder={t('email')}
          required
        />
        <input
          className="input"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          placeholder={t('password')}
          minLength={6}
          required
        />

        <select
          className="input"
          value={form.department}
          onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
          required
        >
          <option value="Fire">{t('fire')}</option>
          <option value="Assault">{t('assault')}</option>
          <option value="Medical">{t('medical')}</option>
          <option value="Custom">{t('custom')}</option>
        </select>

        {form.department === 'Custom' ? (
          <input
            className="input"
            value={form.customDepartment}
            onChange={(event) => setForm((prev) => ({ ...prev, customDepartment: event.target.value }))}
            placeholder={t('customDepartment')}
            required
          />
        ) : null}

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
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))}
          placeholder={t('phone')}
          inputMode="numeric"
          pattern="[0-9]{10}"
          required
        />

        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(event) => setForm((prev) => ({ ...prev, idCardImage: event.target.files?.[0] || null }))}
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? t('sending') : t('register')}
        </button>

        <p className="text-sm text-slate-600">
          <Link className="underline" to="/login">
            {t('login')}
          </Link>
        </p>
      </form>
    </main>
  );
}

export default RescuerRegister;
