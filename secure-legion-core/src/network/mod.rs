pub mod padding;
pub mod pingpong;
pub mod tor;
pub mod friend_request_server;
pub mod socks5_client;
pub mod packet;
pub mod arti;
pub mod tor_dos_protection;

pub use padding::{
    pad_to_fixed_size,
    strip_padding,
    fixed_packet_size,
    set_fixed_packet_size,
    max_padded_payload,
    FIXED_PACKET_SIZE,
    MAX_PADDED_PAYLOAD,
    DEFAULT_PACKET_SIZE,
    random_traffic_delay_ms,
    apply_traffic_delay,
    generate_cover_packet,
    is_cover_packet,
    random_cover_interval_secs,
    COVER_INTERVAL_MIN_SECS,
    COVER_INTERVAL_MAX_SECS,
    MSG_TYPE_COVER,
    PaddingError,
    BurstPaddingConfig,
    generate_burst_padding,
    random_burst_delay_ms,
    TrafficProfile,
    fragment_and_pad,
    reassemble_fragments,
    constant_time_eq,
};

pub use pingpong::{
    PingToken,
    PongToken,
    PingPongManager,
    store_ping_session,
    get_ping_session,
    remove_ping_session,
    cleanup_expired_pings,
    remove_pong_session,
    cleanup_expired_pongs,
    remove_ack_session,
    cleanup_expired_acks,
};
pub use tor::{TorManager, PENDING_CONNECTIONS, PendingConnection, compute_onion_address_from_ed25519_seed};
pub use friend_request_server::{ContactExchangeEndpoint, get_endpoint};
pub use socks5_client::Socks5Client;
pub use packet::{Packet, PacketType, PACKET_SIZE, MAX_PAYLOAD};
pub use arti::{ArtiTorManager, ArtiConfig, IsolationToken, EphemeralOnionService};
pub use tor_dos_protection::{HsDoSProtection, HsDoSConfig, ConnectionDecision, DoSStats, verify_pow_solution_public};
