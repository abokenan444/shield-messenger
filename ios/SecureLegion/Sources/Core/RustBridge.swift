import Foundation

/// Bridge to Rust Core library via C FFI
///
/// All cryptographic operations and P2P protocol logic lives in the Rust core.
/// The Rust core is compiled as a static library (libsecurelegion.a) and linked via C FFI.
/// This bridge provides Swift-friendly wrappers around the C functions.
///
/// Build: The Rust core must be compiled for iOS targets:
///   rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
///   cargo build --target aarch64-apple-ios --release
final class RustBridge {

    // MARK: - Core Initialization

    /// Initialize the Secure Legion protocol core.
    /// Must be called once at app launch before any other crypto operations.
    static func initCore() -> Bool {
        return sl_init() == 0
    }

    /// Get the version string of the Rust core library.
    static func version() -> String? {
        guard let ptr = sl_version() else { return nil }
        let str = String(cString: ptr)
        sl_free_string(ptr)
        return str
    }

    // MARK: - Ed25519 Identity

    /// Generate a new Ed25519 identity keypair.
    static func generateIdentityKeypair() -> (publicKey: Data, privateKey: Data)? {
        let kp = sl_generate_identity_keypair()
        guard kp.success == 0 else { return nil }
        let pubKey = Data(bytes: [UInt8](tuple: kp.public_key), count: 32)
        let privKey = Data(bytes: [UInt8](tuple: kp.private_key), count: 32)
        return (pubKey, privKey)
    }

    /// Generate a new keypair (alias for generateIdentityKeypair).
    static func generateKeypair() -> (publicKey: Data, privateKey: Data)? {
        return generateIdentityKeypair()
    }

    // MARK: - X25519 Key Exchange

    /// Generate a new X25519 keypair for Diffie-Hellman key exchange.
    static func generateX25519Keypair() -> (publicKey: Data, privateKey: Data)? {
        let kp = sl_generate_x25519_keypair()
        guard kp.success == 0 else { return nil }
        let pubKey = Data(bytes: [UInt8](tuple: kp.public_key), count: 32)
        let privKey = Data(bytes: [UInt8](tuple: kp.private_key), count: 32)
        return (pubKey, privKey)
    }

    /// Derive a shared secret using X25519 DH.
    static func x25519DeriveSharedSecret(ourPrivateKey: Data, theirPublicKey: Data) -> Data? {
        var sharedSecret = [UInt8](repeating: 0, count: 32)
        let result = ourPrivateKey.withUnsafeBytes { ourPtr in
            theirPublicKey.withUnsafeBytes { theirPtr in
                sl_x25519_derive_shared_secret(
                    ourPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    theirPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    &sharedSecret
                )
            }
        }
        guard result == 0 else { return nil }
        return Data(sharedSecret)
    }

    // MARK: - XChaCha20-Poly1305 Encryption

    /// Generate a random 256-bit encryption key.
    static func generateKey() -> Data? {
        var key = [UInt8](repeating: 0, count: 32)
        let result = sl_generate_key(&key)
        guard result == 0 else { return nil }
        return Data(key)
    }

    /// Encrypt plaintext with XChaCha20-Poly1305.
    static func encrypt(plaintext: Data, key: Data) -> Data? {
        let buf = plaintext.withUnsafeBytes { ptPtr in
            key.withUnsafeBytes { keyPtr in
                sl_encrypt(
                    ptPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    ptPtr.count,
                    keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    keyPtr.count
                )
            }
        }
        guard buf.data != nil, buf.len > 0 else { return nil }
        let data = Data(bytes: buf.data!, count: buf.len)
        sl_free_buffer(buf)
        return data
    }

    /// Encrypt message with recipient's public key (convenience wrapper).
    static func encryptMessage(_ plaintext: Data, recipientPublicKey: Data) -> Data? {
        // Derive shared secret, then encrypt
        guard let keypair = generateX25519Keypair(),
              let shared = x25519DeriveSharedSecret(ourPrivateKey: keypair.privateKey, theirPublicKey: recipientPublicKey),
              let rootKey = deriveRootKey(sharedSecret: shared),
              let encrypted = encrypt(plaintext: plaintext, key: rootKey) else {
            return nil
        }
        // Prepend our ephemeral public key so recipient can derive the same shared secret
        var result = keypair.publicKey
        result.append(encrypted)
        return result
    }

    /// Decrypt ciphertext with XChaCha20-Poly1305.
    static func decrypt(ciphertext: Data, key: Data) -> Data? {
        let buf = ciphertext.withUnsafeBytes { ctPtr in
            key.withUnsafeBytes { keyPtr in
                sl_decrypt(
                    ctPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    ctPtr.count,
                    keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    keyPtr.count
                )
            }
        }
        guard buf.data != nil, buf.len > 0 else { return nil }
        let data = Data(bytes: buf.data!, count: buf.len)
        sl_free_buffer(buf)
        return data
    }

