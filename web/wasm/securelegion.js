/**
 * Stub WASM module — placeholder until the real Rust core is compiled.
 *
 * Build the real module:
 *   cd shield-messenger-core
 *   cargo build --target wasm32-unknown-unknown --features wasm --release
 *   wasm-bindgen --out-dir ../web/wasm --target web \
 *     target/wasm32-unknown-unknown/release/securelegion.wasm
 */

const STUB_WARNING = '[SL] Using stub WASM module — crypto operations are NOT real. Build Rust core for production use.';

let warned = false;
function warnOnce() {
  if (!warned) { console.warn(STUB_WARNING); warned = true; }
}

// wasm-bindgen default export initializes the WASM binary
export default async function init() {
  warnOnce();
}

// Stub implementations — return plausible but NOT cryptographically secure values
function randomB64(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr));
}

function jsonStr(obj) { return JSON.stringify(obj); }

export function generate_identity_keypair() { warnOnce(); return jsonStr({ publicKey: randomB64(), privateKey: randomB64() }); }
export function derive_ed25519_public_key(_priv) { warnOnce(); return randomB64(); }
export function generate_x25519_keypair() { warnOnce(); return jsonStr({ publicKey: randomB64(), privateKey: randomB64() }); }
export function x25519_derive_shared_secret(_our, _their) { warnOnce(); return randomB64(); }
export function generate_encryption_key() { warnOnce(); return randomB64(); }
export function encrypt_message(plaintext, _key) { warnOnce(); return btoa(plaintext); }
export function decrypt_message(ct, _key) { warnOnce(); try { return atob(ct); } catch { return ct; } }
export function derive_root_key(_shared) { warnOnce(); return randomB64(); }
export function evolve_chain_key(_chain) { warnOnce(); return randomB64(); }
export function encrypt_message_evolved(plaintext, _chain, _seq) { warnOnce(); return jsonStr({ ciphertext: btoa(plaintext), evolvedChainKey: randomB64() }); }
export function decrypt_message_evolved(ct, _chain, _seq) { warnOnce(); try { return jsonStr({ plaintext: atob(ct), evolvedChainKey: randomB64() }); } catch { return jsonStr({ plaintext: ct, evolvedChainKey: randomB64() }); } }
export function sign_message(_msg, _priv) { warnOnce(); return randomB64(64); }
export function verify_signature(_msg, _sig, _pub) { warnOnce(); return true; }
export function hash_password(_pw) { warnOnce(); return '$argon2id$stub$' + randomB64(16); }
export function verify_password(_pw, _hash) { warnOnce(); return true; }
export function derive_key_from_password(_pw, _salt) { warnOnce(); return randomB64(); }
export function generate_salt() { warnOnce(); return randomB64(16); }
export function generate_hybrid_keypair() { warnOnce(); return jsonStr({ x25519PublicKey: randomB64(), x25519SecretKey: randomB64(), kyberPublicKey: randomB64(800), kyberSecretKey: randomB64(1600) }); }
export function hybrid_encapsulate(_x25519, _kyber) { warnOnce(); return jsonStr({ x25519EphemeralPublic: randomB64(), kyberCiphertext: randomB64(768), sharedSecret: randomB64() }); }
export function hybrid_decapsulate(_x25519, _kyber, _ourX, _ourK) { warnOnce(); return randomB64(); }
export function create_contact_card(pubKey, handle, onion, solana) { warnOnce(); return jsonStr({ publicKey: pubKey, handle, onion, solana }); }
export function sign_contact_card(card, _priv) { warnOnce(); return jsonStr({ card: JSON.parse(card), signature: randomB64(64) }); }
export function serialize_message(msgJson) { warnOnce(); return btoa(msgJson); }
export function deserialize_message(data) { warnOnce(); try { return atob(data); } catch { return data; } }
export function get_version() { return '0.0.0-stub'; }
