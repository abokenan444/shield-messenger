#![no_main]
use libfuzzer_sys::fuzz_target;
use securelegion::crypto::encryption;

fuzz_target!(|data: &[u8]| {
    if data.len() < 33 {
        return;
    }

    // Split fuzz input into key (32 bytes) and plaintext
    let mut key = [0u8; 32];
    key.copy_from_slice(&data[..32]);
    let plaintext = &data[32..];

    // Encrypt then decrypt — must round-trip
    if let Ok(ciphertext) = encryption::encrypt_message(plaintext, &key) {
        let decrypted = encryption::decrypt_message(&ciphertext, &key)
            .expect("Decryption of valid ciphertext must succeed");
        assert_eq!(decrypted, plaintext, "Round-trip mismatch");
    }

    // Try decrypting arbitrary data — must not panic
    let _ = encryption::decrypt_message(data, &key);
});