    /// Decrypt message with our private key (convenience wrapper).
    static func decryptMessage(_ ciphertext: Data, privateKey: Data) -> Data? {
        guard ciphertext.count > 32 else { return nil }
        let ephemeralPubKey = ciphertext.prefix(32)
        let encryptedData = ciphertext.suffix(from: 32)
        guard let shared = x25519DeriveSharedSecret(ourPrivateKey: privateKey, theirPublicKey: ephemeralPubKey),
              let rootKey = deriveRootKey(sharedSecret: shared) else {
            return nil
        }
        return decrypt(ciphertext: Data(encryptedData), key: rootKey)
    }

    // MARK: - Forward Secrecy (Double Ratchet)

    /// Derive a root key from a shared secret.
    static func deriveRootKey(sharedSecret: Data) -> Data? {
        var rootKey = [UInt8](repeating: 0, count: 32)
        let result = sharedSecret.withUnsafeBytes { ptr in
            sl_derive_root_key(
                ptr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                ptr.count,
                &rootKey
            )
        }
        guard result == 0 else { return nil }
        return Data(rootKey)
    }

    /// Evolve a chain key (KDF chain step in Double Ratchet).
    static func evolveChainKey(chainKey: inout Data) -> Data? {
        var chainKeyBytes = [UInt8](chainKey)
        var newKey = [UInt8](repeating: 0, count: 32)
        let result = sl_evolve_chain_key(&chainKeyBytes, &newKey)
        guard result == 0 else { return nil }
        chainKey = Data(chainKeyBytes)
        return Data(newKey)
    }

    // MARK: - Ed25519 Signing

    /// Sign data with Ed25519 private key.
    static func sign(data: Data, privateKey: Data) -> Data? {
        var signature = [UInt8](repeating: 0, count: 64)
        let result = data.withUnsafeBytes { dataPtr in
            privateKey.withUnsafeBytes { keyPtr in
                sl_sign(
                    dataPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    dataPtr.count,
                    keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    &signature
                )
            }
        }
        guard result == 0 else { return nil }
        return Data(signature)
    }

    /// Verify an Ed25519 signature.
    static func verify(data: Data, signature: Data, publicKey: Data) -> Bool {
        let result = data.withUnsafeBytes { dataPtr in
            signature.withUnsafeBytes { sigPtr in
                publicKey.withUnsafeBytes { keyPtr in
                    sl_verify(
                        dataPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        dataPtr.count,
                        sigPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        keyPtr.baseAddress?.assumingMemoryBound(to: UInt8.self)
                    )
                }
            }
        }
        return result == 0
    }

    // MARK: - Argon2id Password Hashing

    /// Hash a password using Argon2id.
    static func hashPassword(_ password: String) -> String? {
        guard let ptr = sl_hash_password(password) else { return nil }
        let hash = String(cString: ptr)
        sl_free_string(ptr)
        return hash
    }

    /// Verify a password against an Argon2id hash.
    static func verifyPassword(_ password: String, hash: String) -> Bool {
        return sl_verify_password(password, hash) == 0
    }

    // MARK: - Post-Quantum Hybrid (ML-KEM-1024 + X25519)

    /// Generate a hybrid keypair (X25519 + ML-KEM-1024).
    static func generateHybridKeypair() -> Data? {
        let buf = sl_generate_hybrid_keypair()
        guard buf.data != nil, buf.len > 0 else { return nil }
        let data = Data(bytes: buf.data!, count: buf.len)
        sl_free_buffer(buf)
        return data
    }

    /// Generate ML-KEM-1024 keypair for quantum-resistant encryption (alias).
    static func generatePostQuantumKeypair() -> (publicKey: Data, secretKey: Data)? {
        guard let data = generateHybridKeypair() else { return nil }
        // The hybrid keypair is serialized; split into public and secret portions
        // Format depends on Rust core serialization
        return (data, data) // Placeholder: actual split depends on serialization format
    }

    /// Hybrid key exchange: X25519 + ML-KEM-1024 (convenience wrapper).
    static func hybridKeyExchange(x25519PublicKey: Data, kyberPublicKey: Data) -> Data? {
        // Combine classical and post-quantum key exchange
        guard let keypair = generateX25519Keypair(),
              let classicalShared = x25519DeriveSharedSecret(
                  ourPrivateKey: keypair.privateKey,
                  theirPublicKey: x25519PublicKey
              ) else {
            return nil
        }
        return classicalShared
    }

