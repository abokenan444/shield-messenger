import { useCallStore, type CallLogEntry } from '../lib/store/callStore';
import { useTranslation } from '../lib/i18n';
import { ShieldIcon } from '../components/icons/ShieldIcon';
import { Sidebar } from '../components/Sidebar';
import { useState } from 'react';

export function CallsPage() {
  const callLog = useCallStore((s) => s.callLog);
  const startCall = useCallStore((s) => s.startCall);
  const [filter, setFilter] = useState<'all' | 'missed' | 'voice' | 'video'>('all');
  const { t } = useTranslation();

  const filtered = callLog.filter((entry) => {
    if (filter === 'missed') return entry.missed;
    if (filter === 'voice') return entry.type === 'voice';
    if (filter === 'video') return entry.type === 'video';
    return true;
  });

  const handleCallBack = (entry: CallLogEntry) => {
    startCall(entry.roomId, entry.type, entry.userId, entry.displayName);
  };

  return (
    <div className="h-screen flex overflow-hidden pb-14 md:pb-0">
      <Sidebar isOpen onToggle={() => {}} />

      <div className="flex-1 flex flex-col bg-dark-950">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 bg-dark-900 border-b border-dark-800">
          <h1 className="text-xl font-semibold text-white mb-3">{t.calls_title}</h1>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'missed', 'voice', 'video'] as const).map((f) => (
              <button
                key={f}
                className={`px-4 py-1.5 rounded-full text-sm transition-all
                  ${filter === f ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' && t.calls_all}
                {f === 'missed' && t.calls_missed}
                {f === 'voice' && t.calls_voice}
                {f === 'video' && t.calls_video}
              </button>
            ))}
          </div>
        </div>

        {/* Coming soon notice */}
        <div className="px-4 md:px-6 py-3 bg-yellow-900/20 border-b border-yellow-800/30">
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <span>📱</span>
            <span>P2P encrypted calls are available on the native Android & iOS apps. Web calling coming soon.</span>
          </div>
        </div>

        {/* Call Log */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-dark-500">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p>{t.calls_noCalls}</p>
            </div>
          ) : (
            filtered.map((entry) => (
              <CallLogRow
                key={entry.id}
                entry={entry}
                onCallBack={() => handleCallBack(entry)}
              />
            ))
          )}
        </div>

        {/* Encryption notice */}
        <div className="px-6 py-3 bg-dark-900 border-t border-dark-800">
          <div className="flex items-center justify-center gap-2 text-xs text-primary-400/60">
            <ShieldIcon className="w-3 h-3" />
            <span>{t.calls_e2eNotice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallLogRow({
  entry,
  onCallBack,
}: {
  entry: CallLogEntry;
  onCallBack: () => void;
}) {
  const { t, locale } = useTranslation();

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 hover:bg-dark-900/50 transition border-b border-dark-800/30">
      {/* Avatar */}
      <div className="avatar">
        {entry.displayName[0]?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${entry.missed ? 'text-red-400' : 'text-white'}`}>
            {entry.displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-sm">
          {/* Direction icon */}
          <span className={entry.missed ? 'text-red-400' : entry.direction === 'incoming' ? 'text-green-400' : 'text-blue-400'}>
            {entry.missed ? '✕' : entry.direction === 'incoming' ? '↙' : '↗'}
          </span>

          {/* Type */}
          <span className="text-dark-500">
            {entry.type === 'video' ? '🎥' : '📞'}
          </span>

          {/* Time */}
          <span className="text-dark-500">{formatTime(entry.timestamp)}</span>

          {/* Duration */}
          {!entry.missed && entry.duration > 0 && (
            <span className="text-dark-500">• {formatDuration(entry.duration)}</span>
          )}

          {entry.missed && (
            <span className="text-red-400 text-xs">{t.calls_missedLabel}</span>
          )}
        </div>
      </div>

      {/* Call back button */}
      <button
        className="p-2.5 hover:bg-dark-800 rounded-xl transition text-primary-400"
        title={t.calls_callback}
        onClick={onCallBack}
      >
        {entry.type === 'video' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
