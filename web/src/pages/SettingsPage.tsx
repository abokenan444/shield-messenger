import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { useTranslation, locales } from '../lib/i18n';
import { ShieldIcon } from '../components/icons/ShieldIcon';

export function SettingsPage() {
  const navigate = useNavigate();
  const { userId, displayName, publicKey, logout } = useAuthStore();
  const { t, setLocale, locale } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-dark-400 hover:text-dark-200 transition"
        >
          {t.settings_back}
        </button>
        <h1 className="text-xl font-semibold">{t.settings_title}</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Profile */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t.settings_profile}</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="avatar text-2xl">
              {displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-medium text-white">{displayName}</p>
              <p className="text-sm text-dark-400" dir="ltr">{userId}</p>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t.settings_identity}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">{t.settings_publicKey}</span>
              <span className="text-dark-400 text-xs font-mono truncate max-w-48" dir="ltr">
                {publicKey || t.settings_notAvailable}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-300">{t.settings_protocol}</span>
              <span className="text-dark-400 text-sm">Shield Messenger P2P</span>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-primary-400" />
            {t.settings_privacySecurity}
          </h2>
          <div className="space-y-4">
            <SettingRow label={t.settings_e2e} value={t.settings_enabled} active />
            <SettingRow label={t.settings_incognito} value={t.settings_disabled} />
            <SettingRow label={t.settings_disappearing} value={t.settings_disabled} />
            <SettingRow label={t.settings_twoFactor} value={t.settings_notEnabled} />
            <SettingRow label={t.settings_torRouting} value={t.settings_enabled} active />
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t.settings_appearance}</h2>
          <div className="space-y-4">
            <SettingRow label={t.settings_theme} value={t.settings_dark} active />

            {/* Language picker */}
            <div className="flex items-center justify-between py-2 border-b border-dark-800">
              <span className="text-dark-200">{t.settings_language}</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="bg-dark-800 text-dark-200 text-sm rounded-lg px-3 py-1.5 border border-dark-700
                           focus:border-primary-500 focus:outline-none cursor-pointer"
              >
                {Object.values(locales).map((loc) => (
                  <option key={loc.langCode} value={loc.langCode}>
                    {loc.langName}
                  </option>
                ))}
              </select>
            </div>

            <SettingRow label={t.settings_fontSize} value={t.settings_medium} />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900/30 border border-red-800 rounded-xl
                     text-red-300 hover:bg-red-900/50 transition font-medium"
        >
          {t.settings_logout}
        </button>
      </div>
    </div>
  );
}

function SettingRow({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
      <span className="text-dark-200">{label}</span>
      <span className={active ? 'text-primary-400 text-sm' : 'text-dark-500 text-sm'}>
        {value}
      </span>
    </div>
  );
}
