#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Requires at least 32 bytes for HMAC key + some data
    if data.len() < 33 {
        return;
    }

    let mut hmac_key = [0u8; 32];
    hmac_key.copy_from_slice(&data[..32]);

    // Try deserializing arbitrary data — must not panic
    let _ = securelegion::network::packet::Packet::deserialize(data, &hmac_key);

    // If we have a valid-looking payload, try round-trip
    let payload_data = &data[32..];
    if payload_data.len() <= securelegion::network::packet::MAX_PAYLOAD {
        if let Ok(pkt) = securelegion::network::packet::Packet::new(
            securelegion::network::packet::PacketType::Message,
            payload_data.to_vec(),
        ) {
            if let Ok(serialized) = pkt.serialize(&hmac_key) {
                let deserialized = securelegion::network::packet::Packet::deserialize(
                    &serialized, &hmac_key
                ).expect("Valid serialization must deserialize");
                assert_eq!(deserialized.payload, payload_data);
            }
        }
    }
});