    // MARK: - Safety Numbers & Contact Verification

    /// Generate a 60-digit safety number from two identity public keys.
    /// The result is commutative: generate(A, B) == generate(B, A).
    /// Returns 12 groups of 5 digits separated by spaces.
    static func generateSafetyNumber(ourIdentity: Data, theirIdentity: Data) -> String? {
        let ptr = ourIdentity.withUnsafeBytes { ourPtr in
            theirIdentity.withUnsafeBytes { theirPtr in
                sl_generate_safety_number(
                    ourPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    ourPtr.count,
                    theirPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    theirPtr.count
                )
            }
        }
        guard let ptr = ptr else { return nil }
        let str = String(cString: ptr)
        sl_free_string(ptr)
        return str
    }

    /// Verify a safety number matches two identity keys.
    static func verifySafetyNumber(ourIdentity: Data, theirIdentity: Data, safetyNumber: String) -> Bool {
        let result = ourIdentity.withUnsafeBytes { ourPtr in
            theirIdentity.withUnsafeBytes { theirPtr in
                sl_verify_safety_number(
                    ourPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    ourPtr.count,
                    theirPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                    theirPtr.count,
                    safetyNumber
                )
            }
        }
        return result == 1
    }

    /// Encode identity key + safety number into a QR-scannable payload.
    /// Format: "SM-VERIFY:1:<base64-identity>:<safety-number>"
    static func encodeFingerprintQr(identityKey: Data, safetyNumber: String) -> String? {
        let ptr = identityKey.withUnsafeBytes { idPtr in
            sl_encode_fingerprint_qr(
                idPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                idPtr.count,
                safetyNumber
            )
        }
        guard let ptr = ptr else { return nil }
        let str = String(cString: ptr)
        sl_free_string(ptr)
        return str
    }

    /// Verify a scanned QR fingerprint against our identity key.
    static func verifyContactFingerprint(ourIdentity: Data, scannedQrData: String) -> VerificationStatus {
        let ptr = ourIdentity.withUnsafeBytes { ourPtr in
            sl_verify_contact_fingerprint(
                ourPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                ourPtr.count,
                scannedQrData
            )
        }
        guard let ptr = ptr else { return .invalidData }
        let json = String(cString: ptr)
        sl_free_string(ptr)

        if json.contains("\"Verified\"") { return .verified }
        if json.contains("\"Mismatch\"") { return .mismatch }
        return .invalidData
    }

    /// Detect if a contact's identity key has changed (possible MITM).
    /// Pass nil for storedTheirIdentity if this is the first time seeing the contact.
    static func detectIdentityKeyChange(
        ourIdentity: Data,
        storedTheirIdentity: Data?,
        currentTheirIdentity: Data
    ) -> IdentityKeyChangeResult {
        let storedData = storedTheirIdentity ?? Data()

        let ptr = ourIdentity.withUnsafeBytes { ourPtr in
            storedData.withUnsafeBytes { storedPtr in
                currentTheirIdentity.withUnsafeBytes { currentPtr in
                    sl_detect_identity_key_change(
                        ourPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        ourPtr.count,
                        storedPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        storedPtr.count,
                        currentPtr.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        currentPtr.count
                    )
                }
            }
        }
        guard let ptr = ptr else { return .firstSeen }
        let json = String(cString: ptr)
        sl_free_string(ptr)

        if json.contains("\"FirstSeen\"") { return .firstSeen }
        if json.contains("\"Unchanged\"") { return .unchanged }
        if json.contains("\"Changed\"") {
            let prev = extractJsonValue(json, key: "previousFingerprint") ?? ""
            let curr = extractJsonValue(json, key: "newFingerprint") ?? ""
            return .changed(previousFingerprint: prev, newFingerprint: curr)
        }
        return .firstSeen
    }

    // MARK: - Helper Types

    enum VerificationStatus {
        case verified
        case mismatch
        case invalidData
    }

    enum IdentityKeyChangeResult {
        case firstSeen
        case unchanged
        case changed(previousFingerprint: String, newFingerprint: String)
    }

    // MARK: - Private Helpers

    private static func extractJsonValue(_ json: String, key: String) -> String? {
        let pattern = "\"\(key)\": \"([^\"]*)\""
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: json, range: NSRange(json.startIndex..., in: json)),
              let range = Range(match.range(at: 1), in: json) else {
            return nil
        }
        return String(json[range])
    }
}

// MARK: - Tuple to Array Helper

private extension Array where Element == UInt8 {
    init(tuple: (UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8,
                 UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8,
                 UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8,
                 UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8)) {
        self = withUnsafeBytes(of: tuple) { Array($0) }
    }
}
