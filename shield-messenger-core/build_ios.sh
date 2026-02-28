#!/bin/bash
# Build Shield Messenger Rust core for iOS targets
# Produces libshieldmessenger.a static library for Xcode

set -e

echo "=== Building Shield Messenger Core for iOS ==="

# Required targets
TARGETS=(
    "aarch64-apple-ios"          # iPhone (ARM64)
    "aarch64-apple-ios-sim"      # iPhone Simulator (Apple Silicon)
    "x86_64-apple-ios"           # iPhone Simulator (Intel)
)

# Install targets if not already installed
for target in "${TARGETS[@]}"; do
    rustup target add "$target" 2>/dev/null || true
done

# Build for each target
for target in "${TARGETS[@]}"; do
    echo "Building for $target..."
    cargo build --target "$target" --release
done

# Create universal binary for simulator (x86_64 + arm64)
echo "Creating universal binary for simulator..."
mkdir -p ../ios/ShieldMessenger/lib

lipo -create \
    target/aarch64-apple-ios-sim/release/libshieldmessenger.a \
    target/x86_64-apple-ios/release/libshieldmessenger.a \
    -output ../ios/ShieldMessenger/lib/libshieldmessenger-sim.a

# Copy device binary
cp target/aarch64-apple-ios/release/libshieldmessenger.a \
   ../ios/ShieldMessenger/lib/libshieldmessenger-device.a

# Generate C header for Swift bridging
echo "Generating C header..."
if command -v cbindgen &> /dev/null; then
    cbindgen --config cbindgen.toml --crate shieldmessenger --output ../ios/ShieldMessenger/Sources/Core/shieldmessenger.h
else
    echo "Warning: cbindgen not found. Install with: cargo install cbindgen"
    echo "Generating placeholder header..."
    cat > ../ios/ShieldMessenger/Sources/Core/shieldmessenger.h << 'EOF'
#ifndef SHIELDMESSENGER_H
#define SHIELDMESSENGER_H

#include <stdint.h>
#include <stdlib.h>

// Initialize the library
int32_t sl_init(void);

// Key generation
int32_t sl_generate_keypair(uint8_t *out_public_key, uint8_t *out_private_key);

// Encryption
int32_t sl_encrypt(const uint8_t *plaintext, size_t plaintext_len,
                   const uint8_t *key, size_t key_len,
                   uint8_t *out_ciphertext, size_t *out_ciphertext_len);

// Decryption
int32_t sl_decrypt(const uint8_t *ciphertext, size_t ciphertext_len,
                   const uint8_t *key, size_t key_len,
                   uint8_t *out_plaintext, size_t *out_plaintext_len);

// Password hashing
int32_t sl_hash_password(const char *password, const uint8_t *salt,
                         size_t salt_len, uint8_t *out_hash, size_t hash_len);

// Version
char *sl_version(void);

// Memory management
void sl_free_string(char *s);
void sl_free_bytes(uint8_t *ptr, size_t len, size_t cap);

#endif
EOF
fi

echo ""
echo "=== iOS build complete ==="
echo "Libraries:"
echo "  Device:    ios/ShieldMessenger/lib/libshieldmessenger-device.a"
echo "  Simulator: ios/ShieldMessenger/lib/libshieldmessenger-sim.a"
echo "  Header:    ios/ShieldMessenger/Sources/Core/shieldmessenger.h"
