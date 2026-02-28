#!/bin/bash
# Build Shield Messenger Rust core as WebAssembly for the web app
# Produces WASM module + JS bindings

set -e

echo "=== Building Shield Messenger Core for WebAssembly ==="

# Install target if not already installed
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# Check for wasm-bindgen
if ! command -v wasm-bindgen &> /dev/null; then
    echo "Installing wasm-bindgen-cli..."
    cargo install wasm-bindgen-cli
fi

# Check for wasm-opt (optional, for smaller builds)
WASM_OPT=""
if command -v wasm-opt &> /dev/null; then
    WASM_OPT="true"
fi

# Build
echo "Compiling Rust to WebAssembly..."
cargo build --target wasm32-unknown-unknown --release --features wasm

# Generate JS bindings
echo "Generating JavaScript bindings..."
WASM_OUT="../web/src/lib/wasm"
mkdir -p "$WASM_OUT"

wasm-bindgen \
    target/wasm32-unknown-unknown/release/shieldmessenger.wasm \
    --out-dir "$WASM_OUT" \
    --target web \
    --omit-default-module-path

# Optimize WASM (if wasm-opt available)
if [ "$WASM_OPT" = "true" ]; then
    echo "Optimizing WASM binary..."
    wasm-opt -Oz "$WASM_OUT/shieldmessenger_bg.wasm" -o "$WASM_OUT/shieldmessenger_bg.wasm"
fi

# Show output
WASM_SIZE=$(du -sh "$WASM_OUT/shieldmessenger_bg.wasm" 2>/dev/null | cut -f1)

echo ""
echo "=== WASM build complete ==="
echo "Output: web/src/lib/wasm/"
echo "  shieldmessenger_bg.wasm  ($WASM_SIZE)"
echo "  shieldmessenger.js"
echo "  shieldmessenger.d.ts"
