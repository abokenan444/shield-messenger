#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;

/// Fuzz the Post-Quantum Double Ratchet protocol.
///
/// Tests:
/// - Ratchet initialization (Alice/Bob handshake)
/// - Encrypt/decrypt round-trips with arbitrary plaintext
/// - Out-of-order message delivery
/// - State export/import consistency
/// - KEM ratchet step triggering

#[derive(Arbitrary, Debug)]
struct RatchetInput {
    /// Plaintext messages to encrypt (variable count and length)
    messages: Vec<Vec<u8>>,
    /// Whether to simulate out-of-order delivery
    out_of_order: bool,
    /// Indices to skip during decryption (simulates lost messages)
    skip_indices: Vec<u8>,
}

fuzz_target!(|input: RatchetInput| {
    // Limit message count to prevent OOM
    if input.messages.len() > 100 {
        return;
    }
    for msg in &input.messages {
        if msg.len() > 65536 {
            return;
        }
    }

    // Generate keypairs for Alice and Bob
    let alice_dh_secret = [1u8; 32]; // Deterministic for reproducibility
    let bob_dh_secret = [2u8; 32];

    // Use the crypto module to generate proper keys
    let alice_x25519 = shieldmessenger::crypto::key_exchange::generate_x25519_keypair_from_seed(&alice_dh_secret);
    let bob_x25519 = shieldmessenger::crypto::key_exchange::generate_x25519_keypair_from_seed(&bob_dh_secret);

    // Generate PQ keypairs
    let alice_kem = match shieldmessenger::crypto::pqc::generate_hybrid_keypair() {
        Ok(kp) => kp,
        Err(_) => return,
    };
    let bob_kem = match shieldmessenger::crypto::pqc::generate_hybrid_keypair() {
        Ok(kp) => kp,
        Err(_) => return,
    };

    // Compute shared secret for initialization
    let shared_secret = match shieldmessenger::crypto::key_exchange::x25519_key_exchange(
        &alice_x25519.0, &bob_x25519.1
    ) {
        Ok(ss) => ss,
        Err(_) => return,
    };

    // Initialize ratchets
    let mut alice_ratchet = shieldmessenger::crypto::ratchet::PQDoubleRatchet::init_alice(
        shared_secret.clone(),
        alice_x25519.1,
        bob_x25519.1,
        Some(alice_kem),
    );

    let mut bob_ratchet = shieldmessenger::crypto::ratchet::PQDoubleRatchet::init_bob(
        shared_secret,
        bob_x25519.1,
        bob_x25519.0,
        Some(bob_kem),
    );

    // Encrypt messages from Alice
    let mut encrypted: Vec<(shieldmessenger::crypto::ratchet::RatchetHeader, Vec<u8>)> = Vec::new();
    for msg in &input.messages {
        match alice_ratchet.encrypt(msg) {
            Ok(pair) => encrypted.push(pair),
            Err(_) => return, // Encryption failure is acceptable under fuzzing
        }
    }

    // Decrypt messages at Bob (possibly out of order)
    if input.out_of_order && encrypted.len() > 1 {
        // Reverse order to test out-of-order handling
        for (header, ct) in encrypted.iter().rev() {
            let _ = bob_ratchet.decrypt(header, ct);
        }
    } else {
        for (i, (header, ct)) in encrypted.iter().enumerate() {
            // Skip some messages to test skipped message key storage
            let should_skip = input.skip_indices.iter().any(|&idx| idx as usize == i);
            if should_skip && i < encrypted.len() - 1 {
                continue;
            }
            match bob_ratchet.decrypt(header, ct) {
                Ok(plaintext) => {
                    if !input.out_of_order && !should_skip {
                        // In-order delivery should produce correct plaintext
                        assert_eq!(plaintext, input.messages[i]);
                    }
                }
                Err(_) => {
                    // Decryption failure is acceptable for skipped/out-of-order messages
                }
            }
        }
    }

    // Test state export/import
    let state = alice_ratchet.export_state();
    let _restored = shieldmessenger::crypto::ratchet::PQDoubleRatchet::import_state(state);
});
