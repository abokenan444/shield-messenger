//! Transport-layer primitives for Shield Protocol.
//!
//! This module provides packet formatting and traffic-analysis resistance
//! utilities that are **transport-agnostic** — they work over Tor, TCP,
//! WebSocket, or any other underlying channel.

pub mod packet;
pub mod padding;

pub use packet::{Packet, PacketType, MAX_PAYLOAD, PACKET_SIZE};
pub use padding::{
    apply_traffic_delay, constant_time_eq, fixed_packet_size, fragment_and_pad,
    generate_burst_padding, generate_cover_packet, is_cover_packet, max_padded_payload,
    pad_to_fixed_size, random_burst_delay_ms, random_cover_interval_secs, random_traffic_delay_ms,
    reassemble_fragments, set_fixed_packet_size, strip_padding, BurstPaddingConfig, PaddingError,
    TrafficProfile, COVER_INTERVAL_MAX_SECS, COVER_INTERVAL_MIN_SECS, DEFAULT_PACKET_SIZE,
    FIXED_PACKET_SIZE, MAX_PADDED_PAYLOAD, MSG_TYPE_COVER,
};
