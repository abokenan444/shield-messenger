pub mod apply;
/// CRDT group system — operation-based conflict-free replicated data types.
///
/// Groups are represented as append-only operation logs. Every action (create,
/// invite, message, edit, delete, react, metadata change) is a signed, immutable
/// operation. Devices converge by exchanging missing ops and replaying them in
/// deterministic order.
///
/// # Module structure
/// - `ids` — DeviceID, GroupID, OpID identity types
/// - `ops` — OpEnvelope, OpType, payload types, signing/verification
/// - `limits` — Guardrail constants and op limit checking
/// - `membership` — OR-Set membership CRDT with role-based authorization
/// - `messages` — Message add/edit/delete/react with LWW edits and permanent tombstones
/// - `metadata` — LWW registers for group name, avatar, topic
/// - `apply` — Unified apply engine (GroupState, rebuild, state_hash)
pub mod ids;
pub mod limits;
pub mod membership;
pub mod messages;
pub mod metadata;
pub mod ops;

// Re-export core types for convenience
pub use apply::{ApplyError, GroupState};
pub use ids::{DeviceID, GroupID, OpID};
pub use limits::{check_op_limits, OpLimitStatus};
pub use membership::{MemberEntry, MembershipError, MembershipState};
pub use messages::{MessageEntry, MessageError, MessageState};
pub use metadata::{LWWRegister, MetadataError, MetadataState};
pub use ops::{
    cbor_decode, cbor_encode, generate_msg_id, GroupCreatePayload, MemberAcceptPayload,
    MemberInvitePayload, MemberRemovePayload, MetadataKey, MetadataSetPayload, MsgAddPayload,
    MsgDeletePayload, MsgEditPayload, OpEnvelope, OpError, OpType, ReactionSetPayload,
    RemoveReason, Role, RoleSetPayload,
};
