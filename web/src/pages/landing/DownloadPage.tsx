import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { ShieldIcon } from '../../components/icons/ShieldIcon';

export function DownloadPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div className="py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-600/30">
            <ShieldIcon className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.cta_title}</h1>
        <p className="text-dark-300 text-lg mb-10 max-w-2xl mx-auto">{t.cta_subtitle}</p>

        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
          <DownloadCard
            icon="🤖"
            label={t.cta_android}
            desc="Android APK"
            href="/shield-messenger.apk"
          />
          <DownloadCard
            icon="🌐"
            label={t.cta_pwa}
            desc="Web App (PWA)"
            href="/register"
          />
          <DownloadCard
            icon="🍎"
            label={t.cta_ios}
            desc="iOS TestFlight"
            href="https://github.com/abokenan444/shield-messenger/releases"
          />
        </div>

        <p className="text-dark-500 text-sm max-w-xl mx-auto">{t.cta_install_pwa}</p>

        {/* Source Code */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">Source Code</h2>
          <a
            href="https://github.com/abokenan444/shield-messenger"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-dark-900 border border-dark-800 hover:border-primary-600 hover:bg-dark-800 transition-all group"
          >
            <span className="text-2xl">📦</span>
            <div className="text-left">
              <span className="block text-white font-medium group-hover:text-primary-400 transition-colors">GitHub Repository</span>
              <span className="block text-dark-400 text-sm">abokenan444/shield-messenger</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

function DownloadCard({ icon, label, desc, href }: { icon: string; label: string; desc: string; href: string }) {
  const isExternal = href.startsWith('http');
  const isDownload = href.endsWith('.apk');
  return (
    <a
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...(isDownload ? { download: true } : {})}
      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-dark-900 border border-dark-800 hover:border-primary-600 hover:bg-dark-800 transition-all group"
    >
      <span className="text-4xl">{icon}</span>
      <span className="text-white font-semibold text-lg group-hover:text-primary-400 transition-colors">{label}</span>
      <span className="text-dark-400 text-sm">{desc}</span>
    </a>
  );
}
