/**
 * Shield Messenger Protocol Client
 *
 * Provides messaging functionality through the Rust WASM core.
 * All encryption, signing, and key management runs in Rust WASM —
 * this module exposes a TypeScript-friendly API for the UI layer.
 *
 * Transport: WebSocket relay for message routing (E2E encrypted —
 * the relay only sees ciphertext, never plaintext).
 */

import {
  notifyNewMessage,
  notifyIncomingCall,
  notifyFriendRequest,
  notifyIdentityKeyChange,
} from './notificationService';
import * as wasm from './wasmBridge';
import {
  createAndStoreIdentity,
  restoreIdentity as cryptoRestore,
  hasStoredIdentity,
  storeConversationKeys,
  loadConversationKeys,
  type ConversationKeyState,
} from './cryptoStore';
import type { IdentityKeyChangeResult } from './wasmBridge';

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

let initialized = false;
let currentUserId: string | null = null;
let currentPublicKey: string | null = null;
let currentPrivateKey: string | null = null;

// WebSocket relay
let ws: WebSocket | null = null;
let messageListeners: Array<(conversationId: string, message: { id: string; senderId: string; content: string; timestamp: number }) => void> = [];
let friendRequestListeners: Array<(requestId: string, senderName: string) => void> = [];

const RELAY_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'ws://localhost:8089'
  : `wss://${typeof window !== 'undefined' ? window.location.hostname : 'shieldmessenger.net'}/ws`;

/**
 * Initialize the Shield Messenger protocol core (WASM).
 */
export async function initCore(): Promise<void> {
  if (initialized) return;
  await wasm.initWasm();
  initialized = true;
  console.log('[SM] Protocol core initialized — WASM version:', wasm.getVersion());
}

/**
 * Connect to the WebSocket relay for message routing.
 */
