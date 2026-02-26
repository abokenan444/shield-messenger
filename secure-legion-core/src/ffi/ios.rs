/// iOS C FFI bindings for Swift interop
///
/// Exposes the Rust core library as C-compatible functions callable from Swift.
/// All cryptographic operations run in Rust — Swift only marshals data.
///
/// Build for iOS:
///   rustup target add aarch64-apple-ios aarch64-apple-ios-sim
///   cargo build --target aarch64-apple-ios --features ios --release
///
/// Link libsecurelegion.a in Xcode and add a bridging header.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::ptr;
use std::slice;

use crate::crypto::{encryption, signing, key_exchange, hashing, pqc};
use base64::Engine;

// ─────────────────────── Helper: Byte buffer for returning data to Swift ───────────────────────

/// Opaque byte buffer returned to Swift
/// Swift must call sl_free_buffer() when done
#[repr(C)]
pub struct SLBuffer {
    pub data: *mut u8,
    pub len: usize,
    pub cap: usize,
}

impl SLBuffer {
    fn from_vec(v: Vec<u8>) -> Self {
        let mut v = std::mem::ManuallyDrop::new(v);
        SLBuffer {
            data: v.as_mut_ptr(),
            len: v.len(),
            cap: v.capacity(),
        }
    }

    fn null() -> Self {
        SLBuffer { data: ptr::null_mut(), len: 0, cap: 0 }
    }
}

/// Keypair result returned to Swift (both 32-byte keys)
#[repr(C)]
pub struct SLKeypair {
    pub public_key: [u8; 32],
    pub private_key: [u8; 32],
    pub success: i32,
}

// ─────────────────────── Core Init ───────────────────────

/// Initialize the Shield Messenger core library
#[no_mangle]
pub extern "C" fn sl_init() -> i32 {
    0 // Success — no global state needed
}

/// Get the library version string
#[no_mangle]
pub extern "C" fn sl_version() -> *mut c_char {
    let version = CString::new(env!("CARGO_PKG_VERSION")).unwrap_or_default();
    version.into_raw()
}

// ─────────────────────── Ed25519 Identity ───────────────────────

/// Generate an Ed25519 identity keypair
#[no_mangle]
pub extern "C" fn sl_generate_identity_keypair() -> SLKeypair {
    let (public_key, private_key) = signing::generate_keypair();
    SLKeypair { public_key, private_key, success: 1 }
}

/// Derive Ed25519 public key from private key
///
/// # Safety
/// `private_key` must point to 32 bytes, `out_public_key` must point to 32 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_derive_ed25519_public_key(
    private_key: *const u8,
    out_public_key: *mut u8,
) -> i32 {
    if private_key.is_null() || out_public_key.is_null() {
        return -1;
    }

    let priv_key = slice::from_raw_parts(private_key, 32);
    match signing::derive_public_key(priv_key) {
        Ok(pub_key) => {
            ptr::copy_nonoverlapping(pub_key.as_ptr(), out_public_key, 32);
            0
        }
        Err(_) => -2,
    }
}

// ─────────────────────── X25519 Key Exchange ───────────────────────

/// Generate an X25519 key exchange keypair
#[no_mangle]
pub extern "C" fn sl_generate_x25519_keypair() -> SLKeypair {
    let (public_key, private_key) = key_exchange::generate_static_keypair();
    SLKeypair { public_key, private_key, success: 1 }
}

/// Perform X25519 Diffie-Hellman key exchange
///
/// # Safety
/// All pointers must be valid: private/public keys = 32 bytes each, out = 32 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_x25519_derive_shared_secret(
    our_private_key: *const u8,
    their_public_key: *const u8,
    out_shared_secret: *mut u8,
) -> i32 {
    if our_private_key.is_null() || their_public_key.is_null() || out_shared_secret.is_null() {
        return -1;
    }

    let our_priv = slice::from_raw_parts(our_private_key, 32);
    let their_pub = slice::from_raw_parts(their_public_key, 32);

    match key_exchange::derive_shared_secret(our_priv, their_pub) {
        Ok(secret) => {
            ptr::copy_nonoverlapping(secret.as_ptr(), out_shared_secret, 32);
            0
        }
        Err(_) => -2,
    }
}

