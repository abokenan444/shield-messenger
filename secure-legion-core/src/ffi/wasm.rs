/// WASM bindings for the Shield Messenger web application
///
/// Exposes all cryptographic operations, key management, and protocol logic
/// to JavaScript/TypeScript via wasm-bindgen.
///
/// All encryption, signing, key exchange, and forward secrecy runs in Rust WASM —
/// zero JavaScript crypto.
///
/// Build:
///   cargo build --target wasm32-unknown-unknown --features wasm --release
///   wasm-bindgen --out-dir pkg --target web target/wasm32-unknown-unknown/release/securelegion.wasm

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use base64::Engine;

#[cfg(target_arch = "wasm32")]
use crate::crypto::{
    encryption, signing, key_exchange, hashing,
    pqc,
};

// ─────────────────────── Initialization ───────────────────────

/// Initialize the WASM module — must be called once before any other function
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn wasm_init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ─────────────────────── Identity (Ed25519) ───────────────────────

/// Generate an Ed25519 identity keypair
/// Returns JSON: { "publicKey": "base64...", "privateKey": "base64..." }
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_identity_keypair() -> Result<String, JsValue> {
    let (public_key, private_key) = signing::generate_keypair();

    let result = serde_json::json!({
        "publicKey": base64::engine::general_purpose::STANDARD.encode(public_key),
        "privateKey": base64::engine::general_purpose::STANDARD.encode(private_key),
    });

    Ok(result.to_string())
}

