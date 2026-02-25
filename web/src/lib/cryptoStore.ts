/**
 * Encrypted Key Storage — IndexedDB-based secure key persistence
 *
 * Stores identity keys encrypted with a password-derived key (Argon2id).
 * Keys are never stored in plaintext — they are encrypted at rest using
 * XChaCha20-Poly1305 with a key derived from the user's password.
 *
 * Storage layout (IndexedDB "shield-messenger-keys"):
 *   identity: { salt, encryptedPrivateKey, publicKey, handle }
 *   conversations: { [id]: { peerPublicKey, chainKey, sequence } }
 */

import * as wasm from './wasmBridge';

const DB_NAME = 'shield-messenger-keys';
const DB_VERSION = 2;
const STORE_IDENTITY = 'identity';
const STORE_CONVERSATIONS = 'conversations';
const STORE_CONTACT_TRUST = 'contact_trust';

interface IdentityRecord {
  id: 'current';
  salt: string; // base64 salt for Argon2id
  encryptedPrivateKey: string; // base64 encrypted private key
  publicKey: string; // base64 public key (not secret)
  handle: string;
  createdAt: number;
}

export interface ConversationKeyState {
  conversationId: string;
  peerPublicKey: string; // base64
  sendChainKey: string; // base64 encrypted
  recvChainKey: string; // base64 encrypted
  sendSequence: number;
  recvSequence: number;
  rootKey: string; // base64 encrypted
}

/** Trust level mirrors Rust TrustLevel enum (0 = Untrusted, 1 = Encrypted, 2 = Verified) */
export type TrustLevelValue = 0 | 1 | 2;

export interface ContactTrustRecord {
  contactId: string;
  trustLevel: TrustLevelValue;
  verifiedAt: number;   // Unix-ms, 0 if never
  safetyNumber: string; // empty if never verified
}

// ─── Database Setup ───

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_IDENTITY)) {
        db.createObjectStore(STORE_IDENTITY, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'conversationId' });
      }
      if (!db.objectStoreNames.contains(STORE_CONTACT_TRUST)) {
        db.createObjectStore(STORE_CONTACT_TRUST, { keyPath: 'contactId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function dbPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// ─── Identity Management ───

/**
 * Create a new identity: generate Ed25519 keypair, encrypt private key
 * with password-derived key, store in IndexedDB.
 */
export async function createAndStoreIdentity(
  handle: string,
  password: string,
): Promise<{ publicKey: string; userId: string }> {
  const db = await openDB();

  // Generate Ed25519 identity keypair
  const keypair = wasm.generateIdentityKeypair();

  // Generate salt and derive encryption key from password
  const salt = wasm.generateSalt();
  const storageKey = wasm.deriveKeyFromPassword(password, salt);

  // Encrypt private key with password-derived key
  const encryptedPrivateKey = wasm.encryptMessage(keypair.privateKey, storageKey);

  // Derive userId from public key (first 16 chars of hex)
  const userId = `sl_${keypair.publicKey.substring(0, 16)}`;

  const record: IdentityRecord = {
    id: 'current',
    salt,
    encryptedPrivateKey,
    publicKey: keypair.publicKey,
    handle,
    createdAt: Date.now(),
  };

  await dbPut(db, STORE_IDENTITY, record);
  db.close();

  return { publicKey: keypair.publicKey, userId };
}

/**
 * Restore identity: load encrypted private key from IndexedDB,
 * decrypt with password, return identity info.
 */
export async function restoreIdentity(
  password: string,
): Promise<{ userId: string; publicKey: string; privateKey: string; handle: string } | null> {
  const db = await openDB();
  const record = await dbGet<IdentityRecord>(db, STORE_IDENTITY, 'current');
  db.close();

  if (!record) return null;

  // Derive storage key from password + stored salt
  const storageKey = wasm.deriveKeyFromPassword(password, record.salt);

  // Decrypt private key
  try {
    const privateKey = wasm.decryptMessage(record.encryptedPrivateKey, storageKey);
    const userId = `sl_${record.publicKey.substring(0, 16)}`;

    return {
      userId,
      publicKey: record.publicKey,
      privateKey,
      handle: record.handle,
    };
  } catch {
    // Wrong password — AEAD tag verification will fail
    return null;
  }
}

/**
 * Check if an identity exists in storage
 */
export async function hasStoredIdentity(): Promise<boolean> {
  const db = await openDB();
  const record = await dbGet<IdentityRecord>(db, STORE_IDENTITY, 'current');
  db.close();
  return !!record;
}

/**
 * Delete stored identity
 */
export async function deleteIdentity(): Promise<void> {
  const db = await openDB();
  await dbDelete(db, STORE_IDENTITY, 'current');
  db.close();
}

// ─── Conversation Key State ───

/**
 * Store conversation key state (encrypted chain keys)
 */
export async function storeConversationKeys(
  state: ConversationKeyState,
): Promise<void> {
  const db = await openDB();
  await dbPut(db, STORE_CONVERSATIONS, state);
  db.close();
}

/**
 * Load conversation key state
 */
export async function loadConversationKeys(
  conversationId: string,
): Promise<ConversationKeyState | null> {
  const db = await openDB();
  const state = await dbGet<ConversationKeyState>(db, STORE_CONVERSATIONS, conversationId);
  db.close();
  return state ?? null;
}

/**
 * Load all conversation key states
 */
export async function loadAllConversationKeys(): Promise<ConversationKeyState[]> {
  const db = await openDB();
  const states = await dbGetAll<ConversationKeyState>(db, STORE_CONVERSATIONS);
  db.close();
  return states;
}

/**
 * Delete conversation key state
 */
export async function deleteConversationKeys(conversationId: string): Promise<void> {
  const db = await openDB();
  await dbDelete(db, STORE_CONVERSATIONS, conversationId);
  db.close();
}

// ─── Contact Trust Level Persistence ───

/**
 * Save (insert or update) a contact's trust level record.
 * This is called after QR verification or when a new contact is added.
 */
export async function saveContactTrust(record: ContactTrustRecord): Promise<void> {
  const db = await openDB();
  await dbPut(db, STORE_CONTACT_TRUST, record);
  db.close();
}

/**
 * Load a contact's trust level record.
 * Returns null if no record exists (brand-new / Level 0).
 */
export async function loadContactTrust(contactId: string): Promise<ContactTrustRecord | null> {
  const db = await openDB();
  const record = await dbGet<ContactTrustRecord>(db, STORE_CONTACT_TRUST, contactId);
  db.close();
  return record ?? null;
}

/**
 * Load all stored contact trust records.
 */
export async function loadAllContactTrust(): Promise<ContactTrustRecord[]> {
  const db = await openDB();
  const records = await dbGetAll<ContactTrustRecord>(db, STORE_CONTACT_TRUST);
  db.close();
  return records;
}

/**
 * Delete a contact's trust record (e.g. when removing a contact).
 */
export async function deleteContactTrust(contactId: string): Promise<void> {
  const db = await openDB();
  await dbDelete(db, STORE_CONTACT_TRUST, contactId);
  db.close();
}

/**
 * Wipe all stored data (identity + conversations + trust records)
 */
export async function wipeAllData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