// ─────────────────────── XChaCha20-Poly1305 Encryption ───────────────────────

/// Generate a random 32-byte encryption key
///
/// # Safety
/// `out_key` must point to a buffer of at least 32 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_generate_key(out_key: *mut u8) -> i32 {
    if out_key.is_null() {
        return -1;
    }

    let key = encryption::generate_key();
    ptr::copy_nonoverlapping(key.as_ptr(), out_key, 32);
    0
}

/// Encrypt a message using XChaCha20-Poly1305
/// Returns SLBuffer with nonce+ciphertext (caller must free with sl_free_buffer)
///
/// # Safety
/// `plaintext` / `key` must be valid pointers with correct lengths
#[no_mangle]
pub unsafe extern "C" fn sl_encrypt(
    plaintext: *const u8,
    plaintext_len: usize,
    key: *const u8,
    key_len: usize,
) -> SLBuffer {
    if plaintext.is_null() || key.is_null() || key_len != 32 {
        return SLBuffer::null();
    }

    let plaintext_slice = slice::from_raw_parts(plaintext, plaintext_len);
    let key_slice = slice::from_raw_parts(key, key_len);

    match encryption::encrypt_message(plaintext_slice, key_slice) {
        Ok(ciphertext) => SLBuffer::from_vec(ciphertext),
        Err(_) => SLBuffer::null(),
    }
}

/// Decrypt a message using XChaCha20-Poly1305
/// Returns SLBuffer with plaintext (caller must free with sl_free_buffer)
///
/// # Safety
/// `ciphertext` / `key` must be valid pointers with correct lengths
#[no_mangle]
pub unsafe extern "C" fn sl_decrypt(
    ciphertext: *const u8,
    ciphertext_len: usize,
    key: *const u8,
    key_len: usize,
) -> SLBuffer {
    if ciphertext.is_null() || key.is_null() || key_len != 32 {
        return SLBuffer::null();
    }

    let ciphertext_slice = slice::from_raw_parts(ciphertext, ciphertext_len);
    let key_slice = slice::from_raw_parts(key, key_len);

    match encryption::decrypt_message(ciphertext_slice, key_slice) {
        Ok(plaintext) => SLBuffer::from_vec(plaintext),
        Err(_) => SLBuffer::null(),
    }
}

// ─────────────────────── Forward Secrecy (Chain Key Evolution) ───────────────────────

/// Derive root key from shared secret
///
/// # Safety
/// `shared_secret` = 32 or 64 bytes, `out_root_key` = 32 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_derive_root_key(
    shared_secret: *const u8,
    shared_secret_len: usize,
    out_root_key: *mut u8,
) -> i32 {
    if shared_secret.is_null() || out_root_key.is_null() {
        return -1;
    }

    let secret = slice::from_raw_parts(shared_secret, shared_secret_len);
    match encryption::derive_root_key(secret, b"SecureLegion-RootKey-v1") {
        Ok(root_key) => {
            ptr::copy_nonoverlapping(root_key.as_ptr(), out_root_key, 32);
            0
        }
        Err(_) => -2,
    }
}

/// Evolve chain key forward (provides forward secrecy)
///
/// # Safety
/// `chain_key` = 32 bytes (modified in place), `out_new_key` = 32 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_evolve_chain_key(
    chain_key: *mut u8,
    out_new_key: *mut u8,
) -> i32 {
    if chain_key.is_null() || out_new_key.is_null() {
        return -1;
    }

    let mut key = [0u8; 32];
    ptr::copy_nonoverlapping(chain_key, key.as_mut_ptr(), 32);

    match encryption::evolve_chain_key(&mut key) {
        Ok(new_key) => {
            ptr::copy_nonoverlapping(new_key.as_ptr(), out_new_key, 32);
            // Explicitly zero the caller's old key buffer for forward secrecy
            ptr::write_bytes(chain_key, 0, 32);
            0
        }
        Err(_) => -2,
    }
}

// ─────────────────────── Ed25519 Signing ───────────────────────

