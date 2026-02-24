# Tor → Arti Migration Path (Shield Messenger)

This document describes the planned migration from the current C Tor daemon (via tor-android / OnionProxyManager) to **Arti** (Rust Tor implementation) for embedded use. Arti gives full control over circuits and hidden services without an external Tor binary.

## Current State

- **Android:** Tor lifecycle is managed by `OnionProxyManager` (tor-android). The app connects via SOCKS5 (127.0.0.1:9050) and uses a Unix ControlSocket for bootstrap and HS events.
- **Core (Rust):** `secure-legion-core` uses SOCKS5 to connect to `.onion` addresses; it does not spawn or manage the Tor process. Control port logic (bootstrap polling, SETEVENTS) runs in Rust and talks to the C Tor daemon over the socket.

## Target State with Arti

1. **Embed Arti as a library** in the app (or in a dedicated Rust crate). No separate Tor process.
2. **Ephemeral hidden services:** Create/destroy v3 onion services per session or per use-case (discovery vs messaging vs voice) to reduce correlation.
3. **Circuit isolation:** Use separate circuits for:
   - Discovery (e.g. contact lookup)
   - Request (e.g. Ping/Pong handshake)
   - Messaging (actual message traffic)
4. **Cover traffic:** Optional dummy packets on the same circuits to make traffic patterns less distinguishable.

## Implementation Notes

- **Dependency:** Add `arti-client`, `arti-tor-dirmgr`, and related crates under an optional feature (e.g. `arti`) so that Android can keep using C Tor until Arti is ready on mobile.
- **API surface:** Introduce a small abstraction (e.g. `TorRuntime` trait) so that either C Tor (SOCKS + control socket) or Arti can be plugged in. The rest of the code (Ping-Pong, packet handling, padding) stays unchanged.
- **Platforms:** Arti is well-supported on desktop and can be evaluated on Android/iOS via NDK or similar; performance and battery impact should be measured before full switch.

## References

- [Arti project](https://gitlab.torproject.org/tpo/core/arti)
- [Arti book](https://arti.torproject.org/)
- Tor rend-spec-v3 (hidden service protocol)
