# Shield Messenger — Vision & Comprehensive Whitepaper

## 1. Vision & Mission

**Vision:**
A digital world where individuals and communities regain full control over their privacy, and trust is the foundation of every connection.

**Mission:**
To build a communication platform that puts the user first, through a design that collects no data, permits no surveillance, and makes privacy a guaranteed right — with a sustainable economic model that never relies on exploiting user information.

---

## 2. Core Principles

1. **Privacy by Design:** Privacy is built into the core of the application, not added as an afterthought.
2. **End-to-End Encryption (E2EE):** No one can read your messages — not even us.
3. **Full Transparency:** The entire codebase is open source for public review and audit.
4. **Decentralization:** No single point of control — fully peer-to-peer with no central servers.
5. **Cost-Recovery Only:** An ethical business model aimed at sustainability, not profit extraction.
6. **No External Dependencies:** The app handles all encryption, routing, and message delivery internally — the only external services are blockchain payment networks (Zcash, Solana).

---

## 3. Technical Architecture

### 3.1 Shield Messenger Protocol (Custom P2P)
- **Fully Self-Contained:** The application handles all encryption, message routing, sending, receiving, and decryption — no external messaging servers or third-party protocols.
- **Peer-to-Peer over Tor:** All communication is routed through Tor hidden services using a triple `.onion` architecture for maximum anonymity.
- **Ping-Pong Wake Protocol:** A custom protocol that enables reliable message delivery between peers, even when both parties are intermittently online.
- **No Server Dependency:** Users connect directly to each other via Tor. No homeserver, no federation, no centralized infrastructure required.
- **Open Source:** The entire protocol and implementation is open source for public review and audit.

### 3.2 Encryption Layers
- **Key Exchange:** X25519 + ML-KEM-1024 hybrid post-quantum key exchange — resistant to both classical and quantum attacks.
- **Message Encryption:** XChaCha20-Poly1305 with forward secrecy through key evolution (chain key derivation).
- **Signatures:** Ed25519 digital signatures for message authentication and identity verification.
- **Files:** Client-side encryption before transmission — files are encrypted locally using the user's keys only.
- **Identity:** Ed25519 public key-based identity — no phone numbers, no email, no external identifiers.
- **Password Hashing:** Argon2id for secure password-derived keys.

### 3.3 Permission Model (Principle of Least Privilege)
- **Contacts:** Optional — only used for display names, never reads the full contact list.
- **Microphone & Camera:** Requested only during active calls, revoked immediately after.
- **Files & Photos:** Limited access only when attaching a file, with protection against reading other files.
- **Location:** Never requested — users can manually share location once via external maps.

---

## 4. Free Features (Available to Everyone)

1. Fully encrypted text messages with edit and delete-for-everyone.
2. E2EE voice and video calls with high quality.
3. Groups with up to 100 members.
4. Media sharing up to 100 MB.
5. Free access to public servers (with full privacy — no data collection).
6. Multi-Factor Authentication (2FA) support.
7. Incognito mode — hide "last seen" and "typing" indicators.
8. Secret conversations — disappearing messages with sender-defined timers.

---

## 5. Premium Features (For Supporting Subscribers)

These features fund operational costs (servers, development, support) and are entirely optional. They do not affect the security or privacy of free users.

### 5.1 Custom Domains
Use a custom domain (@mycompany.com) instead of the public domain (@messenger.app). Ideal for organizations wanting a trusted digital identity.

### 5.2 Additional Encrypted Storage
Increase media and file storage from 100 MB to larger tiers (10 GB, 50 GB, unlimited). For users who exchange large files or need long-term conversation archives.

### 5.3 Private Relay Node
Run your own Shield Messenger relay node for enhanced privacy and faster connections within your organization. Complete privacy — all data is encrypted end-to-end and the node operator cannot read messages.

### 5.4 Advanced Group & Enterprise Tools
Admin dashboard, centralized user management, locally-encrypted audit logs, unlimited group members.

### 5.5 Priority Support
Dedicated direct support channel (chat/email) with priority resolution.

### 5.6 Themes & Verified Plugins
A marketplace for premium themes and security-audited plugins to customize the app.

### 5.7 Automatic Encrypted Backup
Automatically back up conversations and media to an encrypted cloud (using the user's key only) for seamless device migration.

---

## 6. Business Model

- **Monthly Subscriptions:** Modest fees for premium features (individual and enterprise).
- **Community Funding:** Donations via Patreon or Open Collective.
- **Grants & Sponsorships:** Applications to privacy-focused organizations (Mozilla Foundation, Open Technology Fund, etc.).
- **No Ads. No Data Sales. Ever.** Revenue never depends on exploiting user information.

---

## 7. Target Platforms

| Platform | Technology | Status |
|----------|-----------|--------|
| Android | Kotlin + Rust Core (JNI) | Existing — being updated |
| iOS | Swift/SwiftUI + Rust Core (C FFI) | New |
| Web | React + TypeScript + Rust Core (WASM) | New |
| Desktop | Electron/Tauri + Rust Core | Planned |

---

## 8. Implementation Roadmap

### Phase 1 — Foundation (6 months)
- Build the shared core (Rust Core with custom P2P protocol over Tor).
- Develop a basic web app for encrypted messaging.
- Update the existing Android app.
- Launch a closed beta for security testing.

### Phase 2 — Growth (6 months)
- Add E2EE voice and video calls.
- Launch the iOS app.
- Roll out the first premium features.

### Phase 3 — Sustainability (Ongoing)
- Continuous security improvements based on community feedback.
- Add features driven by user demand.
- Expand the development and support team.

---

## 9. How We Ensure Trust

- **Fully Open Source:** Hosted on GitHub with clear documentation.
- **Architectural Whitepapers:** Published papers detailing every security mechanism.
- **Active Community:** Open discussion channels for users and developers.
- **Plain-Language Privacy Policy:** No complex legal jargon — clear, honest explanations.
- **Independent Security Audits:** Regular third-party code reviews by independent security firms.
- **Bug Bounty Program:** Continuous security updates with a dedicated security team.

---

## 10. Summary

Shield Messenger is not just another messaging app — it is a movement to reclaim the right to privacy. It combines military-grade security, true peer-to-peer communication over Tor, post-quantum cryptography, and full transparency with an ethical business model that ensures its longevity without compromising its principles.

Free users get an excellent, secure service. Supporting subscribers get valuable features while contributing to building a better digital future.

**Together, we can build a real alternative that puts privacy above all else.**
