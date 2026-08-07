import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../services/authService';

function nextRouteForUser(data) {
  if (data.requiresProfileCompletion || !data.profileComplete) {
    return '/complete-profile';
  }

  if (data.user.role === 'admin') {
    return '/admin';
  }
  if (data.user.role === 'rescuer') {
    return '/rescuer';
  }
  return '/';
}

function LoginPage({ onAuth }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(form);
      onAuth(data.user);
      navigate(nextRouteForUser(data));
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-4 pt-20">
      <form className="card space-y-4 p-6" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-brand-900">{t('login')}</h1>
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
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? t('sending') : t('signIn')}
        </button>
        <p className="text-sm text-slate-600">
          {t('register')}?{' '}
          <Link className="text-brand-700 underline" to="/register">
            {t('createAccount')}
          </Link>
        </p>
        <p className="text-sm text-slate-600">
          <Link className="text-brand-700 underline" to="/rescuer-register">
            {t('rescuer')} {t('register')}
          </Link>
        </p>
      </form>
    </main>
  );
}

export default LoginPage;
