import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { useTranslation, locales } from '../lib/i18n';
import { ShieldIcon } from '../components/icons/ShieldIcon';

const subTexts: Record<string, { title: string; current: string; free: string; supporter: string; enterprise: string; perMonth: string; contact: string; upgrade: string; features: Record<string, string[]> }> = {
  ar: { title: 'الاشتراك', current: 'خطتك الحالية', free: 'مجاني', supporter: 'داعم', enterprise: 'مؤسسات', perMonth: '/شهر', contact: 'تواصل معنا', upgrade: 'ترقية', features: { free: ['رسائل مشفرة', 'مكالمات صوتية/فيديو', 'محفظة أساسية'], supporter: ['كل مميزات المجاني', 'تخزين سحابي مشفر', 'ثيمات مخصصة', 'دعم أولوية'], enterprise: ['كل مميزات الداعم', 'إدارة فريق', 'API وصول', 'SLA مخصص'] } },
  en: { title: 'Subscription', current: 'Current Plan', free: 'Free', supporter: 'Supporter', enterprise: 'Enterprise', perMonth: '/mo', contact: 'Contact Us', upgrade: 'Upgrade', features: { free: ['Encrypted messages', 'Voice/video calls', 'Basic wallet'], supporter: ['Everything in Free', 'Encrypted cloud storage', 'Custom themes', 'Priority support'], enterprise: ['Everything in Supporter', 'Team management', 'API access', 'Custom SLA'] } },
  fr: { title: 'Abonnement', current: 'Plan actuel', free: 'Gratuit', supporter: 'Supporter', enterprise: 'Entreprise', perMonth: '/mois', contact: 'Contactez-nous', upgrade: 'Mettre à niveau', features: { free: ['Messages chiffrés', 'Appels voix/vidéo', 'Portefeuille basique'], supporter: ['Tout du Gratuit', 'Stockage cloud chiffré', 'Thèmes personnalisés', 'Support prioritaire'], enterprise: ['Tout du Supporter', 'Gestion d\'équipe', 'Accès API', 'SLA personnalisé'] } },
  es: { title: 'Suscripción', current: 'Plan actual', free: 'Gratis', supporter: 'Supporter', enterprise: 'Empresa', perMonth: '/mes', contact: 'Contáctenos', upgrade: 'Mejorar', features: { free: ['Mensajes cifrados', 'Llamadas voz/video', 'Billetera básica'], supporter: ['Todo en Gratis', 'Almacenamiento nube cifrado', 'Temas personalizados', 'Soporte prioritario'], enterprise: ['Todo en Supporter', 'Gestión de equipo', 'Acceso API', 'SLA personalizado'] } },
};

export function SettingsPage() {
  const navigate = useNavigate();
  const { userId, displayName, publicKey, logout } = useAuthStore();
  const { t, setLocale, locale } = useTranslation();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const sub = subTexts[locale] || subTexts.en;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-16 md:pb-0">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-4 md:px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-dark-400 hover:text-dark-200 transition"
        >
          {t.settings_back}
        </button>
        <h1 className="text-xl font-semibold">{t.settings_title}</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{sub.title}</h2>
            <span className="px-3 py-1 bg-primary-900/30 text-primary-400 text-xs rounded-full border border-primary-800/50">
              {sub.current}: {sub.free}
            </span>
          </div>

          {!showUpgrade ? (
            <button
              onClick={() => setShowUpgrade(true)}
              className="btn-primary w-full py-3"
            >
              {sub.upgrade}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Supporter tier */}
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-primary-400">{sub.supporter}</h3>
                  <span className="text-white font-bold">$4.99{sub.perMonth}</span>
                </div>
                <ul className="text-sm text-dark-400 space-y-1 mb-3">
                  {sub.features.supporter.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-primary-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className="btn-primary w-full py-2 text-sm">{sub.upgrade}</button>
              </div>

              {/* Enterprise tier */}
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-yellow-400">{sub.enterprise}</h3>
                  <span className="text-dark-400 text-sm">{sub.contact}</span>
                </div>
                <ul className="text-sm text-dark-400 space-y-1 mb-3">
                  {sub.features.enterprise.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-yellow-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:support@shieldmessenger.com"
                  className="block w-full py-2 text-center bg-dark-700 rounded-xl text-dark-200 hover:bg-dark-600 transition text-sm"
                >
                  {sub.contact}
                </a>
              </div>

              <button
                onClick={() => setShowUpgrade(false)}
                className="text-dark-500 text-sm hover:text-dark-300 w-full text-center"
              >
                {t.friends_cancel}
              </button>
            </div>
          )}
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
