import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../services/authService';

function nextRouteForUser(user) {
  if (!user.profileComplete) {
    return '/complete-profile';
  }
  if (user.role === 'admin') {
    return '/admin';
  }
  if (user.role === 'rescuer') {
    return '/rescuer';
  }
  return '/';
}

function RegisterPage({ onAuth }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: 'Male',
    blood_group: 'O+',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      const payload = {
        ...form,
        role: 'victim'
      };

      const data = await register(payload);
      onAuth(data.user);
      navigate(nextRouteForUser(data.user));
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-4 pt-14">
      <form className="card space-y-4 p-6" onSubmit={submit}>
        <h1 className="text-2xl font-bold text-brand-900">{t('createAccount')}</h1>

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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? t('sending') : t('register')}
        </button>

        <p className="text-sm text-slate-600">
          {t('login')}?{' '}
          <Link className="text-brand-700 underline" to="/login">
            {t('signIn')}
          </Link>
        </p>
      </form>
    </main>
  );
}

export default RegisterPage;