/// Sign data with Ed25519 private key
///
/// # Safety
/// `data` = valid pointer, `private_key` = 32 bytes, `out_signature` = 64 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_sign(
    data: *const u8,
    data_len: usize,
    private_key: *const u8,
    out_signature: *mut u8,
) -> i32 {
    if data.is_null() || private_key.is_null() || out_signature.is_null() {
        return -1;
    }

    let data_slice = slice::from_raw_parts(data, data_len);
    let priv_key = slice::from_raw_parts(private_key, 32);

    match signing::sign_data(data_slice, priv_key) {
        Ok(signature) => {
            ptr::copy_nonoverlapping(signature.as_ptr(), out_signature, 64);
            0
        }
        Err(_) => -2,
    }
}

/// Verify an Ed25519 signature
///
/// # Safety
/// `data`, `signature` (64 bytes), `public_key` (32 bytes) must be valid
#[no_mangle]
pub unsafe extern "C" fn sl_verify(
    data: *const u8,
    data_len: usize,
    signature: *const u8,
    public_key: *const u8,
) -> i32 {
    if data.is_null() || signature.is_null() || public_key.is_null() {
        return -1;
    }

    let data_slice = slice::from_raw_parts(data, data_len);
    let sig_slice = slice::from_raw_parts(signature, 64);
    let pub_key = slice::from_raw_parts(public_key, 32);

    match signing::verify_signature(data_slice, sig_slice, pub_key) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(_) => -2,
    }
}

// ─────────────────────── Argon2id Hashing ───────────────────────

/// Hash a password using Argon2id — returns PHC-format string
///
/// # Safety
/// `password` must be a valid C string. Returned pointer must be freed with sl_free_string.
#[no_mangle]
pub unsafe extern "C" fn sl_hash_password(password: *const c_char) -> *mut c_char {
    if password.is_null() {
        return ptr::null_mut();
    }

    let password_str = match CStr::from_ptr(password).to_str() {
        Ok(s) => s,
        Err(_) => return ptr::null_mut(),
    };

    match hashing::hash_password(password_str) {
        Ok(hash) => {
            match CString::new(hash) {
                Ok(c) => c.into_raw(),
                Err(_) => ptr::null_mut(),
            }
        }
        Err(_) => ptr::null_mut(),
    }
}

/// Verify a password against an Argon2id hash
///
/// # Safety
/// Both parameters must be valid C strings
#[no_mangle]
pub unsafe extern "C" fn sl_verify_password(
    password: *const c_char,
    hash: *const c_char,
) -> i32 {
    if password.is_null() || hash.is_null() {
        return -1;
    }

    let password_str = match CStr::from_ptr(password).to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };

    let hash_str = match CStr::from_ptr(hash).to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };

    match hashing::verify_password(password_str, hash_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(_) => -2,
    }
}

/// Derive a 32-byte key from password + salt using Argon2id
///
/// # Safety
/// `password` = C string, `salt` = 16+ bytes, `out_key` = 32 bytes
#[no_mangle]
pub unsafe extern "C" fn sl_derive_key_from_password(
    password: *const c_char,
    salt: *const u8,
    salt_len: usize,
    out_key: *mut u8,
) -> i32 {
    if password.is_null() || salt.is_null() || out_key.is_null() {
        return -1;
    }

    let password_str = match CStr::from_ptr(password).to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };

    let salt_slice = slice::from_raw_parts(salt, salt_len);

    match hashing::hash_password_with_salt(password_str, salt_slice) {
        Ok(key) => {
            ptr::copy_nonoverlapping(key.as_ptr(), out_key, 32);
            0
        }
        Err(_) => -2,
    }
}

// ─────────────────────── Post-Quantum Hybrid ───────────────────────

/// Generate hybrid keypair — returns SLBuffer with serialized JSON
#[no_mangle]
pub extern "C" fn sl_generate_hybrid_keypair() -> SLBuffer {
    match pqc::generate_hybrid_keypair_random() {
        Ok(keypair) => {
            let json = serde_json::json!({
                "x25519Public": base64::engine::general_purpose::STANDARD.encode(keypair.x25519_public),
                "x25519Secret": base64::engine::general_purpose::STANDARD.encode(keypair.x25519_secret),
                "kyberPublic": base64::engine::general_purpose::STANDARD.encode(&keypair.kyber_public),
                "kyberSecret": base64::engine::general_purpose::STANDARD.encode(&keypair.kyber_secret),
            });
            match serde_json::to_vec(&json) {
                Ok(bytes) => SLBuffer::from_vec(bytes),
                Err(_) => SLBuffer::null(),
            }
        }
        Err(_) => SLBuffer::null(),
    }
}

