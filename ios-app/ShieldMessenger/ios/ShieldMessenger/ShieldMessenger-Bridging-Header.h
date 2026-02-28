/**
 * Shield Messenger — Bridging Header
 *
 * Declares the C functions exported from libshieldmessenger.a (Rust core).
 * These functions are defined in shield-messenger-core/src/ffi/ios.rs.
 *
 * Build the Rust library:
 *   $ cd shield-messenger-core
 *   $ cargo build --target aarch64-apple-ios --features ios --release
 *   $ cargo build --target aarch64-apple-ios-sim --features ios --release
 *
 * Then link libshieldmessenger.a in Xcode → Build Phases → Link Binary With Libraries.
 */

#ifndef ShieldMessenger_Bridging_Header_h
#define ShieldMessenger_Bridging_Header_h

#include <stdint.h>
#include <stddef.h>

// ─── Opaque Types ───

typedef struct {
    uint8_t *data;
    size_t len;
    size_t cap;
} SLBuffer;

typedef struct {
    uint8_t public_key[32];
    uint8_t private_key[32];
    int32_t success;
} SLKeypair;

// ─── Core Init ───

int32_t sl_init(void);
char *sl_version(void);

// ─── Ed25519 Identity ───

SLKeypair sl_generate_identity_keypair(void);
int32_t sl_derive_ed25519_public_key(const uint8_t *private_key, uint8_t *out_public_key);

// ─── X25519 Key Exchange ───

SLKeypair sl_generate_x25519_keypair(void);
int32_t sl_x25519_derive_shared_secret(const uint8_t *our_private_key,
                                        const uint8_t *their_public_key,
                                        uint8_t *out_shared_secret);

// ─── Symmetric Encryption (XChaCha20-Poly1305) ───

int32_t sl_generate_key(uint8_t *out_key);
uint8_t *sl_encrypt(const uint8_t *plaintext, size_t plaintext_len,
                     const uint8_t *key, size_t *out_len);
uint8_t *sl_decrypt(const uint8_t *ciphertext, size_t ciphertext_len,
                     const uint8_t *key, size_t *out_len);

// ─── KDF / Ratchet ───

int32_t sl_derive_root_key(const uint8_t *shared_secret, size_t ss_len,
                            const char *info, uint8_t *out_root_key);
int32_t sl_evolve_chain_key(const uint8_t *chain_key, uint8_t *out_new_chain_key);

// ─── Signing ───

int32_t sl_sign(const uint8_t *data, size_t data_len,
                 const uint8_t *private_key,
                 uint8_t *out_signature);
int32_t sl_verify(const uint8_t *data, size_t data_len,
                   const uint8_t *signature,
                   const uint8_t *public_key);

// ─── Password Hashing (Argon2id) ───

char *sl_hash_password(const char *password);
int32_t sl_verify_password(const char *password, const char *hash);
int32_t sl_derive_key_from_password(const char *password, const uint8_t *salt,
                                     size_t salt_len, uint8_t *out_key);

// ─── Hybrid PQ KEM ───

SLBuffer sl_generate_hybrid_keypair(void);

// ─── Safety Numbers ───

int32_t sl_generate_safety_number(const uint8_t *our_identity, size_t our_len,
                                   const uint8_t *their_identity, size_t their_len,
                                   char *out_buf, size_t out_buf_len);
int32_t sl_verify_safety_number(const uint8_t *our_identity, size_t our_len,
                                 const uint8_t *their_identity, size_t their_len,
                                 const char *safety_number);

// ─── Memory Management ───

void sl_free_string(char *s);
void sl_free_buffer(SLBuffer buf);
void sl_free_bytes(uint8_t *ptr, size_t len, size_t cap);

#endif /* ShieldMessenger_Bridging_Header_h */
