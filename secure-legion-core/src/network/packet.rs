/// Traffic Analysis Resistance: Fixed-Size Packet Layer
///
/// All packets sent over the network are padded to a fixed size (8192 bytes)
/// to prevent traffic analysis. An adversary observing packet sizes cannot
/// determine whether a packet contains a short text message, a long message,
/// a file chunk, or is a cover traffic dummy.
///
/// Packet wire format (8192 bytes total):
/// ```text
/// [version: 1][type: 1][payload_len: 4][payload: N][random_padding: 8192-6-N][hmac: 32]
/// ```
///
/// The HMAC covers version + type + payload_len + payload + padding to prevent
/// truncation and bit-flipping attacks on the padding.
use hmac::{Hmac, Mac};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use thiserror::Error;

type HmacSha256 = Hmac<Sha256>;

/// Fixed packet size in bytes (including HMAC)
pub const PACKET_SIZE: usize = 8192;
/// HMAC tag size
const HMAC_SIZE: usize = 32;
/// Header size: version(1) + type(1) + payload_len(4)
const HEADER_SIZE: usize = 6;
/// Maximum payload that fits in a single packet
pub const MAX_PAYLOAD: usize = PACKET_SIZE - HEADER_SIZE - HMAC_SIZE;

/// Packet version
const PACKET_VERSION: u8 = 0x01;

#[derive(Error, Debug)]
pub enum PacketError {
    #[error("Payload too large: {size} bytes (max {MAX_PAYLOAD})")]
    PayloadTooLarge { size: usize },
    #[error("Invalid packet size: expected {PACKET_SIZE}, got {size}")]
    InvalidPacketSize { size: usize },
    #[error("Invalid packet version: {0}")]
    InvalidVersion(u8),
    #[error("HMAC verification failed")]
    HmacFailed,
    #[error("Invalid payload length field")]
    InvalidPayloadLength,
}

pub type Result<T> = std::result::Result<T, PacketError>;

/// Packet type discriminator
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum PacketType {
    /// Encrypted message payload
    Message = 0x01,
    /// Key exchange / ratchet header
    KeyExchange = 0x02,
    /// Ping-Pong protocol
    PingPong = 0x03,
    /// File transfer chunk
    FileChunk = 0x04,
    /// Voice call audio frame
    VoiceFrame = 0x05,
    /// Cover traffic (dummy — discarded by recipient)
    CoverTraffic = 0xFF,
}

impl PacketType {
    fn from_u8(v: u8) -> Option<Self> {
        match v {
            0x01 => Some(Self::Message),
            0x02 => Some(Self::KeyExchange),
            0x03 => Some(Self::PingPong),
            0x04 => Some(Self::FileChunk),
            0x05 => Some(Self::VoiceFrame),
            0xFF => Some(Self::CoverTraffic),
            _ => None,
        }
    }
}

/// A fixed-size network packet with random padding
pub struct Packet {
    /// The packet type
    pub packet_type: PacketType,
    /// The actual payload data
    pub payload: Vec<u8>,
}

impl Packet {
    /// Create a new packet with the given type and payload
    pub fn new(packet_type: PacketType, payload: Vec<u8>) -> Result<Self> {
        if payload.len() > MAX_PAYLOAD {
            return Err(PacketError::PayloadTooLarge {
                size: payload.len(),
            });
        }
        Ok(Self {
            packet_type,
            payload,
        })
    }

    /// Create a cover traffic (dummy) packet
    ///
    /// The payload is random bytes, indistinguishable from real encrypted data.
    pub fn cover_traffic() -> Self {
        let mut payload = vec![0u8; 1024]; // 1KB random payload
        rand::rngs::OsRng.fill_bytes(&mut payload);
        Self {
            packet_type: PacketType::CoverTraffic,
            payload,
        }
    }

    /// Serialize to a fixed-size wire format with random padding and HMAC
    ///
    /// # Arguments
    /// * `hmac_key` - 32-byte key for packet authentication
    ///
    /// # Returns
    /// Exactly PACKET_SIZE bytes
    pub fn serialize(&self, hmac_key: &[u8; 32]) -> Result<[u8; PACKET_SIZE]> {
        if self.payload.len() > MAX_PAYLOAD {
            return Err(PacketError::PayloadTooLarge {
                size: self.payload.len(),
            });
        }

        let mut buf = [0u8; PACKET_SIZE];

        // Header
        buf[0] = PACKET_VERSION;
        buf[1] = self.packet_type as u8;
        let len_bytes = (self.payload.len() as u32).to_be_bytes();
        buf[2..6].copy_from_slice(&len_bytes);

        // Payload
        buf[HEADER_SIZE..HEADER_SIZE + self.payload.len()].copy_from_slice(&self.payload);

        // Random padding (fills space between payload end and HMAC start)
        let padding_start = HEADER_SIZE + self.payload.len();
        let padding_end = PACKET_SIZE - HMAC_SIZE;
        if padding_start < padding_end {
            rand::rngs::OsRng.fill_bytes(&mut buf[padding_start..padding_end]);
        }

        // HMAC over everything except the HMAC field itself
        let mut mac = <HmacSha256 as Mac>::new_from_slice(hmac_key).expect("HMAC key length valid");
        mac.update(&buf[..padding_end]);
        let tag = mac.finalize().into_bytes();
        buf[padding_end..].copy_from_slice(&tag);

        Ok(buf)
    }

