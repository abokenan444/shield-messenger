#!/bin/bash
# Build Shield Messenger Rust core to WebAssembly
#
# Prerequisites:
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli
#
# Usage: ./build_wasm.sh [--release]

set -e

cd "$(dirname "$0")/../shield-messenger-core"

BUILD_MODE="${1:---release}"
PROFILE="release"
if [ "$BUILD_MODE" = "--debug" ]; then
    PROFILE="debug"
fi

echo "==> Building Rust core for WASM ($PROFILE)..."
cargo build --target wasm32-unknown-unknown --features wasm --no-default-features $BUILD_MODE

echo "==> Running wasm-bindgen..."
WASM_FILE="target/wasm32-unknown-unknown/$PROFILE/shieldmessenger.wasm"

if [ ! -f "$WASM_FILE" ]; then
    echo "ERROR: WASM file not found at $WASM_FILE"
    exit 1
fi

OUT_DIR="../web/src/wasm"
mkdir -p "$OUT_DIR"

wasm-bindgen \
    --out-dir "$OUT_DIR" \
    --target web \
    --omit-default-module-path \
    "$WASM_FILE"

echo "==> WASM module built successfully!"
echo "    Output: $OUT_DIR/"
echo "    Files:"
ls -la "$OUT_DIR/"