// ─────────────────────── Memory Management ───────────────────────

/// Free a string allocated by Rust
///
/// # Safety
/// `s` must be a pointer returned by a Rust function that allocates CString
#[no_mangle]
pub unsafe extern "C" fn sl_free_string(s: *mut c_char) {
    if !s.is_null() {
        let _ = CString::from_raw(s);
    }
}

/// Free a byte buffer allocated by Rust
///
/// # Safety
/// Must be called with the exact SLBuffer returned by a Rust function
#[no_mangle]
pub unsafe extern "C" fn sl_free_buffer(buf: SLBuffer) {
    if !buf.data.is_null() {
        let _ = Vec::from_raw_parts(buf.data, buf.len, buf.cap);
    }
}

/// Legacy free for raw byte pointers
///
/// # Safety
/// `ptr` must be from a Rust Vec, `len`/`cap` must match
#[no_mangle]
pub unsafe extern "C" fn sl_free_bytes(ptr: *mut u8, len: usize, cap: usize) {
    if !ptr.is_null() {
        let _ = Vec::from_raw_parts(ptr, len, cap);
    }
}

// ─────────────────────── Legacy (backward compat) ───────────────────────

/// Generate X25519 keypair into out parameters (legacy API)
///
/// # Safety
/// Both pointers must point to 32-byte buffers
#[no_mangle]
pub unsafe extern "C" fn sl_generate_keypair(
    out_public_key: *mut u8,
    out_private_key: *mut u8,
) -> i32 {
    if out_public_key.is_null() || out_private_key.is_null() {
        return -1;
    }

    let (public_key, private_key) = key_exchange::generate_static_keypair();
    ptr::copy_nonoverlapping(public_key.as_ptr(), out_public_key, 32);
    ptr::copy_nonoverlapping(private_key.as_ptr(), out_private_key, 32);

    0
}


// ==================== SAFETY NUMBERS & CONTACT VERIFICATION ====================

/// Generate a 60-digit safety number from two identity public keys.
/// Returns a C string that must be freed with sl_free_string().
///
/// # Safety
/// Both pointers must be valid identity public key byte arrays.
#[no_mangle]
pub unsafe extern "C" fn sl_generate_safety_number(
    our_identity: *const u8,
    our_identity_len: usize,
    their_identity: *const u8,
    their_identity_len: usize,
) -> *mut c_char {
    if our_identity.is_null() || their_identity.is_null() {
        return ptr::null_mut();
    }
    let our_id = slice::from_raw_parts(our_identity, our_identity_len);
    let their_id = slice::from_raw_parts(their_identity, their_identity_len);
    let safety_number = pqc::generate_safety_number(our_id, their_id);
    match CString::new(safety_number) {
        Ok(cs) => cs.into_raw(),
        Err(_) => ptr::null_mut(),
    }
}

/// Verify a safety number against two identity keys.
/// Returns 1 if valid, 0 if invalid, -1 on error.
///
/// # Safety
/// All pointers must be valid. safety_number must be a null-terminated C string.
#[no_mangle]
pub unsafe extern "C" fn sl_verify_safety_number(
    our_identity: *const u8,
    our_identity_len: usize,
    their_identity: *const u8,
    their_identity_len: usize,
    safety_number: *const c_char,
) -> i32 {
    if our_identity.is_null() || their_identity.is_null() || safety_number.is_null() {
        return -1;
    }
    let our_id = slice::from_raw_parts(our_identity, our_identity_len);
    let their_id = slice::from_raw_parts(their_identity, their_identity_len);
    let sn = match CStr::from_ptr(safety_number).to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };
    if pqc::verify_safety_number(our_id, their_id, sn) { 1 } else { 0 }
}

