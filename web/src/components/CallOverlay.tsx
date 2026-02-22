import { useEffect, useState } from 'react';
import { useCallStore } from '../lib/store/callStore';
import { useTranslation } from '../lib/i18n';
import { ShieldIcon } from './icons/ShieldIcon';

export function CallOverlay() {
  const activeCall = useCallStore((s) => s.activeCall);
  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const audioEnabled = useCallStore((s) => s.audioEnabled);
  const videoEnabled = useCallStore((s) => s.videoEnabled);
  const speakerOn = useCallStore((s) => s.speakerOn);
  const { hangup, toggleAudio, toggleVideo, toggleSpeaker, switchCamera, enableVideo } = useCallStore();
  const { t } = useTranslation();

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';
  const participant = activeCall.participants[0];

  return (
    <div className="fixed inset-0 z-50 bg-dark-950/95 flex flex-col">
      {/* Call Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldIcon className="w-4 h-4 text-primary-400" />
          <span className="text-xs text-primary-400">{t.call_encryptedE2E}</span>
        </div>
        <CallState state={activeCall.state} />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {isVideo ? (
          <VideoCallView
            localStream={localStream}
            remoteStream={remoteStream}
            participant={participant}
          />
        ) : (
          <VoiceCallView
            participant={participant}
            state={activeCall.state}
            duration={activeCall.duration}
          />
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <CallButton
            icon={audioEnabled ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
            label={audioEnabled ? t.call_mute : t.call_unmute}
            active={!audioEnabled}
            onClick={toggleAudio}
          />

          {/* Video toggle */}
          {isVideo && (
            <CallButton
              icon={videoEnabled ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
              label={videoEnabled ? t.call_stopCamera : t.call_startCamera}
              active={!videoEnabled}
              onClick={toggleVideo}
            />
          )}

          {/* Switch camera (video only) */}
          {isVideo && videoEnabled && (
            <CallButton
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              label={t.call_switchCamera}
              onClick={switchCamera}
            />
          )}

          {/* Upgrade to video (voice call only) */}
          {!isVideo && (
            <CallButton
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              label={t.call_enableVideo}
              onClick={enableVideo}
            />
          )}

          {/* Speaker */}
          <CallButton
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            }
            label={speakerOn ? t.call_speaker : t.call_earpiece}
            active={!speakerOn}
            onClick={toggleSpeaker}
          />

          {/* Hangup */}
          <button
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
            title={t.call_endCall}
            onClick={hangup}
          >
            <svg className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Incoming Call Dialog ───

export function IncomingCallDialog() {
  const showIncoming = useCallStore((s) => s.showIncomingCall);
  const incomingFrom = useCallStore((s) => s.incomingCallFrom);
  const incomingType = useCallStore((s) => s.incomingCallType);
  const { acceptCall, rejectCall } = useCallStore();
  const { t } = useTranslation();

  if (!showIncoming) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-950/90 flex items-center justify-center">
      <div className="bg-dark-900 border border-dark-700 rounded-3xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 animate-pulse">
          {incomingFrom[0]?.toUpperCase() || '?'}
        </div>

        <h2 className="text-xl font-semibold text-white mb-1">{incomingFrom}</h2>
        <p className="text-dark-400 mb-2">
          {incomingType === 'video' ? t.call_incomingVideo : t.call_incomingVoice}
        </p>

        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldIcon className="w-3 h-3 text-primary-400" />
          <span className="text-xs text-primary-400">{t.call_encrypted}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all"
            title={t.call_reject}
            onClick={rejectCall}
          >
            <svg className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>

          <button
            className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-all animate-bounce"
            title={t.call_accept}
            onClick={acceptCall}
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Voice Call View ───

function VoiceCallView({
  participant,
  state,
  duration,
}: {
  participant?: { displayName: string; audioEnabled: boolean; speaking: boolean };
  state: string;
  duration: number;
}) {
  const [dots, setDots] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (state === 'ringing' || state === 'connecting') {
      const interval = setInterval(() => {
        setDots((d) => (d.length >= 3 ? '' : d + '.'));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Avatar */}
      <div className={`w-32 h-32 rounded-full bg-primary-600 flex items-center justify-center text-5xl font-bold text-white
        ${state === 'ringing' ? 'animate-pulse' : ''}
        ${participant?.speaking ? 'ring-4 ring-primary-400 ring-opacity-50' : ''}`}>
        {participant?.displayName[0]?.toUpperCase() || '?'}
      </div>

      <h2 className="text-2xl font-semibold text-white">
        {participant?.displayName || t.chat_user}
      </h2>

      <p className="text-dark-400">
        {state === 'ringing' && `${t.call_ringing}${dots}`}
        {state === 'connecting' && `${t.call_connecting}${dots}`}
        {state === 'connected' && formatCallDuration(duration)}
        {state === 'reconnecting' && t.call_reconnecting}
        {state === 'ended' && t.call_ended}
        {state === 'failed' && t.call_failed}
      </p>

      {participant && !participant.audioEnabled && (
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          <span>🔇</span>
          <span>{participant.displayName} {t.call_mutedMic}</span>
        </div>
      )}
    </div>
  );
}

// ─── Video Call View ───

function VideoCallView({
  localStream,
  remoteStream,
  participant,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  participant?: { displayName: string };
}) {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full relative">
      {/* Remote Video (full screen) */}
      {remoteStream ? (
        <video
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          ref={(el) => {
            if (el) el.srcObject = remoteStream;
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-primary-600 flex items-center justify-center text-5xl font-bold text-white animate-pulse">
              {participant?.displayName[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-dark-400">{t.call_waitingVideo}</p>
          </div>
        </div>
      )}

      {/* Local Video (picture-in-picture) */}
      {localStream && (
        <div className="absolute bottom-24 left-4 w-40 h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-dark-700">
          <video
            className="w-full h-full object-cover mirror"
            autoPlay
            playsInline
            muted
            ref={(el) => {
              if (el) el.srcObject = localStream;
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───

function CallButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all
          ${active ? 'bg-white text-dark-900' : 'bg-dark-800 text-white hover:bg-dark-700'}`}
        title={label}
        onClick={onClick}
      >
        {icon}
      </button>
      <span className="text-[10px] text-dark-500">{label}</span>
    </div>
  );
}

function CallState({ state }: { state: string }) {
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    ringing: 'text-yellow-400',
    connecting: 'text-yellow-400',
    connected: 'text-green-400',
    reconnecting: 'text-orange-400',
    ended: 'text-dark-500',
    failed: 'text-red-400',
  };

  const labels: Record<string, string> = {
    ringing: t.call_ringing,
    connecting: t.call_connecting,
    connected: t.call_connected,
    reconnecting: t.call_reconnecting,
    ended: t.call_ended,
    failed: t.call_failed,
  };

  return (
    <div className={`flex items-center gap-1.5 text-xs ${colors[state] || 'text-dark-400'}`}>
      {state === 'connected' && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      <span>{labels[state] || state}</span>
    </div>
  );
}

function formatCallDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