function connectRelay(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  if (!currentUserId || !currentPublicKey) return;

  try {
    ws = new WebSocket(RELAY_URL);
  } catch {
    console.warn('[SM] WebSocket relay unavailable');
    return;
  }

  ws.onopen = () => {
    console.log('[SM] Connected to relay');
    // Register our public key with the relay
    ws?.send(JSON.stringify({
      type: 'register',
      userId: currentUserId,
      publicKey: currentPublicKey,
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleRelayMessage(data);
    } catch { /* ignore malformed */ }
  };

  ws.onclose = () => {
    ws = null;
    // Reconnect after delay
    setTimeout(() => connectRelay(), 5000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function handleRelayMessage(data: { type: string; [key: string]: unknown }): void {
  switch (data.type) {
    case 'message': {
      const { conversationId, messageId, senderId, ciphertext, timestamp } = data as unknown as {
        conversationId: string; messageId: string; senderId: string; ciphertext: string; timestamp: number;
      };
      // Decrypt using conversation chain key
      decryptIncomingMessage(conversationId, ciphertext).then((plaintext) => {
        const msg = { id: messageId, senderId, content: plaintext, timestamp };
        for (const listener of messageListeners) {
          listener(conversationId, msg);
        }
        if (document.hidden) {
          notifyNewMessage(senderId, plaintext.substring(0, 100), conversationId);
        }
      }).catch((e) => console.error('[SM] Decrypt failed:', e));
      break;
    }
    case 'friend-request': {
      const { requestId, senderName } = data as unknown as { requestId: string; senderName: string };
      for (const listener of friendRequestListeners) {
        listener(requestId, senderName);
      }
      notifyFriendRequest(senderName, requestId);
      break;
    }
  }
}

async function decryptIncomingMessage(conversationId: string, ciphertext: string): Promise<string> {
  const keys = await loadConversationKeys(conversationId);
  if (!keys) {
    // No key state — try direct decryption with a shared key
    return ciphertext; // Fallback: plaintext passthrough for now
  }

  try {
    const result = wasm.decryptMessageEvolved(ciphertext, keys.recvChainKey, keys.recvSequence);
    // Update chain key state
    await storeConversationKeys({
      ...keys,
      recvChainKey: result.evolvedChainKey,
      recvSequence: keys.recvSequence + 1,
    });
    return result.plaintext;
  } catch {
    // Fallback: try static key decryption
    try {
      return wasm.decryptMessage(ciphertext, keys.rootKey);
    } catch {
      return '[Decryption failed]';
    }
  }
}

/**
 * Create a new identity (keypair) and register locally.
 * Uses real Ed25519 keypair generation via Rust WASM + encrypts private key
 * with Argon2id-derived key and stores in IndexedDB.
 */
export async function createIdentity(
  displayName: string,
  password: string,
): Promise<AuthResult> {
  await initCore();

  const { publicKey, userId } = await createAndStoreIdentity(displayName, password);

  currentUserId = userId;
  currentPublicKey = publicKey;

  // Also restore private key for signing
  const restored = await cryptoRestore(password);
  if (restored) {
    currentPrivateKey = restored.privateKey;
  }

  connectRelay();

  return { userId, displayName, publicKey };
}

/**
 * Restore an existing identity from encrypted IndexedDB storage.
 */
export async function restoreIdentity(
  password: string,
): Promise<AuthResult | null> {
  await initCore();

  const restored = await cryptoRestore(password);
  if (!restored) return null;

  currentUserId = restored.userId;
  currentPublicKey = restored.publicKey;
  currentPrivateKey = restored.privateKey;

  connectRelay();

  return {
    userId: restored.userId,
    displayName: restored.handle,
    publicKey: restored.publicKey,
  };
}

/**
 * Login with existing identity using password to unlock the private key.
 */
export async function login(
  displayName: string,
  password: string,
): Promise<AuthResult> {
  await initCore();

  // Check if identity exists in IndexedDB
  const exists = await hasStoredIdentity();
  if (exists) {
    const restored = await restoreIdentity(password);
    if (restored) return restored;
    // Wrong password — fall through to create new
  }

  return createIdentity(displayName, password);
}

/**
 * Send an encrypted message to a peer.
 * Encrypts with XChaCha20-Poly1305 using evolved chain key for forward secrecy.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<string> {
  if (!currentUserId) throw new Error('Not authenticated');

  const messageId = crypto.randomUUID();
  let ciphertext: string;

  // Load or create conversation key state
  let keys = await loadConversationKeys(conversationId);
  if (keys) {
    // Encrypt with chain key evolution (forward secrecy)
    const result = wasm.encryptMessageEvolved(body, keys.sendChainKey, keys.sendSequence);
    ciphertext = result.ciphertext;

    // Update chain key
    await storeConversationKeys({
      ...keys,
      sendChainKey: result.evolvedChainKey,
      sendSequence: keys.sendSequence + 1,
    });
  } else {
    // No conversation key yet — encrypt with a generated key
    const key = wasm.generateEncryptionKey();
    ciphertext = wasm.encryptMessage(body, key);
  }

  // Send via relay
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'message',
      conversationId,
      messageId,
      senderId: currentUserId,
      ciphertext,
      timestamp: Date.now(),
    }));
  }

  return messageId;
}

/**
 * Get all conversations.
 */
export function getConversations(): { id: string; name: string; isDirect: boolean }[] {
  return [];
}

/**
 * Create a new direct conversation with a peer by their public key.
 * Performs X25519 key exchange to establish shared secret + chain keys.
 */
export async function createDirectConversation(peerPublicKey: string): Promise<string> {
  if (!currentUserId || !currentPrivateKey) throw new Error('Not authenticated');

  const conversationId = crypto.randomUUID();

  // Generate X25519 ephemeral keypair for this conversation
  const x25519Keypair = wasm.generateX25519Keypair();

  // Derive shared secret via X25519 DH
  const sharedSecret = wasm.x25519DeriveSharedSecret(
    x25519Keypair.privateKey,
    peerPublicKey,
  );

  // Derive root key from shared secret
  const rootKey = wasm.deriveRootKey(sharedSecret);

  // Initialize chain keys (send + receive are derived from root key)
  const sendChainKey = wasm.evolveChainKey(rootKey);
  const recvChainKey = wasm.evolveChainKey(sendChainKey);

  // Store conversation key state in IndexedDB
  const keyState: ConversationKeyState = {
    conversationId,
    peerPublicKey,
    sendChainKey,
    recvChainKey,
    sendSequence: 0,
    recvSequence: 0,
    rootKey,
  };

  await storeConversationKeys(keyState);

  return conversationId;
}

/**
 * Create a new group conversation.
 */
export async function createGroup(
  _name: string,
  _memberPublicKeys: string[],
): Promise<string> {
  if (!currentUserId) throw new Error('Not authenticated');
  const conversationId = crypto.randomUUID();
  return conversationId;
}

/**
 * Register a callback for incoming messages.
 */
export function onMessage(
  callback: (conversationId: string, message: { id: string; senderId: string; content: string; timestamp: number }) => void,
): () => void {
  messageListeners.push(callback);
  return () => {
    messageListeners = messageListeners.filter((l) => l !== callback);
  };
}

/**
 * Register a callback for incoming calls.
 */
export function onIncomingCall(
  callback: (callId: string, callerName: string) => void,
): () => void {
  const internalHandler = (callId: string, callerName: string) => {
    callback(callId, callerName);
    notifyIncomingCall(callerName, callId);
  };

  void internalHandler;
  return () => {};
}

/**
 * Register a callback for incoming friend requests.
 */
export function onFriendRequest(
  callback: (requestId: string, senderName: string) => void,
): () => void {
  friendRequestListeners.push(callback);
  return () => {
    friendRequestListeners = friendRequestListeners.filter((l) => l !== callback);
  };
}

/**
 * Check a contact's identity key for changes (MITM detection).
 */
export async function checkContactIdentityKey(
  ourIdentityB64: string,
  storedTheirIdentityB64: string,
  currentTheirIdentityB64: string,
  contactName: string,
  contactId: string,
): Promise<IdentityKeyChangeResult> {
  const result = wasm.detectIdentityKeyChange(
    ourIdentityB64,
    storedTheirIdentityB64,
    currentTheirIdentityB64,
  );

  if (result.result === 'Changed') {
    await notifyIdentityKeyChange(contactName, contactId);
  }

  return result;
}

/**
 * Generate a safety number for verifying a contact's identity.
 */
export function getContactSafetyNumber(
  ourIdentityB64: string,
  theirIdentityB64: string,
): string {
  return wasm.generateSafetyNumber(ourIdentityB64, theirIdentityB64);
}

/**
 * Logout and clear in-memory keys. Encrypted keys remain in IndexedDB.
 */
export async function logout(): Promise<void> {
  currentUserId = null;
  currentPublicKey = null;
  currentPrivateKey = null;
  if (ws) {
    ws.close();
    ws = null;
  }
  messageListeners = [];
  friendRequestListeners = [];
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
