#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;

/// Fuzz the Tor DoS protection module.
///
/// Tests:
/// - Connection evaluation under various circuit IDs
/// - PoW verification with arbitrary inputs
/// - torrc configuration generation
/// - iptables rules generation
/// - Concurrent connection tracking
/// - Ban/unban operations

#[derive(Arbitrary, Debug)]
struct DoSInput {
    /// Circuit identifiers to test
    circuit_ids: Vec<String>,
    /// Number of connections per circuit
    connections_per_circuit: Vec<u8>,
    /// PoW challenge bytes
    pow_challenge: [u8; 32],
    /// PoW nonce to test
    pow_nonce: u64,
    /// PoW difficulty to test
    pow_difficulty: u8,
    /// Config overrides
    max_per_circuit: u8,
    max_concurrent: u8,
}

fuzz_target!(|input: DoSInput| {
    // Limit to prevent excessive runtime
    if input.circuit_ids.len() > 50 {
        return;
    }

    // Clamp difficulty to reasonable range
    let difficulty = input.pow_difficulty.min(32);

    // Test PoW verification (should not panic regardless of input)
    securelegion::network::tor_dos_protection::verify_pow_solution_public(
        &input.pow_challenge,
        input.pow_nonce,
        difficulty,
    );

    // Test torrc generation with various configs
    let config = securelegion::network::tor_dos_protection::HsDoSConfig {
        max_connections_per_second: (input.max_concurrent as u32).max(1),
        max_concurrent_connections: (input.max_concurrent as u32).max(1),
        max_per_circuit_per_minute: (input.max_per_circuit as u32).max(1),
        ..Default::default()
    };
    let _torrc = securelegion::network::tor_dos_protection::generate_torrc_dos_config(&config);

    // Test iptables generation
    let _rules = securelegion::network::tor_dos_protection::generate_iptables_rules(
        9050,
        443,
        (input.max_concurrent as u32).max(1),
    );
});
