#![no_main]
use libfuzzer_sys::fuzz_target;
use securelegion::crypto::pqc;

fuzz_target!(|data: &[u8]| {
    // Test hybrid keypair generation with arbitrary seeds
    if data.len() >= 32 {
        let mut seed = [0u8; 32];
        seed.copy_from_slice(&data[..32]);

        // Deterministic generation must not panic
        if let Ok(keypair) = pqc::generate_hybrid_keypair_from_seed(&seed) {
            // If keygen succeeded, encapsulate/decapsulate must round-trip
            if let Ok(ct) = pqc::hybrid_encapsulate(
                &keypair.x25519_public,
                &keypair.kyber_public,
            ) {
                let recovered = pqc::hybrid_decapsulate(
                    &ct.x25519_ephemeral_public,
                    &ct.kyber_ciphertext,
                    &keypair.x25519_secret,
                    &keypair.kyber_secret,
                ).expect("Decapsulation of valid ciphertext must succeed");

                assert_eq!(ct.shared_secret, recovered, "Shared secret mismatch");
            }
        }
    }

    // Test encapsulate/decapsulate with arbitrary byte slices — must not panic
    if data.len() >= 64 {
        let _ = pqc::hybrid_encapsulate(&data[..32], &data[32..]);
    }
});
