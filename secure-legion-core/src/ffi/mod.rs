// Platform-specific FFI modules
#[cfg(target_os = "android")]
pub mod android;
#[cfg(target_os = "android")]
pub mod keystore;
#[cfg(target_os = "android")]
pub mod crdt;

// iOS C FFI bindings (compiled for aarch64-apple-ios)
#[cfg(target_os = "ios")]
pub mod ios;

// WASM bindings (compiled for wasm32-unknown-unknown)
#[cfg(target_arch = "wasm32")]
pub mod wasm;

#[cfg(target_os = "android")]
pub use android::*;
#[cfg(target_os = "android")]
pub use keystore::*;
#[cfg(target_os = "android")]
pub use crdt::*;

#[cfg(target_os = "ios")]
pub use ios::*;

#[cfg(target_arch = "wasm32")]
pub use wasm::*;
