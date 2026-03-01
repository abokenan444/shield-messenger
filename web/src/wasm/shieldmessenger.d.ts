/* tslint:disable */
/* eslint-disable */

/**
 * Create a contact card JSON from identity data
 * Returns JSON string of the ContactCard
 */
export function create_contact_card(public_key_b64: string, handle: string, onion_address: string, solana_address: string): string;

/**
 * Decrypt a message using XChaCha20-Poly1305
 * Returns plaintext string
 */
export function decrypt_message(ciphertext_b64: string, key_b64: string): string;

/**
 * Decrypt message with chain key evolution (atomic operation)
 * Returns JSON: { "plaintext": "...", "evolvedChainKey": "base64..." }
 */
export function decrypt_message_evolved(ciphertext_b64: string, chain_key_b64: string, expected_sequence: bigint): string;

/**
 * Derive Ed25519 public key from private key
 * Returns base64-encoded public key
 */
export function derive_ed25519_public_key(private_key_b64: string): string;

/**
 * Hash password with specific salt — returns base64-encoded 32-byte key
 * Used for deriving encryption keys from passwords
 */
export function derive_key_from_password(password: string, salt_b64: string): string;

/**
 * Derive root key from shared secret using HKDF-SHA256
 * Returns base64-encoded 32-byte root key
 */
export function derive_root_key(shared_secret_b64: string): string;

/**
 * Deserialize a message from wire protocol
 * Returns JSON string
 */
export function deserialize_message(data_b64: string): string;

/**
 * Detect if a contact's identity key has changed (possible MITM).
 * Returns JSON:
 *   { "result": "FirstSeen" }
 *   { "result": "Unchanged" }
 *   { "result": "Changed", "previousFingerprint": "...", "newFingerprint": "..." }
 */
export function detect_identity_key_change(our_identity_b64: string, stored_their_identity_b64: string, current_their_identity_b64: string): string;

/**
 * Encode a FingerprintQrPayload for display as a QR code.
 * Returns a string like "SM-VERIFY:1:<base64-identity>:<safety-number>"
 */
export function encode_fingerprint_qr(identity_key_b64: string, safety_number: string): string;

/**
 * Encrypt a message using XChaCha20-Poly1305
 * Returns base64-encoded ciphertext (nonce prepended)
 */
export function encrypt_message(plaintext: string, key_b64: string): string;

/**
 * Encrypt message with chain key evolution (atomic operation)
 * Returns JSON: { "ciphertext": "base64...", "evolvedChainKey": "base64..." }
 */
export function encrypt_message_evolved(plaintext: string, chain_key_b64: string, sequence: bigint): string;

/**
 * Evolve chain key forward (one-way, provides forward secrecy)
 * Returns base64-encoded new chain key
 */
export function evolve_chain_key(chain_key_b64: string): string;

/**
 * Generate a random 32-byte encryption key
 * Returns base64-encoded key
 */
export function generate_encryption_key(): string;

/**
 * Generate a hybrid post-quantum keypair (X25519 + ML-KEM-1024)
 * Returns JSON with base64-encoded keys
 */
export function generate_hybrid_keypair(): string;

/**
 * Generate an Ed25519 identity keypair
 * Returns JSON: { "publicKey": "base64...", "privateKey": "base64..." }
 */
export function generate_identity_keypair(): string;

/**
 * Generate a 60-digit safety number from two identity public keys.
 * Returns a string of 12 groups of 5 digits separated by spaces.
 */
export function generate_safety_number(our_identity_b64: string, their_identity_b64: string): string;

/**
 * Generate a random 16-byte salt — returns base64-encoded
 */
export function generate_salt(): string;

/**
 * Generate an X25519 key exchange keypair
 * Returns JSON: { "publicKey": "base64...", "privateKey": "base64..." }
 */
export function generate_x25519_keypair(): string;

/**
 * Get library version
 */
export function get_version(): string;

/**
 * Hash a password using Argon2id — returns PHC-format hash string
 */
export function hash_password(password: string): string;

/**
 * Hybrid decapsulate — recover shared secret from ciphertext
 * Returns base64-encoded 64-byte shared secret
 */
export function hybrid_decapsulate(x25519_ephemeral_public_b64: string, kyber_ciphertext_b64: string, our_x25519_secret_b64: string, our_kyber_secret_b64: string): string;

/**
 * Hybrid encapsulate — generate shared secret for a recipient
 * Returns JSON: { "x25519EphemeralPublic", "kyberCiphertext", "sharedSecret" }
 */
export function hybrid_encapsulate(recipient_x25519_public_b64: string, recipient_kyber_public_b64: string): string;

/**
 * Serialize a message for the wire protocol
 * Returns base64-encoded binary message
 */
export function serialize_message(message_json: string): string;

/**
 * Sign a contact card with Ed25519 private key
 * Returns base64-encoded signature
 */
export function sign_contact_card(card_json: string, private_key_b64: string): string;

/**
 * Sign data with Ed25519 private key
 * Returns base64-encoded 64-byte signature
 */
export function sign_message(message_b64: string, private_key_b64: string): string;

/**
 * Verify a scanned QR fingerprint against our identity key.
 * Returns JSON: { "status": "Verified" | "Mismatch" | "InvalidData" }
 */
export function verify_contact_fingerprint(our_identity_b64: string, scanned_qr_data: string): string;

/**
 * Verify a password against an Argon2id hash
 */
export function verify_password(password: string, hash: string): boolean;

/**
 * Verify a safety number against two identity keys.
 * Returns true if the safety number matches.
 */
export function verify_safety_number(our_identity_b64: string, their_identity_b64: string, safety_number: string): boolean;

/**
 * Verify an Ed25519 signature
 */
export function verify_signature(message_b64: string, signature_b64: string, public_key_b64: string): boolean;

/**
 * Initialize the WASM module — must be called once before any other function
 */
export function wasm_init(): void;

/**
 * Perform X25519 Diffie-Hellman key exchange
 * Returns base64-encoded 32-byte shared secret
 */
export function x25519_derive_shared_secret(our_private_key_b64: string, their_public_key_b64: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly create_contact_card: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly decrypt_message: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly decrypt_message_evolved: (a: number, b: number, c: number, d: number, e: number, f: bigint) => void;
    readonly derive_ed25519_public_key: (a: number, b: number, c: number) => void;
    readonly derive_key_from_password: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly derive_root_key: (a: number, b: number, c: number) => void;
    readonly deserialize_message: (a: number, b: number, c: number) => void;
    readonly detect_identity_key_change: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly encode_fingerprint_qr: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly encrypt_message: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly encrypt_message_evolved: (a: number, b: number, c: number, d: number, e: number, f: bigint) => void;
    readonly evolve_chain_key: (a: number, b: number, c: number) => void;
    readonly generate_encryption_key: (a: number) => void;
    readonly generate_hybrid_keypair: (a: number) => void;
    readonly generate_identity_keypair: (a: number) => void;
    readonly generate_safety_number: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly generate_salt: (a: number) => void;
    readonly generate_x25519_keypair: (a: number) => void;
    readonly get_version: (a: number) => void;
    readonly hash_password: (a: number, b: number, c: number) => void;
    readonly hybrid_decapsulate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly hybrid_encapsulate: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly serialize_message: (a: number, b: number, c: number) => void;
    readonly sign_contact_card: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly sign_message: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly verify_contact_fingerprint: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly verify_password: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly verify_safety_number: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly verify_signature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_init: () => void;
    readonly x25519_derive_shared_secret: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly __wbindgen_export: (a: number) => void;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export3: (a: number, b: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