    /// Deserialize from a fixed-size wire format, verifying HMAC
    ///
    /// # Arguments
    /// * `data` - Exactly PACKET_SIZE bytes
    /// * `hmac_key` - 32-byte key for packet authentication
    pub fn deserialize(data: &[u8], hmac_key: &[u8; 32]) -> Result<Self> {
        if data.len() != PACKET_SIZE {
            return Err(PacketError::InvalidPacketSize { size: data.len() });
        }

        // Verify HMAC first (constant-time)
        let hmac_start = PACKET_SIZE - HMAC_SIZE;
        let mut mac = <HmacSha256 as Mac>::new_from_slice(hmac_key).expect("HMAC key length valid");
        mac.update(&data[..hmac_start]);
        mac.verify_slice(&data[hmac_start..])
            .map_err(|_| PacketError::HmacFailed)?;

        // Parse header
        let version = data[0];
        if version != PACKET_VERSION {
            return Err(PacketError::InvalidVersion(version));
        }

        let packet_type =
            PacketType::from_u8(data[1]).ok_or(PacketError::InvalidVersion(data[1]))?;

        let payload_len = u32::from_be_bytes(
            data[2..6]
                .try_into()
                .map_err(|_| PacketError::InvalidPayloadLength)?,
        ) as usize;

        if payload_len > MAX_PAYLOAD {
            return Err(PacketError::InvalidPayloadLength);
        }

        let payload = data[HEADER_SIZE..HEADER_SIZE + payload_len].to_vec();

        Ok(Self {
            packet_type,
            payload,
        })
    }
}

/// Split a large payload into multiple fixed-size packets
///
/// # Arguments
/// * `packet_type` - Type for all chunks
/// * `data` - The full payload to fragment
///
/// # Returns
/// Vector of Packets, each fitting within MAX_PAYLOAD
pub fn fragment_payload(packet_type: PacketType, data: &[u8]) -> Vec<Packet> {
    data.chunks(MAX_PAYLOAD)
        .map(|chunk| Packet {
            packet_type,
            payload: chunk.to_vec(),
        })
        .collect()
}

/// Reassemble fragments back into the full payload
pub fn reassemble_fragments(packets: &[Packet]) -> Vec<u8> {
    let total: usize = packets.iter().map(|p| p.payload.len()).sum();
    let mut result = Vec::with_capacity(total);
    for p in packets {
        result.extend_from_slice(&p.payload);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_packet_round_trip() {
        let hmac_key = [0xABu8; 32];
        let payload = b"Hello, Shield Messenger!".to_vec();

        let pkt = Packet::new(PacketType::Message, payload.clone()).unwrap();
        let serialized = pkt.serialize(&hmac_key).unwrap();

        assert_eq!(serialized.len(), PACKET_SIZE);

        let deserialized = Packet::deserialize(&serialized, &hmac_key).unwrap();
        assert_eq!(deserialized.packet_type, PacketType::Message);
        assert_eq!(deserialized.payload, payload);
    }

    #[test]
    fn test_packet_always_fixed_size() {
        let hmac_key = [0xCDu8; 32];

        // Small payload
        let small = Packet::new(PacketType::Message, vec![0x42; 10]).unwrap();
        let s1 = small.serialize(&hmac_key).unwrap();
        assert_eq!(s1.len(), PACKET_SIZE);

        // Large payload (near max)
        let large = Packet::new(PacketType::FileChunk, vec![0x42; MAX_PAYLOAD]).unwrap();
        let s2 = large.serialize(&hmac_key).unwrap();
        assert_eq!(s2.len(), PACKET_SIZE);

        // Cover traffic
        let cover = Packet::cover_traffic();
        let s3 = cover.serialize(&hmac_key).unwrap();
        assert_eq!(s3.len(), PACKET_SIZE);
    }

    #[test]
    fn test_payload_too_large() {
        let result = Packet::new(PacketType::Message, vec![0u8; MAX_PAYLOAD + 1]);
        assert!(result.is_err());
    }

    #[test]
    fn test_hmac_tamper_detection() {
        let hmac_key = [0xEFu8; 32];
        let pkt = Packet::new(PacketType::Message, b"secret".to_vec()).unwrap();
        let mut serialized = pkt.serialize(&hmac_key).unwrap();

        // Tamper with one byte
        serialized[100] ^= 0xFF;

        let result = Packet::deserialize(&serialized, &hmac_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_hmac_key() {
        let key1 = [0xAAu8; 32];
        let key2 = [0xBBu8; 32];

        let pkt = Packet::new(PacketType::PingPong, b"ping".to_vec()).unwrap();
        let serialized = pkt.serialize(&key1).unwrap();

        let result = Packet::deserialize(&serialized, &key2);
        assert!(result.is_err());
    }

    #[test]
    fn test_cover_traffic() {
        let hmac_key = [0x11u8; 32];
        let cover = Packet::cover_traffic();
        assert_eq!(cover.packet_type, PacketType::CoverTraffic);

        let serialized = cover.serialize(&hmac_key).unwrap();
        let back = Packet::deserialize(&serialized, &hmac_key).unwrap();
        assert_eq!(back.packet_type, PacketType::CoverTraffic);
    }

    #[test]
    fn test_fragmentation_reassembly() {
        let data = vec![0x42u8; MAX_PAYLOAD * 3 + 100]; // ~3.01 packets
        let frags = fragment_payload(PacketType::FileChunk, &data);
        assert_eq!(frags.len(), 4);

        let reassembled = reassemble_fragments(&frags);
        assert_eq!(reassembled, data);
    }
}
