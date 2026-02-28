/**
 * RustBridge — TypeScript interface to the Rust core library via iOS Native Module.
 *
 * Architecture:
 *   React Native (TS) → NativeModules.RustBridge → Swift → C FFI → Rust (libshieldmessenger.a)
 *
 * The Swift layer calls the C functions exported from ios.rs (sl_* prefix).
 * All cryptographic operations happen in Rust — no crypto in JS/TS.
 *
 * For development without the native library, all methods return mock data.
 */

import {NativeModules, Platform} from 'react-native';

// ─── Types ───

export interface Keypair {
  publicKey: string;  // base64
  privateKey: string; // base64
}

export interface EncryptedMessage {
  ciphertext: string; // base64
  nonce: string;      // base64
}

export interface SafetyNumber {
  number: string;     // 60-digit numeric string
  qrData: string;     // base64 encoded QR payload
}

export interface TorStatus {
  isConnected: boolean;
  circuitCount: number;
  onionAddress: string | null;
  bootstrapProgress: number; // 0-100
}

export interface HiddenServiceInfo {
  address: string;    // .onion address
  port: number;
}

// ─── Native Module Interface ───

interface RustBridgeNative {
  // Core
  init(): Promise<number>;
  getVersion(): Promise<string>;

  // Identity
  generateIdentityKeypair(): Promise<Keypair>;
  generateX25519Keypair(): Promise<Keypair>;
  deriveSharedSecret(ourPrivateKey: string, theirPublicKey: string): Promise<string>;

  // Encryption
  encrypt(plaintext: string, key: string): Promise<EncryptedMessage>;
  decrypt(ciphertext: string, nonce: string, key: string): Promise<string>;

  // Signing
  sign(data: string, privateKey: string): Promise<string>;
  verify(data: string, signature: string, publicKey: string): Promise<boolean>;

  // Password
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;

  // Ratchet
  deriveRootKey(sharedSecret: string, info: string): Promise<string>;
  evolveChainKey(chainKey: string): Promise<string>;

  // Safety Numbers
  generateSafetyNumber(ourIdentity: string, theirIdentity: string): Promise<SafetyNumber>;
  verifySafetyNumber(ourIdentity: string, theirIdentity: string, number: string): Promise<boolean>;

  // Tor
  initializeTor(): Promise<string>;
  createHiddenService(servicePort: number, localPort: number): Promise<HiddenServiceInfo>;
  getOnionAddress(): Promise<string | null>;
  sendNewIdentity(): Promise<void>;

  // Messaging
  sendMessage(onionAddress: string, encryptedData: string): Promise<boolean>;
  pollIncomingMessages(): Promise<string | null>;

  // Duress
  setDuressPin(pin: string): Promise<boolean>;
  onDuressPin(): Promise<void>;
}

// ─── Mock Implementation (for development without native library) ───

const MockBridge: RustBridgeNative = {
  async init() { return 0; },
  async getVersion() { return '0.3.0-mock'; },

  async generateIdentityKeypair() {
    return {
      publicKey: 'MOCK_PUB_' + Math.random().toString(36).slice(2, 10),
      privateKey: 'MOCK_PRIV_' + Math.random().toString(36).slice(2, 10),
    };
  },
  async generateX25519Keypair() {
    return {
      publicKey: 'MOCK_X25519_PUB_' + Math.random().toString(36).slice(2, 10),
      privateKey: 'MOCK_X25519_PRIV_' + Math.random().toString(36).slice(2, 10),
    };
  },
  async deriveSharedSecret(_our, _their) { return 'MOCK_SHARED_SECRET'; },

  async encrypt(plaintext, _key) {
    return {
      ciphertext: plaintext, // base64 encoding deferred to native bridge
      nonce: 'MOCK_NONCE',
    };
  },
  async decrypt(_ct, _nonce, _key) { return 'Decrypted message (mock)'; },

  async sign(_data, _key) { return 'MOCK_SIGNATURE'; },
  async verify(_data, _sig, _key) { return true; },

  async hashPassword(_pw) { return 'MOCK_HASH'; },
  async verifyPassword(_pw, _hash) { return true; },

  async deriveRootKey(_ss, _info) { return 'MOCK_ROOT_KEY'; },
  async evolveChainKey(_ck) { return 'MOCK_CHAIN_KEY'; },

  async generateSafetyNumber(_our, _their) {
    return {
      number: '123456 789012 345678 901234 567890 123456 789012 345678 901234 567890',
      qrData: 'MOCK_QR_DATA',
    };
  },
  async verifySafetyNumber(_our, _their, _num) { return true; },

  async initializeTor() { return 'Tor initialized (mock)'; },
  async createHiddenService(port, _lp) {
    return {address: 'mock1234567890abcdef.onion', port};
  },
  async getOnionAddress() { return 'mock1234567890abcdef.onion'; },
  async sendNewIdentity() {},

  async sendMessage(_addr, _data) { return true; },
  async pollIncomingMessages() { return null; },

  async setDuressPin(_pin) { return true; },
  async onDuressPin() {},
};

// ─── Export ───

/**
 * The RustBridge module.
 * Uses the native implementation on iOS, falls back to mock on other platforms.
 */
const NativeBridge = NativeModules.RustBridge as RustBridgeNative | undefined;

const RustBridge: RustBridgeNative =
  Platform.OS === 'ios' && NativeBridge ? NativeBridge : MockBridge;

export default RustBridge;
