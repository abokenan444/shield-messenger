import Foundation

/// Bridge to Rust Core library via C FFI
///
/// All cryptographic operations run in Rust — Swift only marshals data.
/// The Rust core is compiled as a static library (libsecurelegion.a).
///
/// C functions declared in the bridging header (SecureLegion-Bridging-Header.h):
///   int32_t sl_init(void);
///   SLKeypair sl_generate_identity_keypair(void);
///   int32_t sl_derive_ed25519_public_key(const uint8_t*, uint8_t*);
///   SLKeypair sl_generate_x25519_keypair(void);
///   int32_t sl_x25519_derive_shared_secret(const uint8_t*, const uint8_t*, uint8_t*);
///   int32_t sl_generate_key(uint8_t*);
///   SLBuffer sl_encrypt(const uint8_t*, size_t, const uint8_t*, size_t);
///   SLBuffer sl_decrypt(const uint8_t*, size_t, const uint8_t*, size_t);
///   int32_t sl_derive_root_key(const uint8_t*, size_t, uint8_t*);
///   int32_t sl_evolve_chain_key(uint8_t*, uint8_t*);
///   int32_t sl_sign(const uint8_t*, size_t, const uint8_t*, uint8_t*);
///   int32_t sl_verify(const uint8_t*, size_t, const uint8_t*, const uint8_t*);
///   char* sl_hash_password(const char*);
///   int32_t sl_verify_password(const char*, const char*);
///   int32_t sl_derive_key_from_password(const char*, const uint8_t*, size_t, uint8_t*);
///   SLBuffer sl_generate_hybrid_keypair(void);
///   char* sl_version(void);
///   void sl_free_string(char*);
///   void sl_free_buffer(SLBuffer);

final class RustBridge {

    private static var isInitialized = false

    // MARK: - Core Initialization

    /// Initialize the Shield Messenger Rust core (call once at app launch)
    @discardableResult
    static func initCore() -> Bool {
        guard !isInitialized else { return true }
        let result = sl_init()
        isInitialized = (result == 0)
        return isInitialized
    }

    /// Get Rust core library version
    static func version() -> String {
        let ptr = sl_version()
        defer { sl_free_string(ptr) }
        return String(cString: ptr)
    }

    // MARK: - Ed25519 Identity

    /// Generate a new Ed25519 identity keypair
    static func generateIdentityKeypair() -> (publicKey: Data, privateKey: Data)? {
        let kp = sl_generate_identity_keypair()
        guard kp.success == 1 else { return nil }

        // Convert fixed-size arrays to Data
        let pubKey = withUnsafePointer(to: kp.public_key) { ptr in
            Data(bytes: ptr, count: 32)
        }
        let privKey = withUnsafePointer(to: kp.private_key) { ptr in
            Data(bytes: ptr, count: 32)
        }
        return (pubKey, privKey)
    }

    /// Derive Ed25519 public key from private key
    static func derivePublicKey(from privateKey: Data) -> Data? {
        guard privateKey.count == 32 else { return nil }

        var outPublicKey = Data(count: 32)
        let result = privateKey.withUnsafeBytes { privPtr in
            outPublicKey.withUnsafeMutableBytes { pubPtr in
                sl_derive_ed25519_public_key(
                    privPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    pubPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                )
            }
        }
        return result == 0 ? outPublicKey : nil
    }

    // MARK: - X25519 Key Exchange

    /// Generate an X25519 key exchange keypair
    static func generateX25519Keypair() -> (publicKey: Data, privateKey: Data)? {
        let kp = sl_generate_x25519_keypair()
        guard kp.success == 1 else { return nil }

        let pubKey = withUnsafePointer(to: kp.public_key) { ptr in
            Data(bytes: ptr, count: 32)
        }
        let privKey = withUnsafePointer(to: kp.private_key) { ptr in
            Data(bytes: ptr, count: 32)
        }
        return (pubKey, privKey)
    }

    /// Perform X25519 Diffie-Hellman key exchange
    static func x25519DeriveSharedSecret(
        ourPrivateKey: Data,
        theirPublicKey: Data
    ) -> Data? {
        guard ourPrivateKey.count == 32, theirPublicKey.count == 32 else { return nil }

        var sharedSecret = Data(count: 32)
        let result = ourPrivateKey.withUnsafeBytes { ourPtr in
            theirPublicKey.withUnsafeBytes { theirPtr in
                sharedSecret.withUnsafeMutableBytes { outPtr in
                    sl_x25519_derive_shared_secret(
                        ourPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        theirPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        outPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                    )
                }
            }
        }
        return result == 0 ? sharedSecret : nil
    }

    // MARK: - XChaCha20-Poly1305 Encryption

    /// Generate a random 32-byte encryption key
    static func generateEncryptionKey() -> Data? {
        var key = Data(count: 32)
        let result = key.withUnsafeMutableBytes { ptr in
            sl_generate_key(ptr.baseAddress?.assumingMemoryBound(to: UInt8.self))
        }
        return result == 0 ? key : nil
    }