/// Encode identity key + safety number into a QR-scannable payload string.
/// Returns a C string that must be freed with sl_free_string().
///
/// # Safety
/// identity_key must be a valid byte array. safety_number must be null-terminated.
#[no_mangle]
pub unsafe extern "C" fn sl_encode_fingerprint_qr(
    identity_key: *const u8,
    identity_key_len: usize,
    safety_number: *const c_char,
) -> *mut c_char {
    if identity_key.is_null() || safety_number.is_null() {
        return ptr::null_mut();
    }
    let id_key = slice::from_raw_parts(identity_key, identity_key_len).to_vec();
    let sn = match CStr::from_ptr(safety_number).to_str() {
        Ok(s) => s.to_string(),
        Err(_) => return ptr::null_mut(),
    };
    let payload = pqc::FingerprintQrPayload {
        identity_key: id_key,
        safety_number: sn,
    };
    match CString::new(payload.encode()) {
        Ok(cs) => cs.into_raw(),
        Err(_) => ptr::null_mut(),
    }
}

/// Verify a scanned QR fingerprint against our identity key.
/// Returns a JSON C string: { "status": "Verified" | "Mismatch" | "InvalidData" }
/// Must be freed with sl_free_string().
///
/// # Safety
/// our_identity must be a valid byte array. scanned_qr must be null-terminated.
#[no_mangle]
pub unsafe extern "C" fn sl_verify_contact_fingerprint(
    our_identity: *const u8,
    our_identity_len: usize,
    scanned_qr: *const c_char,
) -> *mut c_char {
    if our_identity.is_null() || scanned_qr.is_null() {
        return ptr::null_mut();
    }
    let our_id = slice::from_raw_parts(our_identity, our_identity_len);
    let qr_data = match CStr::from_ptr(scanned_qr).to_str() {
        Ok(s) => s,
        Err(_) => return ptr::null_mut(),
    };
    let result = pqc::verify_contact_fingerprint(our_id, qr_data);
    let status = match result {
        pqc::VerificationStatus::Verified => "Verified",
        pqc::VerificationStatus::Mismatch => "Mismatch",
        pqc::VerificationStatus::InvalidData => "InvalidData",
    };
    let json = format!("{{\"status\": \"{}\"}}", status);
    match CString::new(json) {
        Ok(cs) => cs.into_raw(),
        Err(_) => ptr::null_mut(),
    }
}

/// Detect if a contact's identity key has changed (possible MITM).
/// stored_their_identity can be null for first-seen contacts.
/// Returns a JSON C string that must be freed with sl_free_string().
///
/// # Safety
/// our_identity and current_their_identity must be valid byte arrays.
/// stored_their_identity can be null (first contact).
#[no_mangle]
pub unsafe extern "C" fn sl_detect_identity_key_change(
    our_identity: *const u8,
    our_identity_len: usize,
    stored_their_identity: *const u8,
    stored_their_identity_len: usize,
    current_their_identity: *const u8,
    current_their_identity_len: usize,
) -> *mut c_char {
    if our_identity.is_null() || current_their_identity.is_null() {
        return ptr::null_mut();
    }
    let our_id = slice::from_raw_parts(our_identity, our_identity_len);
    let current_id = slice::from_raw_parts(current_their_identity, current_their_identity_len);
    let stored = if stored_their_identity.is_null() || stored_their_identity_len == 0 {
        None
    } else {
        Some(slice::from_raw_parts(stored_their_identity, stored_their_identity_len))
    };
    let result = pqc::detect_identity_key_change(our_id, stored, current_id);
    let json = match result {
        pqc::IdentityKeyChangeResult::FirstSeen => {
            "{\"result\": \"FirstSeen\"}".to_string()
        }
        pqc::IdentityKeyChangeResult::Unchanged => {
            "{\"result\": \"Unchanged\"}".to_string()
        }
        pqc::IdentityKeyChangeResult::Changed { previous_fingerprint, new_fingerprint } => {
            format!(
                "{{\"result\": \"Changed\", \"previousFingerprint\": \"{}\", \"newFingerprint\": \"{}\"}}",
                previous_fingerprint, new_fingerprint
            )
        }
    };
    match CString::new(json) {
        Ok(cs) => cs.into_raw(),
        Err(_) => ptr::null_mut(),
    }
}
