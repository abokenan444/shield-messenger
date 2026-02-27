/**
 * TorService — Manages Tor connection lifecycle for Shield Messenger iOS.
 *
 * Architecture:
 *   TorService (TS) → RustBridge (NativeModule) → Swift → C FFI → Rust TorManager
 *
 * The Rust core handles actual Tor bootstrapping via the `arti` crate.
 * This service manages state, reconnection logic, and exposes observables.
 */

import RustBridge, {TorStatus} from '../native/RustBridge';

export type TorConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

type TorListener = (state: TorConnectionState, status: TorStatus) => void;

class TorService {
  private state: TorConnectionState = 'disconnected';
  private listeners: Set<TorListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  private currentStatus: TorStatus = {
    isConnected: false,
    circuitCount: 0,
    onionAddress: null,
    bootstrapProgress: 0,
  };

  /**
   * Subscribe to Tor state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: TorListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.state, this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach(l => l(this.state, this.currentStatus));
  }

  private setState(newState: TorConnectionState) {
    this.state = newState;
    this.emit();
  }

  /**
   * Initialize and connect to the Tor network.
   */
  async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }

    this.setState('connecting');
    this.currentStatus.bootstrapProgress = 0;
    this.emit();

    try {
      // Initialize Rust core
      await RustBridge.init();

      // Start Tor
      const result = await RustBridge.initializeTor();
      console.log('[TorService] Tor initialized:', result);

      // Create hidden services
      const mainService = await RustBridge.createHiddenService(9150, 9150);
      console.log('[TorService] Main hidden service:', mainService.address);

      this.currentStatus = {
        isConnected: true,
        circuitCount: 3,
        onionAddress: mainService.address,
        bootstrapProgress: 100,
      };

      this.reconnectAttempts = 0;
      this.setState('connected');
    } catch (error) {
      console.error('[TorService] Connection failed:', error);
      this.currentStatus.isConnected = false;
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from Tor.
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.currentStatus = {
      isConnected: false,
      circuitCount: 0,
      onionAddress: null,
      bootstrapProgress: 0,
    };

    this.setState('disconnected');
  }

  /**
   * Request new Tor identity (new circuits).
   */
  async newIdentity(): Promise<void> {
    if (this.state !== 'connected') return;

    try {
      await RustBridge.sendNewIdentity();
      console.log('[TorService] New identity requested');
    } catch (error) {
      console.error('[TorService] New identity failed:', error);
    }
  }

  /**
   * Get current connection state.
   */
  getState(): TorConnectionState {
    return this.state;
  }

  /**
   * Get current status details.
   */
  getStatus(): TorStatus {
    return {...this.currentStatus};
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[TorService] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000);
    this.reconnectAttempts++;

    console.log(
      `[TorService] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Singleton instance
export const torService = new TorService();
export default torService;
