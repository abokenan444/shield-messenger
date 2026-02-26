import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldIcon } from './icons/ShieldIcon';
import { useTranslation } from '../lib/i18n';

interface IdentityKeyChangeBannerProps {
  contactId: string;
  contactName: string;
  /** Timestamp of when the key change was detected */
  detectedAt: number;
  /** Whether the user has dismissed this warning */
  dismissed: boolean;
  /** Callback when user dismisses the warning */
  onDismiss: () => void;
  /** Callback when user wants to re-verify the contact */
  onVerify: () => void;
}

/**
 * A prominent warning banner displayed at the top of a chat when the
 * peer's identity key has changed. Modeled after Signal's "Safety Number
 * has changed" banner — this is critical for MITM resistance.
 *
 * The banner offers two actions:
 * 1. Verify — navigate to the contact verification screen (QR / Safety Numbers)
 * 2. Dismiss — acknowledge the change (recorded but the contact trust level drops)
 */
export function IdentityKeyChangeBanner({
  contactName,
  detectedAt,
  dismissed,
  onDismiss,
  onVerify,
}: IdentityKeyChangeBannerProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  if (dismissed) return null;

  const timeAgo = formatTimeAgo(detectedAt, t.langCode);

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-yellow-600/50 bg-yellow-950/40 overflow-hidden animate-in slide-in-from-top">
      {/* Main warning */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 bg-yellow-500/20 rounded-full flex items-center justify-center mt-0.5">
          <span className="text-xl">⚠️</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-yellow-400">
            {t.identity_keyChanged ?? 'Security alert: Identity key changed'}
          </p>
          <p className="text-xs text-yellow-200/70 mt-1 leading-relaxed">
            {(t.identity_keyChangedDesc ?? 'The security key for {name} has changed. This could mean they reinstalled the app, or it could indicate a man-in-the-middle attack. Verify their identity before sharing sensitive information.').replace('{name}', contactName)}
          </p>
          <p className="text-[10px] text-dark-500 mt-1">
            {t.identity_detectedAt ?? 'Detected'}: {timeAgo}
          </p>
        </div>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-1.5 text-xs text-yellow-400/70 hover:text-yellow-400 transition border-t border-yellow-600/20 flex items-center justify-center gap-1"
      >
        {showDetails
          ? (t.identity_hideDetails ?? 'Hide details')
          : (t.identity_showDetails ?? 'What does this mean?')}
        <span className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {showDetails && (
        <div className="px-4 pb-3 text-xs text-dark-300 space-y-2 border-t border-yellow-600/20 pt-2">
          <p>{t.identity_explanation1 ?? 'Every Shield Messenger user has a unique cryptographic identity key. When you first connect with someone, their key is stored locally on your device.'}</p>
          <p>{t.identity_explanation2 ?? 'If this key changes, it usually means the person reinstalled the app or switched devices. However, it could also indicate that someone is trying to intercept your messages (man-in-the-middle attack).'}</p>
          <p className="font-medium text-yellow-400/90">{t.identity_explanation3 ?? 'To be safe, verify their identity using Safety Numbers — either by comparing numbers in person or scanning their QR code.'}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-3 pt-1">
        <button
          onClick={onVerify}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium text-white transition"
        >
          <ShieldIcon className="w-4 h-4" />
          {t.identity_verifyNow ?? 'Verify identity'}
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-lg text-sm text-dark-300 transition"
        >
          {t.identity_dismiss ?? 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

/**
 * Format a timestamp into a human-readable relative time string.
 */
function formatTimeAgo(timestamp: number, locale: string): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const isAr = locale === 'ar';

  if (minutes < 1) return isAr ? 'الآن' : 'just now';
  if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
  return isAr ? `منذ ${days} يوم` : `${days}d ago`;
}
