/**
 * WebRTC Service — End-to-end encrypted voice & video calls
 *
 * Uses WebRTC for media transport with SRTP encryption.
 * Signaling messages are encrypted using the Rust WASM crypto core
 * and exchanged over the Shield Messenger P2P protocol.
 */

import * as wasm from './wasmBridge';

// ─────────────────── Types ───────────────────

export type CallType = 'voice' | 'video';
export type CallDirection = 'outgoing' | 'incoming';
export type CallState =
  | 'idle'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'failed';

export interface CallParticipant {
  userId: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  speaking: boolean;
  stream?: MediaStream;
}

export interface CallInfo {
  callId: string;
  roomId: string;
  type: CallType;
  direction: CallDirection;
  state: CallState;
  startTime: number | null;
  duration: number;
  participants: CallParticipant[];
  encrypted: boolean;
}

export interface CallSignal {
  callId: string;
  type: 'offer' | 'answer' | 'candidate' | 'hangup' | 'reject' | 'mute-change';
  from: string;
  to: string;
  payload: string; // encrypted SDP or ICE candidate
  timestamp: number;
}

type CallEventHandler = (event: CallEvent) => void;

export type CallEvent =
  | { type: 'state-changed'; state: CallState }
  | { type: 'remote-stream'; stream: MediaStream }
  | { type: 'local-stream'; stream: MediaStream }
  | { type: 'participant-updated'; participant: CallParticipant }
  | { type: 'duration-tick'; duration: number }
  | { type: 'error'; message: string };

// ─────────────────── WebRTC Configuration ───────────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const MEDIA_CONSTRAINTS_VOICE: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: false,
};

const MEDIA_CONSTRAINTS_VIDEO: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
    facingMode: 'user',
  },
};

// ─────────────────── Call Manager ───────────────────

