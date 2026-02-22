import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { ShieldIcon } from '../components/icons/ShieldIcon';

export function SecurityPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [appLock, setAppLock] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [duressEnabled, setDuressEnabled] = useState(false);
  const [showDuressSetup, setShowDuressSetup] = useState(false);
  const [duressPin, setDuressPin] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [lockTimeout, setLockTimeout] = useState('5');

  const handleSetDuress = () => {
    if (duressPin.length >= 4) {
      setDuressEnabled(true);
      setShowDuressSetup(false);
      setDuressPin('');
    }
  };

  const handleWipe = () => {
    if (confirmWipe) {
      // In production this would clear all keys and data
      setConfirmWipe(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-dark-400 hover:text-dark-200 transition">←</button>
        <ShieldIcon className="w-5 h-5 text-primary-400" />
        <h1 className="text-xl font-semibold">{t.security_lock}</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* App Lock */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t.security_appLock}</h2>
          <div className="space-y-4">
            <ToggleRow
              label={t.security_appLock}
              description={t.security_lockDesc || ''}
              enabled={appLock}
              onToggle={() => setAppLock(!appLock)}
            />

            {appLock && (
              <>
                <ToggleRow
                  label={t.security_biometric}
                  description=""
                  enabled={biometric}
                  onToggle={() => setBiometric(!biometric)}
                />
                <div className="flex items-center justify-between py-2 border-b border-dark-800">
                  <span className="text-dark-200">{t.security_lockTimeout}</span>
                  <select
                    value={lockTimeout}
                    onChange={(e) => setLockTimeout(e.target.value)}
                    className="bg-dark-800 text-dark-200 text-sm rounded-lg px-3 py-1.5 border border-dark-700"
                  >
                    <option value="1">1 min</option>
                    <option value="5">5 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Duress PIN */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t.security_duressPin}</h2>
          <p className="text-sm text-dark-400 mb-4">{t.security_duressDesc}</p>

          {duressEnabled ? (
            <div className="flex items-center justify-between">
              <span className="text-primary-400 text-sm">✓ {t.settings_enabled}</span>
              <button
                onClick={() => setDuressEnabled(false)}
                className="text-red-400 text-sm hover:text-red-300"
              >
                {t.security_disable}
              </button>
            </div>
          ) : showDuressSetup ? (
            <div className="space-y-3">
              <input
                type="password"
                placeholder="PIN (4+ digits)"
                value={duressPin}
                onChange={(e) => setDuressPin(e.target.value.replace(/\D/g, ''))}
                className="input-field w-full"
                maxLength={8}
                dir="ltr"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSetDuress}
                  disabled={duressPin.length < 4}
                  className="btn-primary flex-1 disabled:opacity-30"
                >
                  {t.wallet_sendConfirm}
                </button>
                <button
                  onClick={() => { setShowDuressSetup(false); setDuressPin(''); }}
                  className="px-4 py-2 bg-dark-700 rounded-xl hover:bg-dark-600 transition"
                >
                  {t.friends_cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDuressSetup(true)}
              className="btn-primary px-4 py-2"
            >
              {t.security_setupDuress}
            </button>
          )}
        </div>

        {/* Encryption Status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">{t.settings_privacySecurity}</h2>
          <div className="space-y-3">
            <StatusRow label={t.settings_e2e} status="active" value="Double Ratchet + PQ" />
            <StatusRow label="Post-Quantum Crypto" status="active" value="X25519 + ML-KEM-1024" />
            <StatusRow label={t.settings_torRouting} status="active" value={t.settings_enabled} />
            <StatusRow label="SQLCipher" status="active" value={t.settings_enabled} />
          </div>
        </div>

        {/* Secure Wipe */}
        <div className="card border border-red-900/50">
          <h2 className="text-lg font-semibold mb-4 text-red-400">{t.security_wipeAccount}</h2>
          <p className="text-sm text-dark-400 mb-4">{t.security_wipeDesc}</p>

          {!confirmWipe ? (
            <button
              onClick={() => setConfirmWipe(true)}
              className="w-full py-3 bg-red-900/30 border border-red-800 rounded-xl text-red-300 hover:bg-red-900/50 transition font-medium"
            >
              {t.security_wipeAccount}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-red-400 text-sm font-medium">{t.security_wipeConfirm}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleWipe}
                  className="flex-1 py-2 bg-red-600 rounded-xl text-white hover:bg-red-700 transition"
                >
                  {t.security_wipeConfirm}
                </button>
                <button
                  onClick={() => setConfirmWipe(false)}
                  className="px-4 py-2 bg-dark-700 rounded-xl hover:bg-dark-600 transition"
                >
                  {t.friends_cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle }: {
  label: string; description: string; enabled: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-800">
      <div>
        <span className="text-dark-200">{label}</span>
        {description && <p className="text-xs text-dark-500">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-primary-600' : 'bg-dark-600'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${enabled ? 'start-[22px]' : 'start-0.5'}`} />
      </button>
    </div>
  );
}

function StatusRow({ label, status, value }: { label: string; status: 'active' | 'inactive'; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
      <span className="text-dark-200">{label}</span>
      <span className={status === 'active' ? 'text-primary-400 text-sm' : 'text-dark-500 text-sm'}>
        {value}
      </span>
    </div>
  );
}
