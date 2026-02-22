import { create } from 'zustand';
import {
  callManager,
  type CallInfo,
  type CallType,
  type CallState,
} from '../webrtcService';

export interface CallLogEntry {
  id: string;
  callId: string;
  roomId: string;
  userId: string;
  displayName: string;
  type: CallType;
  direction: 'outgoing' | 'incoming';
  duration: number;
  timestamp: number;
  missed: boolean;
}

interface CallStoreState {
  // Active call
  activeCall: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  speakerOn: boolean;
  showIncomingCall: boolean;
  incomingCallFrom: string;
  incomingCallType: CallType;

  // Call log
  callLog: CallLogEntry[];

  // Actions
  startCall: (roomId: string, type: CallType, userId: string, displayName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangup: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
  enableVideo: () => Promise<void>;

  // Internal
  _setActiveCall: (call: CallInfo | null) => void;
  _setLocalStream: (stream: MediaStream | null) => void;
  _setRemoteStream: (stream: MediaStream | null) => void;
  _updateState: (state: CallState) => void;
  _setIncomingCall: (from: string, type: CallType) => void;
  _addCallLog: (entry: CallLogEntry) => void;
}

export const useCallStore = create<CallStoreState>()((set, get) => {
  // Listen to call events
  callManager.on((event) => {
    switch (event.type) {
      case 'state-changed':
        get()._updateState(event.state);
        break;
      case 'local-stream':
        set({ localStream: event.stream });
        break;
      case 'remote-stream':
        set({ remoteStream: event.stream });
        break;
      case 'duration-tick':
        set((s) => ({
          activeCall: s.activeCall
            ? { ...s.activeCall, duration: event.duration }
            : null,
        }));
        break;
    }
  });

  return {
    activeCall: null,
    localStream: null,
    remoteStream: null,
    audioEnabled: true,
    videoEnabled: false,
    speakerOn: true,
    showIncomingCall: false,
    incomingCallFrom: '',
    incomingCallType: 'voice',
    callLog: [
      // Mock call history
      {
        id: '1',
        callId: 'call-001',
        roomId: 'conv-001',
        userId: 'sl_ahmed',
        displayName: 'أحمد محمد',
        type: 'voice',
        direction: 'incoming',
        duration: 180,
        timestamp: Date.now() - 3600000,
        missed: false,
      },
      {
        id: '2',
        callId: 'call-002',
        roomId: 'conv-003',
        userId: 'sl_sarah',
        displayName: 'سارة أحمد',
        type: 'video',
        direction: 'outgoing',
        duration: 420,
        timestamp: Date.now() - 7200000,
        missed: false,
      },
      {
        id: '3',
        callId: 'call-003',
        roomId: 'conv-001',
        userId: 'sl_ahmed',
        displayName: 'أحمد محمد',
        type: 'voice',
        direction: 'incoming',
        duration: 0,
        timestamp: Date.now() - 86400000,
        missed: true,
      },
    ],

    startCall: async (roomId, type, userId, displayName) => {
      try {
        await callManager.startCall(roomId, type, userId, displayName);
        set({
          activeCall: callManager.callInfo,
          videoEnabled: type === 'video',
          audioEnabled: true,
        });
      } catch (err) {
        console.error('[SL-Call] Start failed:', err);
      }
    },

    acceptCall: async () => {
      try {
        await callManager.acceptCall();
        set({
          showIncomingCall: false,
          activeCall: callManager.callInfo,
        });
      } catch (err) {
        console.error('[SL-Call] Accept failed:', err);
      }
    },

    rejectCall: () => {
      callManager.rejectCall();
      const state = get();
      if (state.activeCall) {
        state._addCallLog({
          id: crypto.randomUUID(),
          callId: state.activeCall.callId,
          roomId: state.activeCall.roomId,
          userId: state.activeCall.participants[0]?.userId || '',
          displayName: state.activeCall.participants[0]?.displayName || '',
          type: state.activeCall.type,
          direction: state.activeCall.direction,
          duration: 0,
          timestamp: Date.now(),
          missed: state.activeCall.direction === 'incoming',
        });
      }
      set({
        showIncomingCall: false,
        activeCall: null,
        localStream: null,
        remoteStream: null,
      });
    },

    hangup: () => {
      const state = get();
      if (state.activeCall) {
        state._addCallLog({
          id: crypto.randomUUID(),
          callId: state.activeCall.callId,
          roomId: state.activeCall.roomId,
          userId: state.activeCall.participants[0]?.userId || '',
          displayName: state.activeCall.participants[0]?.displayName || '',
          type: state.activeCall.type,
          direction: state.activeCall.direction,
          duration: state.activeCall.duration,
          timestamp: state.activeCall.startTime || Date.now(),
          missed: false,
        });
      }
      callManager.hangup();
      set({
        activeCall: null,
        localStream: null,
        remoteStream: null,
      });
    },

    toggleAudio: () => {
      const enabled = callManager.toggleAudio();
      set({ audioEnabled: enabled });
    },

    toggleVideo: () => {
      const enabled = callManager.toggleVideo();
      set({ videoEnabled: enabled });
    },

    toggleSpeaker: () => {
      set((s) => ({ speakerOn: !s.speakerOn }));
    },

    switchCamera: async () => {
      await callManager.switchCamera();
    },

    enableVideo: async () => {
      await callManager.enableVideo();
      set({ videoEnabled: true });
    },

    _setActiveCall: (call) => set({ activeCall: call }),
    _setLocalStream: (stream) => set({ localStream: stream }),
    _setRemoteStream: (stream) => set({ remoteStream: stream }),

    _updateState: (state) => {
      set((s) => {
        if (!s.activeCall) return s;
        const updated = { ...s.activeCall, state };
        if (state === 'ended' || state === 'failed') {
          return { activeCall: null, localStream: null, remoteStream: null };
        }
        return { activeCall: updated };
      });
    },

    _setIncomingCall: (from, type) => {
      set({
        showIncomingCall: true,
        incomingCallFrom: from,
        incomingCallType: type,
      });
    },

    _addCallLog: (entry) => {
      set((s) => ({
        callLog: [entry, ...s.callLog],
      }));
    },
  };
});
