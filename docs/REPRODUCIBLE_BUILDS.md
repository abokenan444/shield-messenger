# Reproducible Builds

Shield Messenger aims for fully reproducible builds so that anyone can verify the published binaries match the source code.

---

## Why Reproducible Builds?

1. **Trust Verification** — Users and auditors can independently verify that the distributed binary was built from the published source code with no hidden modifications.
2. **Supply Chain Security** — Detects compromised build environments, backdoored compilers, or tampered dependencies.
3. **Auditability** — A third party can confirm shield-messenger binaries are clean without trusting the release maintainer.

---

## Rust Core Library

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Rust** | 1.76+ (pinned in `rust-toolchain.toml`) | Compiler |
| **Docker** | 24+ | Isolated build environment |
| **sha256sum** | Any | Hash comparison |

### Build Locally

```bash
cd secure-legion-core

# Use the exact toolchain version specified in rust-toolchain.toml
rustup install $(cat rust-toolchain.toml | grep channel | cut -d'"' -f2)

# Build with locked dependencies
cargo build --release --locked

# Compute hash
sha256sum target/release/libsecurelegion.a
sha256sum target/release/libsecurelegion.so  # Linux
```

### Build via Docker (Recommended)

The Dockerfile provides a pinned, deterministic build environment:

```bash
# From repository root
docker build -t shield-build .

# Extract the artifact
docker create --name shield-extract shield-build
docker cp shield-extract:/app/target/release/libsecurelegion.a ./libsecurelegion.a
docker rm shield-extract

# Compute hash
sha256sum libsecurelegion.a
```

### Verify Against Release

```bash
# Download the release artifact
curl -LO https://github.com/abokenan444/shield-messenger/releases/download/vX.Y.Z/libsecurelegion.a

# Compare hashes
sha256sum libsecurelegion.a
# Should match the hash published in the release notes
```

---

## Determinism Checklist

The following measures are in place to ensure build determinism:

| Requirement | Status | Implementation |
|-------------|--------|---------------|
| Pinned Rust toolchain | ✅ | `rust-toolchain.toml` |
| Locked dependencies | ✅ | `Cargo.lock` committed, `--locked` flag |
| Pinned Docker base image | ✅ | Dockerfile uses `@sha256:...` digest |
| No timestamps in binary | ✅ | `RUSTFLAGS` set in Dockerfile |
| Deterministic ordering | ✅ | Rust compiler default, `codegen-units=1` |
| No path-dependent output | ✅ | `--remap-path-prefix` in Dockerfile |
| SBOM generation | ✅ | `cargo-sbom` in Dockerfile |
| Dependency audit | ✅ | `cargo-audit` in CI + Dockerfile |

### Key RUSTFLAGS

```
RUSTFLAGS="\
  -C codegen-units=1 \
  --remap-path-prefix=/app=shield-messenger \
  -C strip=none"
```

- `codegen-units=1` — Forces single-threaded codegen for deterministic output
- `--remap-path-prefix` — Removes host-specific paths from debug info
- `strip=none` — Preserves symbol table for verification (stripped separately for release)

---

## Android APK

For Android builds, reproducible APK generation requires:

```bash
# Build Rust libraries for Android targets
cd secure-legion-core
cargo ndk \
  -t aarch64-linux-android \
  -t armv7-linux-androideabi \
  -t x86_64-linux-android \
  build --release --locked

# Copy .so files to jniLibs
cp target/aarch64-linux-android/release/libsecurelegion.so \
   ../app/src/main/jniLibs/arm64-v8a/

cp target/armv7-linux-androideabi/release/libsecurelegion.so \
   ../app/src/main/jniLibs/armeabi-v7a/

# Build APK with Gradle
cd ..
./gradlew assembleRelease

# Verify APK contents
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

### APK Reproducibility Notes

- Android Gradle Plugin must use deterministic resource ordering
- The signing key must be consistent (use the same keystore)
- Timestamp-dependent fields (build date, version code derived from date) must be pinned

---

## WASM Build

```bash
cd secure-legion-core

# Build for WASM target
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --features wasm --no-default-features --release --locked

# Compute hash
sha256sum target/wasm32-unknown-unknown/release/securelegion.wasm
```

---

## CI Verification

The GitHub Actions CI pipeline includes a `reproducible-build` job that:

1. Builds the Rust core library twice from scratch
2. Compares SHA-256 hashes of both outputs
3. Reports any discrepancy as a CI failure

See `.github/workflows/ci.yml` for the full workflow.

---

## Reporting Issues

If you cannot reproduce a build, please open an issue with:

1. Your OS and architecture
2. Rust toolchain version (`rustc --version --verbose`)
3. Docker version (if using Docker build)
4. The hash you computed vs. the published hash
5. Full build log

Contact: security@shieldmessenger.com
