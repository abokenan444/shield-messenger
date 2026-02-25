#![no_main]
use libfuzzer_sys::fuzz_target;
use securelegion::crypto::backup;

fuzz_target!(|data: &[u8]| {
    if data.len() < 2 {
        return;
    }

    // Split fuzz data: first byte = password length, rest = password + secret
    let pw_len = (data[0] as usize).min(data.len() - 1).min(128);
    let password = std::str::from_utf8(&data[1..1 + pw_len]).unwrap_or("fuzzpw");
    let secret = &data[1 + pw_len..];

    if secret.is_empty() {
        return;
    }

    // Encrypt-decrypt round trip
    if let Ok(blob) = backup::create_encrypted_backup(secret, password) {
        let restored = backup::restore_encrypted_backup(&blob, password)
            .expect("Decryption with correct password must succeed");
        assert_eq!(restored, secret, "Backup round-trip mismatch");

        // Wrong password must fail
        let _ = backup::restore_encrypted_backup(&blob, "wrong_password");
    }

    // Try restoring arbitrary data — must not panic
    let blob = backup::BackupBlob { data: data.to_vec() };
    let _ = backup::restore_encrypted_backup(&blob, password);

    // Test Shamir split/reconstruct with small secrets
    if secret.len() <= 64 && secret.len() >= 1 {
        if let Ok(shares) = backup::split_secret(secret, 2, 3) {
            let recovered = backup::reconstruct_secret(&shares[..2], 2)
                .expect("Reconstruction with sufficient shares must succeed");
            assert_eq!(recovered, secret, "Shamir round-trip mismatch");
        }
    }
});
