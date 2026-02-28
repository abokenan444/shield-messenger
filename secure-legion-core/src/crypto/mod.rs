pub mod ack_state;
pub mod backup;
pub mod constant_time;
pub mod deadman;
pub mod duress;
pub mod encryption;
pub mod hashing;
pub mod key_exchange;
pub mod pq_ratchet;
pub mod pqc;
pub mod ratchet;
pub mod replay_cache;
pub mod signing;
pub mod zkproofs;

pub use constant_time::{eq_24, eq_32, eq_64, eq_slices};
pub use pq_ratchet::{ChainDirection, PQRatchetError, PQRatchetState};

pub use backup::{
    create_encrypted_backup, reconstruct_secret, restore_encrypted_backup, split_secret,
    BackupBlob, SecretShare,
};
pub use deadman::{CheckInResult, DeadManSwitch, WipeAction};
pub use duress::{
    execute_emergency_wipe, DecoyProfile, DuressConfig, DuressError, DuressManager,
    PinVerifyResult, WipeActions as DuressWipeActions,
};
pub use encryption::{
    decrypt_message, decrypt_message_with_evolution, derive_message_key,
    derive_receive_key_at_sequence, derive_root_key, encrypt_message,
    encrypt_message_with_evolution, evolve_chain_key,
};
pub use hashing::{hash_handle, hash_password};
pub use key_exchange::{derive_shared_secret, generate_ephemeral_key};
pub use pqc::{
    detect_identity_key_change, generate_hybrid_keypair_from_seed, generate_hybrid_keypair_random,
    generate_safety_number, hybrid_decapsulate, hybrid_encapsulate, verify_contact_fingerprint,
    verify_safety_number, ContactVerificationRecord, FingerprintQrPayload, HybridCiphertext,
    HybridKEMKeypair, IdentityKeyChangeResult, TrustLevel, VerificationStatus,
};
pub use ratchet::{PQDoubleRatchet, RatchetHeader, RatchetState};
pub use signing::{generate_keypair, sign_data, verify_signature};
pub use zkproofs::{generate_range_proof, verify_range_proof};
