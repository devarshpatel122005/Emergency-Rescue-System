import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { logout } from '../services/authService';

function Header({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="space-y-3">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div>
          <h1 className="text-xl font-bold text-brand-900">{t('appTitle')}</h1>
          <p className="text-sm text-slate-600">
            {t('role')}: {user?.role || t('anonymous')}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="btn-secondary" to="/">
            {t('appTitle')}
          </Link>
          {user?.role === 'admin' ? (
            <>
              <Link className="btn-secondary" to="/admin">
                {t('dispatcher')}
              </Link>
              <Link className="btn-secondary" to="/analytics">
                {t('analytics')}
              </Link>
            </>
          ) : null}
          {user?.role === 'rescuer' ? (
            <Link className="btn-secondary" to="/rescuer">
              {t('rescuer')} {t('panel')}
            </Link>
          ) : null}
          <LanguageSwitcher />
          {user ? (
            <button type="button" className="btn-primary" onClick={handleLogout}>
              {t('logout')}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

export default Header;
