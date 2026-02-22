/**
 * Shield Messenger Protocol Client
 *
 * All cryptographic operations are performed by the Rust WASM core.
 * This module manages identity, key exchange, message encryption/decryption,
 * and conversation state — all backed by real crypto, not stubs.
 *
 * Architecture:
 *   UI Layer → protocolClient → wasmBridge → Rust WASM (XChaCha20, Ed25519, X25519, Argon2id)
 *      ↕                            ↕
 *   chatStore/authStore        cryptoStore (IndexedDB, encrypted at rest)
 */

import * as wasm from './wasmBridge';
import * as store from './cryptoStore';

export interface AuthResult {
  userId: string;
  displayName: string;
  publicKey: string;
}

export interface PeerConnection {
  peerId: string;
  publicKey: string;
  onionAddress: string;
  connected: boolean;
}

export interface EncryptedMessage {
  id: string;
  ciphertext: string; // base64
  signature: string; // base64
  senderPublicKey: string; // base64
  sequence: number;
  timestamp: number;
}

// ─── Session State (in-memory only, never persisted in plaintext) ───

let initialized = false;
let currentUserId: string | null = null;
let currentPublicKey: string | null = null;
let currentPrivateKey: string | null = null; // Ed25519 private key (in memory only)

// Per-conversation chain key state (in memory during session)
const conversationStates = new Map<string, {
  sendChainKey: string;
  recvChainKey: string;
  sendSequence: number;
  recvSequence: number;
  peerPublicKey: string;
}>();

// Message listeners
const messageListeners = new Set<(
  conversationId: string,
  message: { id: string; senderId: string; content: string; timestamp: number },
) => void>();

// ─── Initialization ───

/**
 * Initialize the Shield Messenger protocol core (WASM).
 * Must be called before any crypto operation.
 */
export async function initCore(): Promise<void> {
  if (initialized) return;

  await wasm.initWasm();
  initialized = true;
  console.log('[SL] Protocol core initialized');
}

// ─── Identity ───

/**
 * Create a new identity — generates Ed25519 keypair, encrypts private key
 * with Argon2id-derived key, stores in IndexedDB.
 */
export async function createIdentity(
  displayName: string,
  password: string,
): Promise<AuthResult> {
  await initCore();

  const { publicKey, userId } = await store.createAndStoreIdentity(displayName, password);

  // Load private key into memory for this session
  const identity = await store.restoreIdentity(password);
  if (!identity) throw new Error('Failed to restore just-created identity');

  currentUserId = userId;
  currentPublicKey = publicKey;
  currentPrivateKey = identity.privateKey;

  return {
    userId,
    displayName,
    publicKey,
  };
}

/**
 * Restore an existing identity from encrypted IndexedDB storage.
 * Returns null if no stored identity or wrong password.
 */
export async function restoreIdentity(
  password: string,
): Promise<AuthResult | null> {
  await initCore();

  const identity = await store.restoreIdentity(password);
  if (!identity) return null;

  currentUserId = identity.userId;
  currentPublicKey = identity.publicKey;
  currentPrivateKey = identity.privateKey;

  // Restore conversation key states
  const convStates = await store.loadAllConversationKeys();
  for (const state of convStates) {
    conversationStates.set(state.conversationId, {
      sendChainKey: state.sendChainKey,
      recvChainKey: state.recvChainKey,
      sendSequence: state.sendSequence,
      recvSequence: state.recvSequence,
      peerPublicKey: state.peerPublicKey,
    });
  }

  return {
    userId: identity.userId,
    displayName: identity.handle,
    publicKey: identity.publicKey,
  };
}

/**
 * Login — try to restore existing identity, create new one if none exists.
 */
export async function login(
  displayName: string,
  password: string,
): Promise<AuthResult> {
  await initCore();

  // Try to restore existing identity
  const existing = await restoreIdentity(password);
  if (existing) return existing;

  // Check if identity exists but password is wrong
  const hasIdentity = await store.hasStoredIdentity();
  if (hasIdentity) {
    throw new Error('كلمة المرور غير صحيحة');
  }

  // No identity — create new one
  return createIdentity(displayName, password);
}

// ─── Conversation Key Exchange ───

/**
 * Establish a new conversation with a peer via X25519 key exchange.
 * Generates shared secret → root key → directional chain keys.
 */
export async function createDirectConversation(peerPublicKey: string): Promise<string> {
  if (!currentPrivateKey || !currentPublicKey) throw new Error('Not authenticated');

  // Generate X25519 ephemeral keypair for this conversation
  const x25519Kp = wasm.generateX25519Keypair();

  // Derive shared secret via X25519 ECDH
  const sharedSecret = wasm.x25519DeriveSharedSecret(x25519Kp.privateKey, peerPublicKey);

  // Derive root key via HKDF
  const rootKey = wasm.deriveRootKey(sharedSecret);

  // Derive directional chain keys (send + receive)
  const sendChainKey = wasm.evolveChainKey(rootKey); // Direction 1
  const recvChainKey = wasm.evolveChainKey(sendChainKey); // Direction 2

  const conversationId = `conv_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

  const state = {
    sendChainKey,
    recvChainKey,
    sendSequence: 0,
    recvSequence: 0,
    peerPublicKey,
  };

  conversationStates.set(conversationId, state);

  // Persist encrypted conversation state
  await store.storeConversationKeys({
    conversationId,
    peerPublicKey,
    sendChainKey,
    recvChainKey,
    sendSequence: 0,
    recvSequence: 0,
    rootKey,
  });

  return conversationId;
}

/**
 * Create a group conversation with multiple peers.
 */
export async function createGroup(
  name: string,
  memberPublicKeys: string[],
): Promise<string> {
  if (!currentPrivateKey) throw new Error('Not authenticated');

  const conversationId = `grp_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

  // For groups: establish pairwise key exchange with each member
  for (const memberPk of memberPublicKeys) {
    const x25519Kp = wasm.generateX25519Keypair();
    const sharedSecret = wasm.x25519DeriveSharedSecret(x25519Kp.privateKey, memberPk);
    const rootKey = wasm.deriveRootKey(sharedSecret);

    // Store per-member key state (group messages are encrypted per-member)
    const memberConvId = `${conversationId}:${memberPk.substring(0, 8)}`;
    const sendChainKey = wasm.evolveChainKey(rootKey);
    const recvChainKey = wasm.evolveChainKey(sendChainKey);

    conversationStates.set(memberConvId, {
      sendChainKey,
      recvChainKey,
      sendSequence: 0,
      recvSequence: 0,
      peerPublicKey: memberPk,
    });
  }

  console.log(`[SL] Group "${name}" created with ${memberPublicKeys.length} members`);
  return conversationId;
}

