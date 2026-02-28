#![no_main]
use libfuzzer_sys::fuzz_target;
use shieldmessenger::crypto::key_exchange;

fuzz_target!(|data: &[u8]| {
    if data.len() < 64 {
        return;
    }

    // Use fuzz data as two 32-byte "secret keys"
    let mut secret_a = [0u8; 32];
    let mut secret_b = [0u8; 32];
    secret_a.copy_from_slice(&data[..32]);
    secret_b.copy_from_slice(&data[32..64]);

    // derive_shared_secret must never panic regardless of input
    // Note: all-zero keys are valid in X25519 (produce all-zero output)
    let _ = key_exchange::derive_shared_secret(&secret_a, &secret_b);

    // If we have extra bytes, test with arbitrary-length "public key" slices
    if data.len() > 64 {
        let arbitrary_pub = &data[64..];
        let _ = key_exchange::derive_shared_secret(&secret_a, arbitrary_pub);
    }
});