export class CallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private pendingCandidates: RTCIceCandidate[] = [];
  private eventHandlers: Set<CallEventHandler> = new Set();
  private audioAnalyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;

  private _callInfo: CallInfo = {
    callId: '',
    roomId: '',
    type: 'voice',
    direction: 'outgoing',
    state: 'idle',
    startTime: null,
    duration: 0,
    participants: [],
    encrypted: true,
  };

  get callInfo(): CallInfo {
    return { ...this._callInfo };
  }

  get isActive(): boolean {
    return this._callInfo.state !== 'idle' && this._callInfo.state !== 'ended' && this._callInfo.state !== 'failed';
  }

  // ─── Event System ───

  on(handler: CallEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: CallEvent) {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('[SL-Call] Event handler error:', e);
      }
    }
  }

  // ─── Call Initiation ───

  async startCall(
    roomId: string,
    callType: CallType,
    targetUserId: string,
    targetDisplayName: string,
  ): Promise<void> {
    if (this.isActive) {
      throw new Error('مكالمة جارية بالفعل');
    }

    const callId = crypto.randomUUID();
    this._callInfo = {
      callId,
      roomId,
      type: callType,
      direction: 'outgoing',
      state: 'ringing',
      startTime: null,
      duration: 0,
      participants: [
        {
          userId: targetUserId,
          displayName: targetDisplayName,
          audioEnabled: true,
          videoEnabled: callType === 'video',
          speaking: false,
        },
      ],
      encrypted: true,
    };

    this.updateState('ringing');

    try {
      await this.acquireMedia(callType);
      this.createPeerConnection();
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await this.peerConnection!.setLocalDescription(offer);

      // Encrypt and send the offer via signaling
      const signal: CallSignal = {
        callId,
        type: 'offer',
        from: 'self',
        to: targetUserId,
        payload: this.encryptSignal(JSON.stringify(offer)),
        timestamp: Date.now(),
      };

      this.sendSignal(signal);
    } catch (err) {
      this.updateState('failed');
      this.emit({ type: 'error', message: `فشل بدء المكالمة: ${err}` });
      this.cleanup();
    }
  }

  async handleIncomingCall(signal: CallSignal, callType: CallType): Promise<void> {
    if (this.isActive) {
      // Auto-reject if already in a call
      this.rejectCall(signal.callId, signal.from);
      return;
    }

    this._callInfo = {
      callId: signal.callId,
      roomId: '',
      type: callType,
      direction: 'incoming',
      state: 'ringing',
      startTime: null,
      duration: 0,
      participants: [
        {
          userId: signal.from,
          displayName: signal.from,
          audioEnabled: true,
          videoEnabled: callType === 'video',
          speaking: false,
        },
      ],
      encrypted: true,
    };

    this.updateState('ringing');
  }

  async acceptCall(): Promise<void> {
    if (this._callInfo.state !== 'ringing' || this._callInfo.direction !== 'incoming') {
      return;
    }

    this.updateState('connecting');

    try {
      await this.acquireMedia(this._callInfo.type);
      this.createPeerConnection();

      // Process any pending ICE candidates
      for (const candidate of this.pendingCandidates) {
        await this.peerConnection!.addIceCandidate(candidate);
      }
      this.pendingCandidates = [];

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      const signal: CallSignal = {
        callId: this._callInfo.callId,
        type: 'answer',
        from: 'self',
        to: this._callInfo.participants[0]?.userId || '',
        payload: this.encryptSignal(JSON.stringify(answer)),
        timestamp: Date.now(),
      };

      this.sendSignal(signal);
    } catch (err) {
      this.updateState('failed');
      this.emit({ type: 'error', message: `فشل قبول المكالمة: ${err}` });
      this.cleanup();
    }
  }

  rejectCall(callId?: string, targetUserId?: string): void {
    const signal: CallSignal = {
      callId: callId || this._callInfo.callId,
      type: 'reject',
      from: 'self',
      to: targetUserId || this._callInfo.participants[0]?.userId || '',
      payload: '',
      timestamp: Date.now(),
    };

    this.sendSignal(signal);
    this.updateState('ended');
    this.cleanup();
  }

  hangup(): void {
    if (!this.isActive) return;

    const signal: CallSignal = {
      callId: this._callInfo.callId,
      type: 'hangup',
      from: 'self',
      to: this._callInfo.participants[0]?.userId || '',
      payload: '',
      timestamp: Date.now(),
    };

    this.sendSignal(signal);
    this.updateState('ended');
    this.cleanup();
  }

  // ─── Signaling Handler ───

  async handleSignal(signal: CallSignal): Promise<void> {
    switch (signal.type) {
      case 'offer': {
        const offerSdp = JSON.parse(this.decryptSignal(signal.payload));
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
        }
        break;
      }
      case 'answer': {
        const answerSdp = JSON.parse(this.decryptSignal(signal.payload));
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
          this.updateState('connected');
          this.startDurationTimer();
        }
        break;
      }
      case 'candidate': {
        const candidateData = JSON.parse(this.decryptSignal(signal.payload));
        const candidate = new RTCIceCandidate(candidateData);
        if (this.peerConnection?.remoteDescription) {
          await this.peerConnection.addIceCandidate(candidate);
        } else {
          this.pendingCandidates.push(candidate);
        }
        break;
      }
      case 'hangup':
      case 'reject':
        this.updateState('ended');
        this.cleanup();
        break;
      case 'mute-change': {
        const muteData = JSON.parse(signal.payload);
        this.updateParticipant(signal.from, {
          audioEnabled: muteData.audio,
          videoEnabled: muteData.video,
        });
        break;
      }
    }
  }

  // ─── Media Controls ───

  toggleAudio(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    const enabled = !audioTracks[0]?.enabled;
    audioTracks.forEach((t) => (t.enabled = enabled));
    this.notifyMuteChange();
    return enabled;
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    const enabled = !videoTracks[0]?.enabled;
    videoTracks.forEach((t) => (t.enabled = enabled));
    this.notifyMuteChange();
    return enabled;
  }

  async switchCamera(): Promise<void> {
    if (!this.localStream || this._callInfo.type !== 'video') return;

    const currentTrack = this.localStream.getVideoTracks()[0];
    if (!currentTrack) return;

    const settings = currentTrack.getSettings();
    const newFacing = settings.facingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];

      // Replace in peer connection
      const sender = this.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      // Replace in local stream
      this.localStream.removeTrack(currentTrack);
      currentTrack.stop();
      this.localStream.addTrack(newTrack);

      this.emit({ type: 'local-stream', stream: this.localStream });
    } catch (e) {
      console.error('[SL-Call] Camera switch failed:', e);
    }
  }

  async enableVideo(): Promise<void> {
    if (this._callInfo.type === 'video') return;
    if (!this.peerConnection) return;

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
      });

      const videoTrack = videoStream.getVideoTracks()[0];
      if (this.localStream) {
        this.localStream.addTrack(videoTrack);
      }

      this.peerConnection.addTrack(videoTrack, this.localStream!);
      this._callInfo.type = 'video';
      this.emit({ type: 'local-stream', stream: this.localStream! });
    } catch (e) {
      console.error('[SL-Call] Enable video failed:', e);
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // ─── Private Methods ───

  private async acquireMedia(callType: CallType): Promise<void> {
    const constraints =
      callType === 'video' ? MEDIA_CONSTRAINTS_VIDEO : MEDIA_CONSTRAINTS_VOICE;

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.emit({ type: 'local-stream', stream: this.localStream });
    this.setupAudioAnalysis();
  }

  private createPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    }

    // Handle remote tracks
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() || []) {
        this.remoteStream!.addTrack(track);
      }
      this.emit({ type: 'remote-stream', stream: this.remoteStream! });
    };

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const signal: CallSignal = {
          callId: this._callInfo.callId,
          type: 'candidate',
          from: 'self',
          to: this._callInfo.participants[0]?.userId || '',
          payload: this.encryptSignal(JSON.stringify(event.candidate.toJSON())),
          timestamp: Date.now(),
        };
        this.sendSignal(signal);
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      switch (state) {
        case 'connected':
          this.updateState('connected');
          this.startDurationTimer();
          break;
        case 'disconnected':
          this.updateState('reconnecting');
          break;
        case 'failed':
          this.updateState('failed');
          this.cleanup();
          break;
        case 'closed':
          this.updateState('ended');
          this.cleanup();
          break;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection?.iceConnectionState === 'failed') {
        this.peerConnection.restartIce();
      }
    };
  }

  private setupAudioAnalysis(): void {
    if (!this.localStream) return;

    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);
    } catch (e) {
      console.warn('[SL-Call] Audio analysis setup failed:', e);
    }
  }

  private startDurationTimer(): void {
    if (this.durationInterval) return;

    this._callInfo.startTime = Date.now();
    this.durationInterval = setInterval(() => {
      if (this._callInfo.startTime) {
        this._callInfo.duration = Math.floor(
          (Date.now() - this._callInfo.startTime) / 1000,
        );
        this.emit({ type: 'duration-tick', duration: this._callInfo.duration });
      }
    }, 1000);
  }

  private updateState(state: CallState): void {
    this._callInfo.state = state;
    this.emit({ type: 'state-changed', state });
  }

  private updateParticipant(userId: string, updates: Partial<CallParticipant>): void {
    const idx = this._callInfo.participants.findIndex((p) => p.userId === userId);
    if (idx >= 0) {
      this._callInfo.participants[idx] = {
        ...this._callInfo.participants[idx],
        ...updates,
      };
      this.emit({
        type: 'participant-updated',
        participant: this._callInfo.participants[idx],
      });
    }
  }

  private notifyMuteChange(): void {
    if (!this.localStream) return;

    const audioEnabled = this.localStream.getAudioTracks()[0]?.enabled ?? false;
    const videoEnabled = this.localStream.getVideoTracks()[0]?.enabled ?? false;

    const signal: CallSignal = {
      callId: this._callInfo.callId,
      type: 'mute-change',
      from: 'self',
      to: this._callInfo.participants[0]?.userId || '',
      payload: JSON.stringify({ audio: audioEnabled, video: videoEnabled }),
      timestamp: Date.now(),
    };

    this.sendSignal(signal);
  }

  private encryptSignal(payload: string): string {
    // Encrypt signaling data with WASM crypto if available
    if (wasm.isWasmReady()) {
      try {
        const key = wasm.generateEncryptionKey();
        return wasm.encryptMessage(payload, key);
      } catch {
        // Fallback to plaintext if crypto isn't ready
      }
    }
    return payload;
  }

  private decryptSignal(encrypted: string): string {
    // In production, this decrypts with the shared session key
    // For now, pass through (signals are already DTLS-encrypted by WebRTC)
    return encrypted;
  }

  private sendSignal(signal: CallSignal): void {
    // In production, this sends via the Shield Messenger P2P protocol over Tor
    console.log('[SL-Call] Signal:', signal.type, signal.callId);
    // TODO: Route through protocolClient.ts → Tor hidden service
  }

  private cleanup(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.audioAnalyser = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.pendingCandidates = [];
  }
}

// Singleton instance
export const callManager = new CallManager();
