import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function UserProfile({ user, onLogout }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!user || user.role === 'admin') {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs shadow-sm"
        onClick={() => setOpen((value) => !value)}
      >
        <p className="font-semibold text-slate-900">{user.name}</p>
        <p className="text-slate-600">
          {t('age')}: {user.age || '-'} | {t('gender')}: {user.gender || '-'} | {t('bloodGroup')}:{' '}
          {user.blood_group || '-'}
        </p>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <Link
            to="/profile"
            className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            {t('profile')}
          </Link>
          <button
            type="button"
            className="block w-full rounded px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={onLogout}
          >
            {t('logout')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default UserProfile;