/// Derive Ed25519 public key from private key
/// Returns base64-encoded public key
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn derive_ed25519_public_key(private_key_b64: &str) -> Result<String, JsValue> {
    let private_key = base64::engine::general_purpose::STANDARD.decode(private_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let public_key = signing::derive_public_key(&private_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(public_key))
}

// ─────────────────────── Key Exchange (X25519) ───────────────────────

/// Generate an X25519 key exchange keypair
/// Returns JSON: { "publicKey": "base64...", "privateKey": "base64..." }
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_x25519_keypair() -> Result<String, JsValue> {
    let (public_key, private_key) = key_exchange::generate_static_keypair();

    let result = serde_json::json!({
        "publicKey": base64::engine::general_purpose::STANDARD.encode(public_key),
        "privateKey": base64::engine::general_purpose::STANDARD.encode(private_key),
    });

    Ok(result.to_string())
}

/// Perform X25519 Diffie-Hellman key exchange
/// Returns base64-encoded 32-byte shared secret
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn x25519_derive_shared_secret(
    our_private_key_b64: &str,
    their_public_key_b64: &str,
) -> Result<String, JsValue> {
    let our_priv = base64::engine::general_purpose::STANDARD.decode(our_private_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;
    let their_pub = base64::engine::general_purpose::STANDARD.decode(their_public_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let shared_secret = key_exchange::derive_shared_secret(&our_priv, &their_pub)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(shared_secret))
}

// ─────────────────────── Encryption (XChaCha20-Poly1305) ───────────────────────

/// Generate a random 32-byte encryption key
/// Returns base64-encoded key
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_encryption_key() -> String {
    let key = encryption::generate_key();
    base64::engine::general_purpose::STANDARD.encode(key)
}

/// Encrypt a message using XChaCha20-Poly1305
/// Returns base64-encoded ciphertext (nonce prepended)
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn encrypt_message(plaintext: &str, key_b64: &str) -> Result<String, JsValue> {
    let key = base64::engine::general_purpose::STANDARD.decode(key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 key: {}", e)))?;

    let ciphertext = encryption::encrypt_message(plaintext.as_bytes(), &key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(ciphertext))
}

/// Decrypt a message using XChaCha20-Poly1305
/// Returns plaintext string
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn decrypt_message(ciphertext_b64: &str, key_b64: &str) -> Result<String, JsValue> {
    let ciphertext = base64::engine::general_purpose::STANDARD.decode(ciphertext_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 ciphertext: {}", e)))?;
    let key = base64::engine::general_purpose::STANDARD.decode(key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 key: {}", e)))?;

    let plaintext = encryption::decrypt_message(&ciphertext, &key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    String::from_utf8(plaintext)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// ─────────────────────── Forward Secrecy (Chain Key Evolution) ───────────────────────

/// Derive root key from shared secret using HKDF-SHA256
/// Returns base64-encoded 32-byte root key
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn derive_root_key(shared_secret_b64: &str) -> Result<String, JsValue> {
    let shared_secret = base64::engine::general_purpose::STANDARD.decode(shared_secret_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let root_key = encryption::derive_root_key(&shared_secret, b"SecureLegion-RootKey-v1")
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(root_key))
}

/// Evolve chain key forward (one-way, provides forward secrecy)
/// Returns base64-encoded new chain key
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn evolve_chain_key(chain_key_b64: &str) -> Result<String, JsValue> {
    let key_bytes = base64::engine::general_purpose::STANDARD.decode(chain_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Chain key must be 32 bytes"));
    }

    let mut chain_key = [0u8; 32];
    chain_key.copy_from_slice(&key_bytes);

    let new_key = encryption::evolve_chain_key(&mut chain_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(new_key))
}

/// Encrypt message with chain key evolution (atomic operation)
/// Returns JSON: { "ciphertext": "base64...", "evolvedChainKey": "base64..." }
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn encrypt_message_evolved(
    plaintext: &str,
    chain_key_b64: &str,
    sequence: u64,
) -> Result<String, JsValue> {
    let key_bytes = base64::engine::general_purpose::STANDARD.decode(chain_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Chain key must be 32 bytes"));
    }

    let mut chain_key = [0u8; 32];
    chain_key.copy_from_slice(&key_bytes);

    let result = encryption::encrypt_message_with_evolution(plaintext.as_bytes(), &mut chain_key, sequence)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let json = serde_json::json!({
        "ciphertext": base64::engine::general_purpose::STANDARD.encode(&result.ciphertext),
        "evolvedChainKey": base64::engine::general_purpose::STANDARD.encode(result.evolved_chain_key),
    });

    Ok(json.to_string())
}

/// Decrypt message with chain key evolution (atomic operation)
/// Returns JSON: { "plaintext": "...", "evolvedChainKey": "base64..." }
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn decrypt_message_evolved(
    ciphertext_b64: &str,
    chain_key_b64: &str,
    expected_sequence: u64,
) -> Result<String, JsValue> {
    let ciphertext = base64::engine::general_purpose::STANDARD.decode(ciphertext_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;
    let key_bytes = base64::engine::general_purpose::STANDARD.decode(chain_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Chain key must be 32 bytes"));
    }

    let mut chain_key = [0u8; 32];
    chain_key.copy_from_slice(&key_bytes);

    let result = encryption::decrypt_message_with_evolution(&ciphertext, &mut chain_key, expected_sequence)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let plaintext = String::from_utf8(result.plaintext)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let json = serde_json::json!({
        "plaintext": plaintext,
        "evolvedChainKey": base64::engine::general_purpose::STANDARD.encode(result.evolved_chain_key),
    });

    Ok(json.to_string())
}

// ─────────────────────── Signing (Ed25519) ───────────────────────

/// Sign data with Ed25519 private key
/// Returns base64-encoded 64-byte signature
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn sign_message(message_b64: &str, private_key_b64: &str) -> Result<String, JsValue> {
    let message = base64::engine::general_purpose::STANDARD.decode(message_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 message: {}", e)))?;
    let private_key = base64::engine::general_purpose::STANDARD.decode(private_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 key: {}", e)))?;

    let signature = signing::sign_data(&message, &private_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(signature))
}

/// Verify an Ed25519 signature
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn verify_signature(
    message_b64: &str,
    signature_b64: &str,
    public_key_b64: &str,
) -> Result<bool, JsValue> {
    let message = base64::engine::general_purpose::STANDARD.decode(message_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 message: {}", e)))?;
    let signature = base64::engine::general_purpose::STANDARD.decode(signature_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 signature: {}", e)))?;
    let public_key = base64::engine::general_purpose::STANDARD.decode(public_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 key: {}", e)))?;

    signing::verify_signature(&message, &signature, &public_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// ─────────────────────── Hashing (Argon2id) ───────────────────────

/// Hash a password using Argon2id — returns PHC-format hash string
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn hash_password(password: &str) -> Result<String, JsValue> {
    hashing::hash_password(password)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Verify a password against an Argon2id hash
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn verify_password(password: &str, hash: &str) -> Result<bool, JsValue> {
    hashing::verify_password(password, hash)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Hash password with specific salt — returns base64-encoded 32-byte key
/// Used for deriving encryption keys from passwords
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn derive_key_from_password(password: &str, salt_b64: &str) -> Result<String, JsValue> {
    let salt = base64::engine::general_purpose::STANDARD.decode(salt_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64 salt: {}", e)))?;

    let key = hashing::hash_password_with_salt(password, &salt)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(key))
}

/// Generate a random 16-byte salt — returns base64-encoded
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_salt() -> String {
    let salt = hashing::generate_salt();
    base64::engine::general_purpose::STANDARD.encode(salt)
}

// ─────────────────────── Post-Quantum (Hybrid X25519 + ML-KEM-1024) ───────────────────────

/// Generate a hybrid post-quantum keypair (X25519 + ML-KEM-1024)
/// Returns JSON with base64-encoded keys
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn generate_hybrid_keypair() -> Result<String, JsValue> {
    let keypair = pqc::generate_hybrid_keypair_random()
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let result = serde_json::json!({
        "x25519PublicKey": base64::engine::general_purpose::STANDARD.encode(keypair.x25519_public),
        "x25519SecretKey": base64::engine::general_purpose::STANDARD.encode(keypair.x25519_secret),
        "kyberPublicKey": base64::engine::general_purpose::STANDARD.encode(&keypair.kyber_public),
        "kyberSecretKey": base64::engine::general_purpose::STANDARD.encode(&keypair.kyber_secret),
    });

    Ok(result.to_string())
}

/// Hybrid encapsulate — generate shared secret for a recipient
/// Returns JSON: { "x25519EphemeralPublic", "kyberCiphertext", "sharedSecret" }
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn hybrid_encapsulate(
    recipient_x25519_public_b64: &str,
    recipient_kyber_public_b64: &str,
) -> Result<String, JsValue> {
    let x25519_pub = base64::engine::general_purpose::STANDARD.decode(recipient_x25519_public_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;
    let kyber_pub = base64::engine::general_purpose::STANDARD.decode(recipient_kyber_public_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let ct = pqc::hybrid_encapsulate(&x25519_pub, &kyber_pub)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let result = serde_json::json!({
        "x25519EphemeralPublic": base64::engine::general_purpose::STANDARD.encode(ct.x25519_ephemeral_public),
        "kyberCiphertext": base64::engine::general_purpose::STANDARD.encode(&ct.kyber_ciphertext),
        "sharedSecret": base64::engine::general_purpose::STANDARD.encode(&ct.shared_secret),
    });

    Ok(result.to_string())
}

/// Hybrid decapsulate — recover shared secret from ciphertext
/// Returns base64-encoded 64-byte shared secret
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn hybrid_decapsulate(
    x25519_ephemeral_public_b64: &str,
    kyber_ciphertext_b64: &str,
    our_x25519_secret_b64: &str,
    our_kyber_secret_b64: &str,
) -> Result<String, JsValue> {
    let x25519_eph = base64::engine::general_purpose::STANDARD.decode(x25519_ephemeral_public_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;
    let kyber_ct = base64::engine::general_purpose::STANDARD.decode(kyber_ciphertext_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;
    let x25519_sk = base64::engine::general_purpose::STANDARD.decode(our_x25519_secret_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;
    let kyber_sk = base64::engine::general_purpose::STANDARD.decode(our_kyber_secret_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let shared_secret = pqc::hybrid_decapsulate(&x25519_eph, &kyber_ct, &x25519_sk, &kyber_sk)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(shared_secret))
}

// ─────────────────────── Protocol (Contact Card) ───────────────────────

/// Create a contact card JSON from identity data
/// Returns JSON string of the ContactCard
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn create_contact_card(
    public_key_b64: &str,
    handle: &str,
    onion_address: &str,
    solana_address: &str,
) -> Result<String, JsValue> {
    use crate::protocol::ContactCard;

    let public_key_bytes = base64::engine::general_purpose::STANDARD.decode(public_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let onion = if onion_address.is_empty() { None } else { Some(onion_address.to_string()) };

    let card = ContactCard::new(
        public_key_bytes,
        solana_address.to_string(),
        handle.to_string(),
        onion,
    );

    card.to_json()
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Sign a contact card with Ed25519 private key
/// Returns base64-encoded signature
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn sign_contact_card(card_json: &str, private_key_b64: &str) -> Result<String, JsValue> {
    use crate::protocol::ContactCard;

    let card: ContactCard = serde_json::from_str(card_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON: {}", e)))?;

    let private_key = base64::engine::general_purpose::STANDARD.decode(private_key_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let data_to_sign = card.serialize_for_signing();
    let signature = signing::sign_data(&data_to_sign, &private_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(signature))
}

// ─────────────────────── Protocol (Message) ───────────────────────

/// Serialize a message for the wire protocol
/// Returns base64-encoded binary message
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn serialize_message(message_json: &str) -> Result<String, JsValue> {
    use crate::protocol::Message;

    let msg: Message = serde_json::from_str(message_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid JSON: {}", e)))?;

    let bytes = msg.serialize()
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

/// Deserialize a message from wire protocol
/// Returns JSON string
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn deserialize_message(data_b64: &str) -> Result<String, JsValue> {
    use crate::protocol::Message;

    let data = base64::engine::general_purpose::STANDARD.decode(data_b64)
        .map_err(|e| JsValue::from_str(&format!("Invalid base64: {}", e)))?;

    let msg = Message::deserialize(&data)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    msg.to_json()
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// ─────────────────────── Utility ───────────────────────

/// Get library version
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn get_version() -> String {
    crate::VERSION.to_string()
}