    /// Encrypt data using XChaCha20-Poly1305
    static func encryptMessage(_ plaintext: Data, key: Data) -> Data? {
        guard key.count == 32 else { return nil }

        let buffer = plaintext.withUnsafeBytes { plainPtr in
            key.withUnsafeBytes { keyPtr in
                sl_encrypt(
                    plainPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    plaintext.count,
                    keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    key.count
                )
            }
        }

        guard buffer.data != nil, buffer.len > 0 else { return nil }
        let result = Data(bytes: buffer.data, count: buffer.len)
        sl_free_buffer(buffer)
        return result
    }

    /// Decrypt data using XChaCha20-Poly1305
    static func decryptMessage(_ ciphertext: Data, key: Data) -> Data? {
        guard key.count == 32 else { return nil }

        let buffer = ciphertext.withUnsafeBytes { cipherPtr in
            key.withUnsafeBytes { keyPtr in
                sl_decrypt(
                    cipherPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    ciphertext.count,
                    keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    key.count
                )
            }
        }

        guard buffer.data != nil, buffer.len > 0 else { return nil }
        let result = Data(bytes: buffer.data, count: buffer.len)
        sl_free_buffer(buffer)
        return result
    }

    // MARK: - Forward Secrecy

    /// Derive root key from shared secret
    static func deriveRootKey(sharedSecret: Data) -> Data? {
        guard sharedSecret.count == 32 || sharedSecret.count == 64 else { return nil }

        var rootKey = Data(count: 32)
        let result = sharedSecret.withUnsafeBytes { secretPtr in
            rootKey.withUnsafeMutableBytes { outPtr in
                sl_derive_root_key(
                    secretPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    sharedSecret.count,
                    outPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                )
            }
        }
        return result == 0 ? rootKey : nil
    }

    /// Evolve chain key forward (one-way, provides forward secrecy)
    static func evolveChainKey(_ chainKey: inout Data) -> Data? {
        guard chainKey.count == 32 else { return nil }

        var newKey = Data(count: 32)
        let result = chainKey.withUnsafeMutableBytes { keyPtr in
            newKey.withUnsafeMutableBytes { outPtr in
                sl_evolve_chain_key(
                    keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    outPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                )
            }
        }
        return result == 0 ? newKey : nil
    }

    // MARK: - Ed25519 Signing

    /// Sign data with Ed25519 private key
    static func signData(_ data: Data, privateKey: Data) -> Data? {
        guard privateKey.count == 32 else { return nil }

        var signature = Data(count: 64)
        let result = data.withUnsafeBytes { dataPtr in
            privateKey.withUnsafeBytes { keyPtr in
                signature.withUnsafeMutableBytes { sigPtr in
                    sl_sign(
                        dataPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        data.count,
                        keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        sigPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                    )
                }
            }
        }
        return result == 0 ? signature : nil
    }

    /// Verify an Ed25519 signature
    static func verifySignature(_ data: Data, signature: Data, publicKey: Data) -> Bool {
        guard publicKey.count == 32, signature.count == 64 else { return false }

        let result = data.withUnsafeBytes { dataPtr in
            signature.withUnsafeBytes { sigPtr in
                publicKey.withUnsafeBytes { keyPtr in
                    sl_verify(
                        dataPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        data.count,
                        sigPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                    )
                }
            }
        }
        return result == 1
    }

    // MARK: - Argon2id Hashing

    /// Hash a password using Argon2id (returns PHC-format string)
    static func hashPassword(_ password: String) -> String? {
        guard let ptr = password.withCString({ sl_hash_password($0) }) else { return nil }
        let hash = String(cString: ptr)
        sl_free_string(ptr)
        return hash
    }

    /// Verify a password against an Argon2id hash
    static func verifyPassword(_ password: String, hash: String) -> Bool {
        let result = password.withCString { pwPtr in
            hash.withCString { hashPtr in
                sl_verify_password(pwPtr, hashPtr)
            }
        }
        return result == 1
    }

    /// Derive a 32-byte key from password + salt using Argon2id
    static func deriveKeyFromPassword(_ password: String, salt: Data) -> Data? {
        guard salt.count >= 16 else { return nil }

        var key = Data(count: 32)
        let result = password.withCString { pwPtr in
            salt.withUnsafeBytes { saltPtr in
                key.withUnsafeMutableBytes { keyPtr in
                    sl_derive_key_from_password(
                        pwPtr,
                        saltPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        salt.count,
                        keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                    )
                }
            }
        }
        return result == 0 ? key : nil
    }

    // MARK: - Post-Quantum Hybrid

    /// Generate a hybrid X25519 + ML-KEM-1024 keypair
    static func generateHybridKeypair() -> [String: String]? {
        let buffer = sl_generate_hybrid_keypair()
        guard buffer.data != nil, buffer.len > 0 else { return nil }

        let data = Data(bytes: buffer.data, count: buffer.len)
        sl_free_buffer(buffer)

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
            return nil
        }
        return json
    }
}
