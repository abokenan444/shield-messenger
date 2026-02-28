# Shield Messenger — Technical Architecture Document

## Multi-Platform Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Shield Messenger Platform                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Android    │     iOS      │     Web      │    Desktop     │
│   Kotlin     │  Swift/UI    │  React/TS    │  Tauri/React   │
│   Material3  │  SwiftUI     │  Tailwind    │  Tailwind      │
├──────────────┴──────────────┴──────────────┴────────────────┤
│              Platform Bindings (FFI Layer)                    │
│   JNI (Android) │ C FFI (iOS) │ WASM (Web) │ FFI (Desktop) │
├─────────────────────────────────────────────────────────────┤
│                 Rust Core Library                            │
│  ┌───────────┬───────────┬───────────┬───────────────────┐  │
│  │ Secure    │  Crypto   │  Storage  │   Protocol        │  │
│  │ Shield    │  Engine   │  Engine   │   Handler         │  │
│  │ Protocol  │           │           │                   │  │
│  │ • PingPong│ •XChaCha20│ • SQLCipher│ • Messages       │  │
│  │ • Tor HS  │ • Ed25519 │ • KV Store│ • Presence        │  │
│  │ • P2P     │ • X25519  │ • Files   │ • Typing          │  │
│  │ • SOCKS5  │ • ML-KEM  │ • Backup  │ • Calls           │  │
│  │ • Relay   │ • Argon2  │           │ • Payments        │  │
│  └───────────┴───────────┴───────────┴───────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│              Shield Messenger Protocol (P2P over Tor)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tor Hidden Services │ Ping-Pong Wake │ Direct P2P    │   │
│  │ Triple .onion Arch  │ Friend Request │ SOCKS5 Proxy  │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│              External Services (Payments Only)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Zcash (ZEC Shielded)  │  Solana (SOL/USDC/USDT)   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
shield-messenger/
├── shield-messenger-core/           # Rust shared core library
│   ├── src/
│   │   ├── lib.rs                # Library entry point
│   │   ├── crypto/               # Cryptographic operations
│   │   ├── network/              # Tor, Ping-Pong, SOCKS5, P2P
│   │   ├── protocol/             # Message & contact types
│   │   ├── nlx402/               # Payment protocol (NLx402)
│   │   ├── audio/                # Audio processing
│   │   ├── crdt/                 # Conflict-free replicated data types
│   │   └── ffi/
│   │       ├── android.rs        # JNI bindings
│   │       ├── ios.rs            # C FFI for Swift
│   │       └── wasm.rs           # WASM bindings
│   ├── Cargo.toml
│   └── build_*.sh
│
├── app/                          # Android app (Kotlin)
│   ├── src/main/
│   │   ├── java/com/shieldmessenger/
│   │   ├── jniLibs/
│   │   └── res/
│   └── build.gradle.kts
│
├── web/                          # Web app (React + TypeScript)
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page routes
│   │   ├── lib/                  # Core logic & protocol client
│   │   ├── hooks/                # React hooks
│   │   ├── styles/               # CSS / Tailwind
│   │   └── assets/               # Static assets
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── ios/                          # iOS app (Swift/SwiftUI)
│   └── ShieldMessenger/
│       ├── Sources/
│       │   ├── Core/             # Rust FFI bridge
│       │   ├── Views/            # SwiftUI views
│       │   ├── Models/           # Data models
│       │   ├── Services/         # Background services
│       │   └── Utils/            # Utilities
│       └── Package.swift
│
├── shared/                       # Shared protocol definitions
│   ├── proto/                    # Protocol buffer definitions
│   └── types/                    # Shared type definitions
│
├── docs/                         # Documentation
│   ├── VISION.md
│   └── ARCHITECTURE.md
│
├── build.gradle.kts              # Android root build
├── settings.gradle.kts
└── README.md
```

## Technology Stack Details

### Rust Core (Shared Across All Platforms)
- **Custom P2P Protocol**: Shield Messenger Protocol — direct peer-to-peer messaging over Tor hidden services
- **Network Layer**: Tor integration, Ping-Pong wake protocol, SOCKS5 proxy, friend request server
- **Cryptography**: XChaCha20-Poly1305 (messages), Ed25519 (signatures), X25519 + ML-KEM-1024 (hybrid post-quantum key exchange), Argon2id (password hashing)
- **Forward Secrecy**: Chain key evolution with root key derivation, message key ratcheting
- **Storage**: SQLCipher via `rusqlite` for encrypted local databases
- **Payments**: NLx402-based Secure Pay protocol (Zcash shielded, Solana SPL tokens)
- **Serialization**: serde, bincode, CBOR
- **Compilation Targets**:
  - `aarch64-linux-android` — Android ARM64
  - `aarch64-apple-ios` — iOS ARM64
  - `wasm32-unknown-unknown` — WebAssembly
  - `x86_64-unknown-linux-gnu` — Desktop (Linux)
  - `x86_64-pc-windows-msvc` — Desktop (Windows)
  - `aarch64-apple-darwin` — Desktop (macOS Apple Silicon)

### Web App
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Protocol**: Rust WASM core (Shield Messenger Protocol — all crypto and networking runs in Rust)
- **State Management**: Zustand
- **Routing**: React Router 7
- **Cryptography**: Rust WASM module (no JavaScript crypto — all crypto runs in Rust)

### iOS App
- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI
- **Architecture**: MVVM + Repository pattern
- **Storage**: Core Data + SQLCipher
- **Rust Bridge**: C FFI via `cbindgen`
- **Key Storage**: Secure Enclave

### Android App (Existing, Enhanced)
- **Language**: Kotlin
- **UI Framework**: Material Design 3 + Jetpack Compose
- **Architecture**: MVVM + Repository pattern
- **Storage**: Room + SQLCipher
- **Rust Bridge**: JNI via `jni` crate
- **Key Storage**: StrongBox / TEE

---

## Security Architecture

### Encryption Layers
1. **Transport Layer**: Tor onion routing (triple `.onion` architecture) — all traffic is anonymized
2. **Key Exchange Layer**: X25519 + ML-KEM-1024 hybrid post-quantum key exchange
3. **Message Layer**: XChaCha20-Poly1305 with forward secrecy via chain key evolution
4. **Authentication Layer**: Ed25519 digital signatures for identity and message integrity
5. **Storage Layer**: SQLCipher (AES-256-GCM) for local database encryption
6. **Backup Layer**: Client-side encryption with user-held keys only

### Key Management
- **Android**: Hardware-backed keys (StrongBox / Trusted Execution Environment)
- **iOS**: Secure Enclave for private key storage
- **Web**: Web Crypto API + encrypted IndexedDB
- **Verification**: Key verification via Safety Numbers and QR code scanning

### Threat Model
- **Protected Against**: Passive surveillance, MITM attacks, server compromise, metadata analysis, future quantum attacks (ML-KEM-1024)
- **Not Protected Against**: Hardware implants, endpoint compromise (keyloggers), physical coercion

---

## Shield Messenger Protocol

### Peer-to-Peer Architecture
- Fully peer-to-peer — no central server, no homeserver, no federation
- All communication routed through Tor hidden services for anonymity
- Triple `.onion` architecture for defense-in-depth

### Ping-Pong Wake Protocol
- Custom wake protocol for reliable P2P message delivery
- Handles peer availability detection and message queuing
- Ensures messages are delivered even when recipients are intermittently online

### Friend Request & Contact Exchange
- Secure contact exchange via dedicated endpoints
- Ed25519 public key-based identity verification
- QR code scanning for in-person key verification

### Message Delivery
- Direct encrypted messaging between peers via Tor
- XChaCha20-Poly1305 encryption with per-message key evolution
- Ed25519 signatures on every message for authenticity
- Replay attack protection via nonce cache
- Support for 1:1 and group conversations

### External Services (Payments Only)
- **Zcash**: ZEC shielded transactions for private payments
- **Solana**: SOL, USDC, USDT via SPL token transfers
- NLx402-based Secure Pay protocol for in-chat payments
- All other functionality is entirely self-contained
