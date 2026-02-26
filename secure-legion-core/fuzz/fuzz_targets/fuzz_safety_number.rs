#![no_main]
use libfuzzer_sys::fuzz_target;
use securelegion::crypto::pqc;

fuzz_target!(|data: &[u8]| {
    // Need at least 2 bytes for two identity keys
    if data.len() < 2 {
        return;
    }

    // Split fuzz data into two "identity keys" of arbitrary length
    let mid = data.len() / 2;
    let our_identity = &data[..mid];
    let their_identity = &data[mid..];

    // generate_safety_number must never panic regardless of input
    let sn = pqc::generate_safety_number(our_identity, their_identity);

    // Safety number must always be 12 groups of 5 digits separated by spaces
    let groups: Vec<&str> = sn.split(' ').collect();
    assert_eq!(groups.len(), 12, "Safety number must have 12 groups");
    for g in &groups {
        assert_eq!(g.len(), 5, "Each group must be 5 digits");
        assert!(
            g.chars().all(|c| c.is_ascii_digit()),
            "Each group must contain only digits"
        );
    }

    // Commutativity: generate_safety_number(A, B) == generate_safety_number(B, A)
    let sn_reversed = pqc::generate_safety_number(their_identity, our_identity);
    assert_eq!(sn, sn_reversed, "Safety number must be commutative");

    // verify_safety_number must agree with the generated number
    assert!(
        pqc::verify_safety_number(our_identity, their_identity, &sn),
        "verify_safety_number must return true for matching safety number"
    );

    // A wrong safety number must not verify
    let wrong = "00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 99999";
    if sn != wrong {
        assert!(
            !pqc::verify_safety_number(our_identity, their_identity, wrong),
            "verify_safety_number must return false for wrong safety number"
        );
    }
});
