//
//  SecureLegion-Bridging-Header.h
//  Shield Messenger — C FFI declarations for Rust core library
//
//  This header declares the C functions exported by libsecurelegion.a
//  so they can be called from Swift via RustBridge.swift.
//

#ifndef SecureLegion_Bridging_Header_h
#define SecureLegion_Bridging_Header_h

#include <stdint.h>
#include <stddef.h>

// ─── Types ───

/// Byte buffer returned by Rust (must be freed with sl_free_buffer)
typedef struct {
    uint8_t *data;
    size_t len;
    size_t cap;
} SLBuffer;

/// Keypair result (both 32-byte keys)
typedef struct {
    uint8_t public_key[32];
    uint8_t private_key[32];
    int32_t success;
} SLKeypair;

// ─── Core ───

int32_t sl_init(void);
char *sl_version(void);

// ─── Ed25519 Identity ───

SLKeypair sl_generate_identity_keypair(void);
int32_t sl_derive_ed25519_public_key(const uint8_t *private_key, uint8_t *out_public_key);

// ─── X25519 Key Exchange ───

SLKeypair sl_generate_x25519_keypair(void);
int32_t sl_x25519_derive_shared_secret(
    const uint8_t *our_private_key,
    const uint8_t *their_public_key,
    uint8_t *out_shared_secret
);

// ─── XChaCha20-Poly1305 Encryption ───

int32_t sl_generate_key(uint8_t *out_key);
SLBuffer sl_encrypt(const uint8_t *plaintext, size_t plaintext_len,
                     const uint8_t *key, size_t key_len);
SLBuffer sl_decrypt(const uint8_t *ciphertext, size_t ciphertext_len,
                     const uint8_t *key, size_t key_len);

// ─── Forward Secrecy ───

int32_t sl_derive_root_key(const uint8_t *shared_secret, size_t shared_secret_len,
                            uint8_t *out_root_key);
int32_t sl_evolve_chain_key(uint8_t *chain_key, uint8_t *out_new_key);

// ─── Ed25519 Signing ───

int32_t sl_sign(const uint8_t *data, size_t data_len,
                 const uint8_t *private_key, uint8_t *out_signature);
int32_t sl_verify(const uint8_t *data, size_t data_len,
                   const uint8_t *signature, const uint8_t *public_key);

// ─── Argon2id Hashing ───

char *sl_hash_password(const char *password);
int32_t sl_verify_password(const char *password, const char *hash);
int32_t sl_derive_key_from_password(const char *password,
                                     const uint8_t *salt, size_t salt_len,
                                     uint8_t *out_key);

// ─── Post-Quantum Hybrid ───

SLBuffer sl_generate_hybrid_keypair(void);

// ─── Legacy ───

int32_t sl_generate_keypair(uint8_t *out_public_key, uint8_t *out_private_key);

// ─── Memory Management ───

void sl_free_string(char *s);
void sl_free_buffer(SLBuffer buf);
void sl_free_bytes(uint8_t *ptr, size_t len, size_t cap);

#endif /* SecureLegion_Bridging_Header_h */