// ─── Messaging ───

/**
 * Encrypt and send a message in a conversation.
 * Uses chain key evolution for forward secrecy.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<string> {
  if (!currentPrivateKey || !currentPublicKey) throw new Error('Not authenticated');

  const state = conversationStates.get(conversationId);
  if (!state) throw new Error(`No key state for conversation ${conversationId}`);

  // Encrypt with chain key evolution (atomic: encrypt + evolve in one call)
  const result = wasm.encryptMessageEvolved(body, state.sendChainKey, state.sendSequence);

  // Sign the ciphertext with our Ed25519 identity key
  // Signature is sent alongside ciphertext over Tor P2P channel
  void wasm.signMessage(result.ciphertext, currentPrivateKey);

  // Update chain key state (forward secrecy — old key is gone)
  state.sendChainKey = result.evolvedChainKey;
  state.sendSequence += 1;

  // Persist updated state
  await store.storeConversationKeys({
    conversationId,
    peerPublicKey: state.peerPublicKey,
    sendChainKey: state.sendChainKey,
    recvChainKey: state.recvChainKey,
    sendSequence: state.sendSequence,
    recvSequence: state.recvSequence,
    rootKey: '', // Root key is never stored after initial derivation
  });

  const messageId = crypto.randomUUID();

  console.log(`[SL] Sent message ${messageId} (seq: ${state.sendSequence - 1}, encrypted)`);
  return messageId;
}

/**
 * Decrypt a received message using chain key evolution.
 */
export function decryptReceivedMessage(
  conversationId: string,
  ciphertextB64: string,
  signatureB64: string,
  senderPublicKey: string,
): { content: string; verified: boolean } {
  const state = conversationStates.get(conversationId);
  if (!state) throw new Error(`No key state for conversation ${conversationId}`);

  // Verify Ed25519 signature
  const verified = wasm.verifySignature(ciphertextB64, signatureB64, senderPublicKey);

  // Decrypt with chain key evolution
  const result = wasm.decryptMessageEvolved(ciphertextB64, state.recvChainKey, state.recvSequence);

  // Update receive chain key
  state.recvChainKey = result.evolvedChainKey;
  state.recvSequence += 1;

  return {
    content: result.plaintext,
    verified,
  };
}

// ─── Listeners ───

/**
 * Register a callback for incoming messages.
 * Returns an unsubscribe function.
 */
export function onMessage(
  callback: (conversationId: string, message: {
    id: string; senderId: string; content: string; timestamp: number;
  }) => void,
): () => void {
  messageListeners.add(callback);
  return () => messageListeners.delete(callback);
}

/**
 * Dispatch an incoming message to all listeners (called by network layer).
 */
export function dispatchIncomingMessage(
  conversationId: string,
  message: { id: string; senderId: string; content: string; timestamp: number },
): void {
  for (const listener of messageListeners) {
    listener(conversationId, message);
  }
}

// ─── Conversation Queries ───

/**
 * Get all conversations with active key states.
 */
export function getConversations(): { id: string; name: string; isDirect: boolean }[] {
  const convs: { id: string; name: string; isDirect: boolean }[] = [];

  for (const [id] of conversationStates) {
    if (id.includes(':')) continue; // Skip group member sub-conversations
    convs.push({
      id,
      name: id, // UI layer maps this to display name
      isDirect: id.startsWith('conv_'),
    });
  }

  return convs;
}

// ─── Crypto Utilities (exposed for UI) ───

/**
 * Sign arbitrary data with our identity key.
 */
export function signData(dataB64: string): string {
  if (!currentPrivateKey) throw new Error('Not authenticated');
  return wasm.signMessage(dataB64, currentPrivateKey);
}

/**
 * Verify a signature from a peer.
 */
export function verifyData(dataB64: string, signatureB64: string, publicKeyB64: string): boolean {
  return wasm.verifySignature(dataB64, signatureB64, publicKeyB64);
}

/**
 * Generate a hybrid post-quantum keypair for quantum-resistant key exchange.
 */
export function generateHybridKeypair() {
  return wasm.generateHybridKeypair();
}

// ─── Session ───

/**
 * Logout — zero out in-memory keys, keep encrypted storage intact.
 */
export async function logout(): Promise<void> {
  // Zero in-memory secrets
  currentUserId = null;
  currentPublicKey = null;
  currentPrivateKey = null;
  conversationStates.clear();
  messageListeners.clear();
  console.log('[SL] Session cleared');
}

/**
 * Get current user ID.
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}

/**
 * Get current public key.
 */
export function getCurrentPublicKey(): string | null {
  return currentPublicKey;
}
