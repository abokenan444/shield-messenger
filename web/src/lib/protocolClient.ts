/**
 * Secure Legion Protocol Client
 *
 * Provides messaging functionality through the Rust WASM core.
 * All encryption, signing, and P2P networking is handled by the Rust core —
 * this module exposes a TypeScript-friendly API for the UI layer.
 */

// TODO: Import from compiled WASM package once build pipeline is ready
// import init, { generate_keypair, encrypt_message, decrypt_message, sign_message, verify_signature } from 'secure-legion-core';

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

/**
 * Initialize the Secure Legion protocol core (WASM).
 */
export async function initCore(): Promise<void> {
  if (initialized) return;
  // TODO: await init(); — initialize WASM module
  initialized = true;
}

/**
 * Create a new identity (keypair) and register locally.
 * No server interaction — identity is a cryptographic keypair.
 */
export async function createIdentity(
  displayName: string,
  _password: string,
): Promise<AuthResult> {
  await initCore();

  // TODO: Call Rust WASM core:
  // const keypairJson = generate_keypair();
  // const keypair = JSON.parse(keypairJson);
  // Store encrypted private key locally using password-derived key (Argon2id)

  const userId = `sl_${crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')}`;

  currentUserId = userId;
  currentPublicKey = ''; // TODO: from keypair

  return {
    userId,
    displayName,
    publicKey: currentPublicKey,
  };
}

/**
 * Restore an existing identity from encrypted local storage.
 */
export async function restoreIdentity(
  _password: string,
): Promise<AuthResult | null> {
  await initCore();

  // TODO: Load encrypted keypair from IndexedDB, decrypt with password-derived key
  // If no stored identity, return null

  return null;
}

/**
 * Login with existing identity using password to unlock the private key.
 */
export async function login(
  displayName: string,
  password: string,
): Promise<AuthResult> {
  await initCore();

  const restored = await restoreIdentity(password);
  if (restored) return restored;

  // If no identity exists, create a new one
  return createIdentity(displayName, password);
}

/**
 * Send an encrypted message to a peer.
 * Encryption and signing are handled by the Rust WASM core.
 */
export async function sendMessage(
  _conversationId: string,
  _body: string,
): Promise<string> {
  if (!currentUserId) throw new Error('Not authenticated');

  // TODO: Call Rust WASM core:
  // 1. Derive message key from shared secret + chain key evolution
  // 2. encrypt_message(body, messageKey)
  // 3. sign_message(ciphertext, privateKey)
  // 4. Send via Tor hidden service connection

  const messageId = crypto.randomUUID();
  return messageId;
}

/**
 * Get all conversations.
 */
export function getConversations(): { id: string; name: string; isDirect: boolean }[] {
  // TODO: Load from encrypted local storage
  return [];
}

/**
 * Create a new direct conversation with a peer by their public key.
 */
export async function createDirectConversation(_peerPublicKey: string): Promise<string> {
  if (!currentUserId) throw new Error('Not authenticated');

  // TODO: Call Rust WASM core:
  // 1. Perform X25519 + ML-KEM-1024 hybrid key exchange
  // 2. Establish Tor hidden service connection
  // 3. Store conversation locally

  const conversationId = crypto.randomUUID();
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

  // TODO: Establish group key exchange with all members

  const conversationId = crypto.randomUUID();
  return conversationId;
}

/**
 * Register a callback for incoming messages.
 */
export function onMessage(
  _callback: (conversationId: string, message: { id: string; senderId: string; content: string; timestamp: number }) => void,
): () => void {
  // TODO: Register listener on Rust WASM core's message event channel

  // Return unsubscribe function
  return () => {};
}

/**
 * Logout and clear session (private keys remain encrypted in storage).
 */
export async function logout(): Promise<void> {
  currentUserId = null;
  currentPublicKey = null;
  // TODO: Clear in-memory keys, close Tor connections
}

/**
 * Get current user ID.
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}
