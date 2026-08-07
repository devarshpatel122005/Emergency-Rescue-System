import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Sidebar({ role = 'victim', onLogout }) {
  const { t } = useTranslation();

  const adminItems = [
    { to: '/admin', label: t('dashboard') },
    { to: '/admin/rescuer-verification', label: t('rescuerVerification') },
    { to: '/analytics', label: t('analytics') }
  ];

  const rescuerItems = [
    { to: '/rescuer', label: t('assignedEmergency') },
    { to: '/rescuer#status', label: t('status') }
  ];

  const victimItems = [
    { to: '/', label: t('home') },
    { to: '/login', label: t('login') },
    { to: '/register', label: t('register') }
  ];

  const items = role === 'admin' ? adminItems : role === 'rescuer' ? rescuerItems : victimItems;

  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:w-60">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('navigation')}</p>
      <nav className="space-y-2">
        {items.map((item) => (
          <Link
            key={`${role}-${item.to}-${item.label}`}
            to={item.to}
            className="block rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {item.label}
          </Link>
        ))}

        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            {t('logout')}
          </button>
        ) : null}
      </nav>
    </aside>
  );
}

export default Sidebar;
