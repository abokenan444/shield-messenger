# Reproducible Builds — Verification Guide

Shield Messenger is committed to **fully reproducible builds** so that anyone — users, auditors, journalists, or distribution platforms like F-Droid — can independently verify that the published binaries match the source code with zero hidden modifications.

---

## Table of Contents

1. [Why Reproducible Builds?](#why-reproducible-builds)
2. [Prerequisites](#prerequisites)
3. [Verify the Rust Core Library](#verify-the-rust-core-library)
4. [Verify the Android APK](#verify-the-android-apk)
5. [Verify the iOS Build](#verify-the-ios-build)
6. [Verify the WASM / Web Build](#verify-the-wasm--web-build)
7. [F-Droid Compliance](#f-droid-compliance)
8. [Determinism Checklist](#determinism-checklist)
9. [CI Dual-Build Verification](#ci-dual-build-verification)
10. [Troubleshooting](#troubleshooting)
11. [Reporting Issues](#reporting-issues)

---

## Why Reproducible Builds?

| Benefit | Description |
|---------|-------------|
| **Trust Verification** | Users and auditors can independently verify that the distributed binary was built from the published source code with no hidden modifications. |
| **Supply Chain Security** | Detects compromised build environments, backdoored compilers, or tampered dependencies. |
| **Auditability** | A third party can confirm Shield Messenger binaries are clean without trusting the release maintainer. |
| **F-Droid Eligibility** | F-Droid requires reproducible builds for inclusion in their trusted repository. |
| **Regulatory Compliance** | Meets requirements for software used in sensitive environments (journalism, activism, legal). |

---

## Prerequisites

Install the following tools before attempting any verification:

| Tool | Version | Install Command | Purpose |
|------|---------|-----------------|---------|
| **Git** | 2.40+ | `apt install git` | Clone source code |
| **Rust** | 1.76+ (pinned) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | Compiler |
| **Docker** | 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) | Isolated build environment |
| **sha256sum** | Any | Pre-installed on Linux; `brew install coreutils` on macOS | Hash comparison |
| **Android SDK** | 34+ | [developer.android.com](https://developer.android.com/studio) | Android APK builds |
| **cargo-ndk** | 3.0+ | `cargo install cargo-ndk` | Cross-compile Rust to Android |
| **apksigner** | 34+ | Part of Android SDK build-tools | APK signature verification |
| **diffoscope** | Latest | `pip install diffoscope` | Binary diff analysis |

---

## Verify the Rust Core Library

The Rust core (`secure-legion-core`) is the cryptographic heart of the application. All platforms depend on it.

### Step 1: Clone the Repository

```bash
git clone https://github.com/abokenan444/shield-messenger.git
cd shield-messenger
# Checkout the exact release tag you want to verify
git checkout v1.0.0   # Replace with actual release tag
```

### Step 2: Verify the Toolchain

```bash
# The pinned toolchain is specified in rust-toolchain.toml
cat rust-toolchain.toml
# Install the exact version
rustup install $(grep channel rust-toolchain.toml | cut -d'"' -f2)
rustup override set $(grep channel rust-toolchain.toml | cut -d'"' -f2)
# Confirm
rustc --version --verbose
```

### Step 3a: Build Locally (Linux x86_64)

```bash
cd secure-legion-core

# Set deterministic RUSTFLAGS
export RUSTFLAGS="\
  -C codegen-units=1 \
  --remap-path-prefix=$(pwd)=shield-messenger \
  -C strip=none"

# Build with locked dependencies
cargo build --release --locked

# Compute hashes
sha256sum target/release/libsecurelegion.a
sha256sum target/release/libsecurelegion.so
```

### Step 3b: Build via Docker (Recommended)

Docker ensures an identical build environment regardless of your host OS:

```bash
# From repository root
docker build -t shield-build -f Dockerfile.reproducible .

# Extract the artifact
docker create --name shield-extract shield-build
docker cp shield-extract:/app/target/release/libsecurelegion.a ./local-libsecurelegion.a
docker cp shield-extract:/app/target/release/libsecurelegion.so ./local-libsecurelegion.so
docker rm shield-extract

# Compute hashes
sha256sum local-libsecurelegion.a
sha256sum local-libsecurelegion.so
```

### Step 4: Compare Against Published Release

```bash
# Download the official release artifact
RELEASE_TAG="v1.0.0"  # Replace with actual tag
curl -LO "https://github.com/abokenan444/shield-messenger/releases/download/${RELEASE_TAG}/libsecurelegion.a"
curl -LO "https://github.com/abokenan444/shield-messenger/releases/download/${RELEASE_TAG}/SHA256SUMS.txt"

# Verify the hash
sha256sum -c SHA256SUMS.txt

# Or compare manually
echo "=== Published hash ==="
grep libsecurelegion.a SHA256SUMS.txt
echo "=== Your local hash ==="
sha256sum local-libsecurelegion.a
```

**Expected result:** Both hashes must be identical. If they differ, see [Troubleshooting](#troubleshooting).

---

## Verify the Android APK

### Step 1: Build the Native Libraries

```bash
cd secure-legion-core

# Install Android targets
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android

# Build for all Android architectures
export RUSTFLAGS="\
  -C codegen-units=1 \
  --remap-path-prefix=$(pwd)=shield-messenger \
  -C strip=none"

cargo ndk \
  -t aarch64-linux-android \
  -t armv7-linux-androideabi \
  -t x86_64-linux-android \
  build --release --locked

# Copy .so files to jniLibs
mkdir -p ../app/src/main/jniLibs/{arm64-v8a,armeabi-v7a,x86_64}
cp target/aarch64-linux-android/release/libsecurelegion.so ../app/src/main/jniLibs/arm64-v8a/
cp target/armv7-linux-androideabi/release/libsecurelegion.so ../app/src/main/jniLibs/armeabi-v7a/
cp target/x86_64-linux-android/release/libsecurelegion.so ../app/src/main/jniLibs/x86_64/
```

### Step 2: Build the APK

```bash
cd ..  # Back to repository root

# Set deterministic build properties
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)

# Build release APK
./gradlew assembleRelease \
  -Dorg.gradle.daemon=false \
  -Pandroid.enableDeterministicApk=true

# The APK is at:
ls -la app/build/outputs/apk/release/app-release-unsigned.apk
```

### Step 3: Verify APK Contents

```bash
# Extract and hash the native libraries inside the APK
unzip -o app/build/outputs/apk/release/app-release-unsigned.apk -d apk-contents/

sha256sum apk-contents/lib/arm64-v8a/libsecurelegion.so
sha256sum apk-contents/lib/armeabi-v7a/libsecurelegion.so
sha256sum apk-contents/lib/x86_64/libsecurelegion.so

# These should match the hashes from Step 1
```

### Step 4: Compare with Published APK

```bash
# Download the published APK
RELEASE_TAG="v1.0.0"
curl -LO "https://github.com/abokenan444/shield-messenger/releases/download/${RELEASE_TAG}/shield-messenger-${RELEASE_TAG}.apk"

# Use diffoscope for detailed comparison (ignores signing differences)
diffoscope \
  --exclude-directory-metadata=yes \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  shield-messenger-${RELEASE_TAG}.apk

# Or compare just the native libraries
unzip -o shield-messenger-${RELEASE_TAG}.apk -d published-apk/
diff <(sha256sum apk-contents/lib/arm64-v8a/libsecurelegion.so) \
     <(sha256sum published-apk/lib/arm64-v8a/libsecurelegion.so)
```

### APK Reproducibility Notes

- The APK **signature** will always differ (it uses your local keystore). Compare the **unsigned** APK contents.
- Android Gradle Plugin must use deterministic resource ordering (`android.enableDeterministicApk=true`).
- Timestamp-dependent fields (build date, version code derived from date) are pinned via `SOURCE_DATE_EPOCH`.
- The `classes.dex` hash may vary with different JDK versions — use the JDK version specified in `gradle.properties`.

---

## Verify the iOS Build

iOS reproducible builds are more challenging due to Apple's toolchain, but the Rust core library can still be verified:

### Step 1: Build the Rust Core for iOS

```bash
cd secure-legion-core

# Install iOS targets
rustup target add aarch64-apple-ios aarch64-apple-ios-sim

export RUSTFLAGS="\
  -C codegen-units=1 \
  --remap-path-prefix=$(pwd)=shield-messenger \
  -C strip=none"

# Build for device
cargo build --target aarch64-apple-ios --release --locked

# Build for simulator
cargo build --target aarch64-apple-ios-sim --release --locked

# Compute hashes
sha256sum target/aarch64-apple-ios/release/libsecurelegion.a
sha256sum target/aarch64-apple-ios-sim/release/libsecurelegion.a
```

### Step 2: Compare with Published Hashes

```bash
RELEASE_TAG="v1.0.0"
curl -LO "https://github.com/abokenan444/shield-messenger/releases/download/${RELEASE_TAG}/SHA256SUMS-ios.txt"
sha256sum -c SHA256SUMS-ios.txt
```

### iOS Limitations

- The final `.ipa` file cannot be fully reproduced due to Apple's code signing and entitlements.
- However, the **Rust core library** (which contains all cryptographic logic) **can** be reproduced and verified independently.
- The Swift/Objective-C layer can be audited via source code review.

---

## Verify the WASM / Web Build

### Step 1: Build WASM

```bash
cd secure-legion-core

rustup target add wasm32-unknown-unknown

export RUSTFLAGS="\
  -C codegen-units=1 \
  --remap-path-prefix=$(pwd)=shield-messenger \
  -C strip=none"

cargo build \
  --target wasm32-unknown-unknown \
  --features wasm \
  --no-default-features \
  --release \
  --locked

sha256sum target/wasm32-unknown-unknown/release/securelegion.wasm
```

### Step 2: Build the Web Frontend

```bash
cd ../web

# Pin Node.js version
nvm use $(cat .nvmrc 2>/dev/null || echo "22")

# Install with locked dependencies
pnpm install --frozen-lockfile

# Build with deterministic output
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) pnpm build

# Hash the output
find dist -type f -exec sha256sum {} \; | sort -k2 > web-hashes.txt
cat web-hashes.txt
```

### Step 3: Compare

```bash
RELEASE_TAG="v1.0.0"
curl -LO "https://github.com/abokenan444/shield-messenger/releases/download/${RELEASE_TAG}/web-hashes.txt"
diff web-hashes.txt web-hashes-published.txt
```

---

## F-Droid Compliance

Shield Messenger is designed to meet [F-Droid's reproducible build requirements](https://f-droid.org/docs/Reproducible_Builds/):

### Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Source code fully available | Yes | GitHub repository, AGPL-3.0 license |
| No proprietary dependencies | Yes | All dependencies are open-source |
| Deterministic build output | Yes | Docker-based build, pinned toolchain |
| No Google Play Services | Yes | Uses UnifiedPush for notifications |
| Reproducible APK | Yes | `diffoscope` verification in CI |
| Metadata file | Yes | `fastlane/metadata/` directory |

### F-Droid Build Recipe

The following `fdroid` build recipe can be used:

```yaml
AutoName: Shield Messenger
RepoType: git
Repo: https://github.com/abokenan444/shield-messenger.git

Builds:
  - versionName: 1.0.0
    versionCode: 100
    commit: v1.0.0
    subdir: app
    gradle:
      - fdroid
    prebuild:
      - cd ../secure-legion-core
      - cargo ndk -t aarch64-linux-android -t armv7-linux-androideabi build --release --locked
      - cp target/aarch64-linux-android/release/libsecurelegion.so ../app/src/main/jniLibs/arm64-v8a/
      - cp target/armv7-linux-androideabi/release/libsecurelegion.so ../app/src/main/jniLibs/armeabi-v7a/

AutoUpdateMode: Version
UpdateCheckMode: Tags
CurrentVersion: 1.0.0
CurrentVersionCode: 100
```

---

## Determinism Checklist

The following measures ensure build-to-build determinism:

| Requirement | Status | Implementation |
|-------------|--------|---------------|
| Pinned Rust toolchain | Yes | `rust-toolchain.toml` with exact version |
| Locked dependencies | Yes | `Cargo.lock` committed, `--locked` flag |
| Pinned Docker base image | Yes | Dockerfile uses `@sha256:...` digest |
| No timestamps in binary | Yes | `RUSTFLAGS` + `SOURCE_DATE_EPOCH` |
| Deterministic ordering | Yes | `codegen-units=1` in RUSTFLAGS |
| No path-dependent output | Yes | `--remap-path-prefix` in RUSTFLAGS |
| SBOM generation | Yes | `cargo-sbom` in Dockerfile |
| Dependency audit | Yes | `cargo-audit` in CI + Dockerfile |
| Pinned Node.js version | Yes | `.nvmrc` + `pnpm install --frozen-lockfile` |
| Pinned JDK version | Yes | `gradle.properties` specifies JDK |

### Key RUSTFLAGS

```bash
RUSTFLAGS="\
  -C codegen-units=1 \
  --remap-path-prefix=/app=shield-messenger \
  -C strip=none"
```

- `codegen-units=1` — Forces single-threaded codegen for deterministic output
- `--remap-path-prefix` — Removes host-specific paths from debug info
- `strip=none` — Preserves symbol table for verification (stripped separately for release)

---

## CI Dual-Build Verification

The GitHub Actions CI pipeline includes a `reproducible-build-check` job that performs a **dual build** on every release:

1. **Build A**: Builds the Rust core library from a clean checkout
2. **Build B**: Builds the same library again from a fresh clean checkout
3. **Compare**: Computes SHA-256 of both outputs and fails if they differ
4. **Publish**: Attaches `SHA256SUMS.txt` to the GitHub Release

This runs automatically on every tagged release (`v*`). See `.github/workflows/reproducible.yml`.

---

## Troubleshooting

### Hash Mismatch — Common Causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Different hash on macOS vs Linux | Different host OS | Use Docker build (Step 3b) |
| Different hash with same OS | Different Rust version | Check `rust-toolchain.toml`, run `rustup override set ...` |
| WASM hash differs | Different `wasm-opt` version | Use Docker build |
| APK hash differs | Different JDK version | Check `gradle.properties` for required JDK |
| APK hash differs (signing only) | Different keystore | Compare unsigned APK contents, not signed |
| Random hash changes | Non-deterministic codegen | Ensure `codegen-units=1` is set |

### Debug Steps

```bash
# 1. Verify your Rust toolchain matches exactly
rustc --version --verbose
cat rust-toolchain.toml

# 2. Verify Cargo.lock is not modified
git diff Cargo.lock

# 3. Check RUSTFLAGS
echo $RUSTFLAGS

# 4. Use diffoscope for detailed binary comparison
diffoscope your-build.a published-build.a

# 5. Check for path leaks in the binary
strings your-build.a | grep -i "home\|user\|ubuntu"
```

### Known Limitations

- **macOS builds** may produce different hashes than Linux builds due to linker differences. Always use Docker for cross-platform verification.
- **iOS .ipa** files cannot be fully reproduced due to Apple's code signing. Verify the Rust core library separately.
- **Android APK signatures** will always differ. Compare unsigned APK contents using `diffoscope`.

---

## Reporting Issues

If you cannot reproduce a build, please open an issue at [GitHub Issues](https://github.com/abokenan444/shield-messenger/issues) with:

1. Your OS and architecture (`uname -a`)
2. Rust toolchain version (`rustc --version --verbose`)
3. Docker version (`docker --version`) if using Docker build
4. The hash you computed vs. the published hash
5. Full build log (attach as a file)
6. Output of `diffoscope` if available

**Security contact:** security@shieldmessenger.com
