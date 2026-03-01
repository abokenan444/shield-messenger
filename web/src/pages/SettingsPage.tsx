import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { ShieldIcon } from '../components/icons/ShieldIcon';
import { useTranslation } from '../lib/i18n';
import { locales, type LocaleCode } from '../lib/i18n/locales';

export function SettingsPage() {
  const navigate = useNavigate();
  const { userId, displayName, publicKey, logout } = useAuthStore();
  const { locale, setLocale } = useTranslation();

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
          ← رجوع
        </button>
        <h1 className="text-xl font-semibold">الإعدادات</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Profile */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">الملف الشخصي</h2>
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
          <h2 className="text-lg font-semibold mb-4">الهوية</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">المفتاح العام</span>
              <span className="text-dark-400 text-xs font-mono truncate max-w-48" dir="ltr">
                {publicKey || 'غير متوفر'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-300">البروتوكول</span>
              <span className="text-dark-400 text-sm">Shield Messenger P2P</span>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-primary-400" />
            الخصوصية والأمان
          </h2>
          <div className="space-y-4">
            <SettingRow label="التشفير التام (E2EE)" value="مفعّل" active />
            <SettingRow label="وضع التصفح الخفي" value="معطّل" />
            <SettingRow label="رسائل تختفي" value="معطّل" />
            <SettingRow label="مصادقة ثنائية (2FA)" value="غير مفعّل" />
            <SettingRow label="توجيه عبر Tor" value="مفعّل" active />
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">المظهر</h2>
          <div className="space-y-4">
            <SettingRow label="السمة" value="داكن" active />
            <div className="flex items-center justify-between py-2 border-b border-dark-800">
              <span className="text-dark-200">اللغة</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as LocaleCode)}
                className="bg-dark-800 text-dark-200 text-sm rounded-lg px-3 py-1.5 border border-dark-700 focus:border-primary-500 focus:outline-none"
              >
                {Object.entries(locales).map(([code, t]) => (
                  <option key={code} value={code}>{t.langName}</option>
                ))}
              </select>
            </div>
            <SettingRow label="حجم الخط" value="متوسط" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-900/30 border border-red-800 rounded-xl
                     text-red-300 hover:bg-red-900/50 transition font-medium"
        >
          تسجيل الخروج
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
