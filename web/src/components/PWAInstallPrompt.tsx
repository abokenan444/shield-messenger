import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show install prompt after a short delay
      const dismissed = sessionStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (showUpdate) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom">
        <div className="bg-dark-800 border border-primary-600/50 rounded-2xl p-4 shadow-2xl shadow-primary-600/10 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">🔄</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">{t.pwa_updateAvailable ?? 'Update Available'}</p>
            <p className="text-dark-400 text-xs mt-0.5">{t.pwa_updateDesc ?? 'A new version is ready.'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition shrink-0"
          >
            {t.pwa_refresh ?? 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom">
      <div className="bg-dark-800 border border-primary-600/50 rounded-2xl p-4 shadow-2xl shadow-primary-600/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-2xl">🛡️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">{t.pwa_installTitle ?? 'Install Shield Messenger'}</p>
            <p className="text-dark-400 text-sm mt-1">{t.pwa_installDesc ?? 'Install for quick access, offline support, and push notifications.'}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition"
              >
                {t.pwa_install ?? 'Install'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 bg-dark-700 text-dark-300 text-sm rounded-lg hover:bg-dark-600 transition"
              >
                {t.pwa_later ?? 'Later'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
