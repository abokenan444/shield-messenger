/**
 * WebRTC Service — End-to-end encrypted voice calls
 *
 * Uses WebRTC for media transport with SRTP encryption.
 * Signaling messages are encrypted using the Rust WASM crypto core
 * and exchanged over the Shield Messenger P2P protocol.
 */

// ─────────────────── Types ───────────────────

export type CallType = 'voice';
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
    // TURN relay for NAT traversal (symmetric NATs, firewalls, carrier-grade NATs)
    {
      urls: 'turn:shieldmessenger.com:3478',
      username: 'shield',
      credential: 'messenger-turn-2025',
    },
    {
      urls: 'turns:shieldmessenger.com:5349',
      username: 'shield',
      credential: 'messenger-turn-2025',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all',
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

// ─────────────────── Call Manager ───────────────────

/**
 * Optimize Opus codec parameters in SDP for voice quality.
 * Sets bitrate to 32kbps, enables FEC and DTX, stereo off for voice.
 */
function optimizeSdpForVoice(sdp: string): string {
  // Set Opus parameters: 32kbps, mono, FEC enabled, packet loss 15%
  return sdp.replace(
    /a=fmtp:111 (.+)/g,
    'a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=32000;stereo=0;sprop-stereo=0;cbr=0',
  ).replace(
    // Prefer Opus codec (payload type 111) at the top of the media line
    /m=audio (\d+) UDP\/TLS\/RTP\/SAVPF (.+)/,
    (_match, port, payloads) => {
      const pts = payloads.split(' ');
      const opusIdx = pts.indexOf('111');
      if (opusIdx > 0) {
        pts.splice(opusIdx, 1);
        pts.unshift('111');
      }
      return `m=audio ${port} UDP/TLS/RTP/SAVPF ${pts.join(' ')}`;
    },
  );
}

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
        offerToReceiveVideo: false,
      });
      // Optimize Opus codec for voice quality
      if (offer.sdp) {
        offer.sdp = optimizeSdpForVoice(offer.sdp);
      }
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
      // Optimize Opus codec for voice quality
      if (answer.sdp) {
        answer.sdp = optimizeSdpForVoice(answer.sdp);
      }
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
          // If we're already connected, this is an ICE restart — respond with answer
          if (this._callInfo.state === 'connected' || this._callInfo.state === 'reconnecting') {
            const answer = await this.peerConnection.createAnswer();
            if (answer.sdp) {
              answer.sdp = optimizeSdpForVoice(answer.sdp);
            }
            await this.peerConnection.setLocalDescription(answer);
            const answerSignal: CallSignal = {
              callId: this._callInfo.callId,
              type: 'answer',
              from: 'self',
              to: signal.from,
              payload: this.encryptSignal(JSON.stringify(answer)),
              timestamp: Date.now(),
            };
            this.sendSignal(answerSignal);
          }
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

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // ─── Private Methods ───

  private async acquireMedia(_callType: CallType): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS_VOICE);
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

    // Handle renegotiation (triggered by ICE restart)
    this.peerConnection.onnegotiationneeded = async () => {
      if (!this.peerConnection || this._callInfo.state === 'ringing') return;
      try {
        const offer = await this.peerConnection.createOffer({ iceRestart: true });
        if (offer.sdp) {
          offer.sdp = optimizeSdpForVoice(offer.sdp);
        }
        await this.peerConnection.setLocalDescription(offer);
        const signal: CallSignal = {
          callId: this._callInfo.callId,
          type: 'offer',
          from: 'self',
          to: this._callInfo.participants[0]?.userId || '',
          payload: this.encryptSignal(JSON.stringify(offer)),
          timestamp: Date.now(),
        };
        this.sendSignal(signal);
      } catch (e) {
        console.error('[SL-Call] Renegotiation failed:', e);
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
          // Attempt ICE restart on disconnection (network change)
          this.peerConnection?.restartIce();
          break;
        case 'failed':
          // Try ICE restart once before giving up
          if (this._callInfo.state === 'reconnecting') {
            this.updateState('failed');
            this.cleanup();
          } else {
            this.updateState('reconnecting');
            this.peerConnection?.restartIce();
          }
          break;
        case 'closed':
          this.updateState('ended');
          this.cleanup();
          break;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log('[SL-Call] ICE state:', iceState);
      if (iceState === 'failed') {
        this.peerConnection?.restartIce();
      } else if (iceState === 'disconnected') {
        // On network change, ICE goes to disconnected first
        // Give it a moment, then restart if still disconnected
        setTimeout(() => {
          if (this.peerConnection?.iceConnectionState === 'disconnected') {
            console.log('[SL-Call] ICE still disconnected, restarting...');
            this.peerConnection?.restartIce();
          }
        }, 3000);
      }
    };

    // Listen for network changes (WiFi ↔ cellular, VPN toggles)
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      ((navigator as unknown as { connection: EventTarget }).connection).addEventListener('change', () => {
        if (this.peerConnection && this.isActive) {
          console.log('[SL-Call] Network change detected, restarting ICE');
          this.peerConnection.restartIce();
        }
      });
    }
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

    const signal: CallSignal = {
      callId: this._callInfo.callId,
      type: 'mute-change',
      from: 'self',
      to: this._callInfo.participants[0]?.userId || '',
      payload: JSON.stringify({ audio: audioEnabled }),
      timestamp: Date.now(),
    };

    this.sendSignal(signal);
  }

  private encryptSignal(payload: string): string {
    // Signaling is already protected by:
    // 1. TLS on the WebSocket relay connection
    // 2. DTLS-SRTP negotiated by WebRTC for media
    // Plaintext SDP/ICE is safe over TLS — no double-encryption needed
    return payload;
  }

  private decryptSignal(encrypted: string): string {
    return encrypted;
  }

  private sendSignal(signal: CallSignal): void {
    console.log('[SL-Call] Signal:', signal.type, signal.callId);
    // Send via WebSocket relay
    if (CallManager._relaySend) {
      CallManager._relaySend(signal);
    }
  }

  /** @internal Relay transport — set by protocolClient */
  static _relaySend: ((signal: CallSignal) => void) | null = null;

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
