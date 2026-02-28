#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Build Rust core library for iOS targets
#
# Prerequisites:
#   rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
#
# Usage:
#   ./scripts/build-rust-ios.sh [debug|release]
#
# Output:
#   ios/Libraries/libshieldmessenger.a (universal binary)
# ─────────────────────────────────────────────────────────

PROFILE="${1:-release}"
RUST_DIR="../../shield-messenger-core"
OUTPUT_DIR="../ios/Libraries"

echo "╔══════════════════════════════════════╗"
echo "║  Shield Messenger — Rust iOS Build   ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Profile: $PROFILE"
echo "Rust dir: $RUST_DIR"

# Ensure targets are installed
echo "→ Checking Rust targets..."
rustup target add aarch64-apple-ios 2>/dev/null || true
rustup target add aarch64-apple-ios-sim 2>/dev/null || true
rustup target add x86_64-apple-ios 2>/dev/null || true

# Build for each target
cd "$RUST_DIR"

CARGO_FLAGS="--features ios"
if [ "$PROFILE" = "release" ]; then
  CARGO_FLAGS="$CARGO_FLAGS --release"
fi

echo ""
echo "→ Building for aarch64-apple-ios (device)..."
cargo build --target aarch64-apple-ios $CARGO_FLAGS

echo "→ Building for aarch64-apple-ios-sim (Apple Silicon simulator)..."
cargo build --target aarch64-apple-ios-sim $CARGO_FLAGS

echo "→ Building for x86_64-apple-ios (Intel simulator)..."
cargo build --target x86_64-apple-ios $CARGO_FLAGS

# Determine output path
if [ "$PROFILE" = "release" ]; then
  TARGET_DIR="target"
  BUILD_DIR="release"
else
  TARGET_DIR="target"
  BUILD_DIR="debug"
fi

# Create universal simulator library
echo ""
echo "→ Creating universal simulator library..."
mkdir -p "$OUTPUT_DIR"

lipo -create \
  "$TARGET_DIR/aarch64-apple-ios-sim/$BUILD_DIR/libshieldmessenger.a" \
  "$TARGET_DIR/x86_64-apple-ios/$BUILD_DIR/libshieldmessenger.a" \
  -output "$OUTPUT_DIR/libshieldmessenger-sim.a" 2>/dev/null || \
  cp "$TARGET_DIR/aarch64-apple-ios-sim/$BUILD_DIR/libshieldmessenger.a" \
     "$OUTPUT_DIR/libshieldmessenger-sim.a"

# Copy device library
cp "$TARGET_DIR/aarch64-apple-ios/$BUILD_DIR/libshieldmessenger.a" \
   "$OUTPUT_DIR/libshieldmessenger-device.a"

# Create XCFramework (preferred for modern Xcode)
echo "→ Creating XCFramework..."
rm -rf "$OUTPUT_DIR/ShieldMessenger.xcframework"
xcodebuild -create-xcframework \
  -library "$OUTPUT_DIR/libshieldmessenger-device.a" \
  -library "$OUTPUT_DIR/libshieldmessenger-sim.a" \
  -output "$OUTPUT_DIR/ShieldMessenger.xcframework" 2>/dev/null || \
  echo "  (XCFramework creation requires macOS — skipping on this platform)"

echo ""
echo "✅ Build complete!"
echo "   Device:    $OUTPUT_DIR/libshieldmessenger-device.a"
echo "   Simulator: $OUTPUT_DIR/libshieldmessenger-sim.a"
echo ""
echo "Next steps:"
echo "  1. Open ios/ShieldMessenger.xcworkspace in Xcode"
echo "  2. Add libshieldmessenger-device.a to Build Phases → Link Binary"
echo "  3. Set Library Search Paths to \$(PROJECT_DIR)/Libraries"
echo "  4. Set Bridging Header to ShieldMessenger-Bridging-Header.h"
