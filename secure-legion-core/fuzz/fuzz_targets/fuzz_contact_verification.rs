#![no_main]
use libfuzzer_sys::fuzz_target;
use securelegion::crypto::pqc;

fuzz_target!(|data: &[u8]| {
    if data.len() < 33 {
        return;
    }

    // First 32 bytes = simulated identity key, rest = fuzzed QR data
    let our_identity = &data[..32];
    let qr_data = match std::str::from_utf8(&data[32..]) {
        Ok(s) => s,
        Err(_) => return, // Non-UTF-8 data — skip
    };

    // verify_contact_fingerprint must never panic regardless of input
    let status = pqc::verify_contact_fingerprint(our_identity, qr_data);

    // Status must be one of the three valid variants
    match status {
        pqc::VerificationStatus::Verified => {}
        pqc::VerificationStatus::Mismatch => {}
        pqc::VerificationStatus::InvalidData => {}
    }

    // Test FingerprintQrPayload::decode with arbitrary strings — must not panic
    let _ = pqc::FingerprintQrPayload::decode(qr_data);

    // If we can decode, re-encode and verify round-trip
    if let Some(payload) = pqc::FingerprintQrPayload::decode(qr_data) {
        let re_encoded = payload.encode();
        let re_decoded = pqc::FingerprintQrPayload::decode(&re_encoded)
            .expect("Re-encoding a valid payload must be decodable");
        assert_eq!(
            re_decoded.identity_key, payload.identity_key,
            "Identity key must survive encode/decode round-trip"
        );
        assert_eq!(
            re_decoded.safety_number, payload.safety_number,
            "Safety number must survive encode/decode round-trip"
        );
    }
});
