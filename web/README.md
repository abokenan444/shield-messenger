# Shield Messenger — Web App

Progressive Web App (PWA) client for Shield Messenger. All cryptographic operations run in Rust compiled to WebAssembly — zero JS crypto.

## Prerequisites

- **Node.js** 18+
- **Rust** toolchain with `wasm32-unknown-unknown` target
- **wasm-bindgen-cli** (`cargo install wasm-bindgen-cli`)

## Building the WASM Module

The WASM module must be compiled from the Rust core before the web app can function.

### Linux / macOS

```bash
cd shield-messenger-core
./build_wasm.sh
```

### Windows (PowerShell)

```powershell
cd shield-messenger-core

# Add WASM target (one-time)
rustup target add wasm32-unknown-unknown

# Build the WASM binary
cargo build --target wasm32-unknown-unknown --release --features wasm

# Generate JS bindings
wasm-bindgen --out-dir ../web/src/wasm --target web --omit-default-module-path `
  target/wasm32-unknown-unknown/release/shieldmessenger.wasm
```

The build outputs four files to `web/src/wasm/`:
- `shieldmessenger.js` — JS bindings
- `shieldmessenger.d.ts` — TypeScript types
- `shieldmessenger_bg.wasm` — Compiled WASM binary
- `shieldmessenger_bg.wasm.d.ts` — Memory interface types

## Development

```bash
cd web
npm install
npm run dev
```

Opens at http://localhost:3000

## Production Build

```bash
cd web
npm run build
```

Output goes to `web/dist/`. Deploy the contents of `dist/` to your web server.

## Deployment

```bash
scp -r web/dist/* root@76.13.39.201:/var/www/shieldmessenger/web/dist/
```

## Tech Stack

- **Framework**: React 19 + TypeScript 5.6
- **Build**: Vite 6
- **State**: Zustand 5
- **Crypto**: Rust WASM (Ed25519, X25519, XChaCha20-Poly1305, Argon2id, ML-KEM-1024)
- **Transport**: WebSocket relay (E2E encrypted)
