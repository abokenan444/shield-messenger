import Foundation

/// Shield Messenger Protocol service — identity, messaging, and E2EE via Rust Core
///
/// All crypto operations are delegated to RustBridge → Rust C FFI.
/// Keys are stored in Keychain encrypted with password-derived key (Argon2id).
/// No external server — all operations are local + P2P over Tor.
class SecureLegionService {
    static let shared = SecureLegionService()

    // In-memory session state (never persisted in plaintext)
    private var publicKey: Data?
    private var privateKey: Data?
    private var userId: String?
    private var isInitialized = false

    // Per-conversation chain key state
    private var conversationKeys: [String: ConversationKeyState] = [:]

    struct AuthResult {
        let userId: String
        let displayName: String
        let publicKey: String // hex-encoded
    }

    struct ConversationKeyState {
        var sendChainKey: Data
        var recvChainKey: Data
        var sendSequence: Int
        var recvSequence: Int
        var peerPublicKey: Data
    }

    // MARK: - Initialization

    private func ensureInitialized() {
        guard !isInitialized else { return }
        RustBridge.initCore()
        isInitialized = true
    }

    // MARK: - Identity

    /// Create a new cryptographic identity (Ed25519 keypair)
    /// Private key is encrypted with Argon2id-derived key and stored in Keychain.
    func createIdentity(displayName: String, password: String) async throws -> AuthResult {
        ensureInitialized()

        // Generate Ed25519 identity keypair via Rust
        guard let keypair = RustBridge.generateIdentityKeypair() else {
            throw SecureLegionError.keyGenerationFailed
        }

        // Generate salt for password-derived encryption key
        let salt = Data((0..<16).map { _ in UInt8.random(in: 0...255) })

        // Derive storage key from password via Argon2id
        guard let storageKey = RustBridge.deriveKeyFromPassword(password, salt: salt) else {
            throw SecureLegionError.keyDerivationFailed
        }

        // Encrypt private key with storage key via XChaCha20-Poly1305
        guard let encryptedPrivKey = RustBridge.encryptMessage(keypair.privateKey, key: storageKey) else {
            throw SecureLegionError.encryptionFailed
        }

        // Store in Keychain
        let keychainData: [String: Data] = [
            "salt": salt,
            "encryptedPrivateKey": encryptedPrivKey,
            "publicKey": keypair.publicKey
        ]
        let encoded = try JSONEncoder().encode(keychainData.mapValues { $0.base64EncodedString() })
        KeychainHelper.save(key: "sl_identity", data: encoded)

        // Set session state
        self.publicKey = keypair.publicKey
        self.privateKey = keypair.privateKey
        let pubKeyHex = keypair.publicKey.map { String(format: "%02x", $0) }.joined()
        self.userId = "sl_\(String(pubKeyHex.prefix(16)))"

        return AuthResult(
            userId: self.userId!,
            displayName: displayName,
            publicKey: pubKeyHex
        )
    }

    /// Restore identity by decrypting stored private key with password
    func login(displayName: String, password: String) async throws -> AuthResult {
        ensureInitialized()

        // Load from Keychain
        guard let encoded = KeychainHelper.load(key: "sl_identity"),
              let dict = try? JSONDecoder().decode([String: String].self, from: encoded) else {
            // No stored identity — create new one
            return try await createIdentity(displayName: displayName, password: password)
        }

        guard let saltB64 = dict["salt"],
              let salt = Data(base64Encoded: saltB64),
              let encPrivB64 = dict["encryptedPrivateKey"],
              let encryptedPrivKey = Data(base64Encoded: encPrivB64),
              let pubB64 = dict["publicKey"],
              let storedPublicKey = Data(base64Encoded: pubB64) else {
            throw SecureLegionError.corruptedKeychain
        }

        // Derive storage key from password
        guard let storageKey = RustBridge.deriveKeyFromPassword(password, salt: salt) else {
            throw SecureLegionError.keyDerivationFailed
        }

        // Decrypt private key (wrong password → AEAD auth fails)
        guard let decryptedPrivKey = RustBridge.decryptMessage(encryptedPrivKey, key: storageKey) else {
            throw SecureLegionError.wrongPassword
        }

        self.publicKey = storedPublicKey
        self.privateKey = decryptedPrivKey
        let pubKeyHex = storedPublicKey.map { String(format: "%02x", $0) }.joined()
        self.userId = "sl_\(String(pubKeyHex.prefix(16)))"

        return AuthResult(
            userId: self.userId!,
            displayName: displayName,
            publicKey: pubKeyHex
        )
    }

    /// Logout — zero in-memory keys
    func logout() {
        publicKey = nil
        privateKey = nil
        userId = nil
        conversationKeys.removeAll()
    }

    // MARK: - Key Exchange

    /// Establish a conversation with a peer via X25519 key exchange
    func createConversation(peerPublicKey: Data) throws -> String {
        guard privateKey != nil else { throw SecureLegionError.notAuthenticated }

        // Generate X25519 ephemeral keypair
        guard let x25519Kp = RustBridge.generateX25519Keypair() else {
            throw SecureLegionError.keyGenerationFailed
        }

        // X25519 ECDH → shared secret
        guard let sharedSecret = RustBridge.x25519DeriveSharedSecret(
            ourPrivateKey: x25519Kp.privateKey,
            theirPublicKey: peerPublicKey
        ) else {
            throw SecureLegionError.keyExchangeFailed
        }

        // Derive root key → directional chain keys
        guard let rootKey = RustBridge.deriveRootKey(sharedSecret: sharedSecret) else {
            throw SecureLegionError.keyDerivationFailed
        }

        var rootKeyMut = rootKey
        guard let sendChainKey = RustBridge.evolveChainKey(&rootKeyMut) else {
            throw SecureLegionError.keyDerivationFailed
        }
        var sendKeyMut = sendChainKey
        guard let recvChainKey = RustBridge.evolveChainKey(&sendKeyMut) else {
            throw SecureLegionError.keyDerivationFailed
        }

        let conversationId = "conv_\(UUID().uuidString.prefix(16).lowercased())"

        conversationKeys[conversationId] = ConversationKeyState(
            sendChainKey: sendChainKey,
            recvChainKey: recvChainKey,
            sendSequence: 0,
            recvSequence: 0,
            peerPublicKey: peerPublicKey
        )

        return conversationId
    }

    // MARK: - Messaging

    /// Encrypt and send a message with chain key evolution (forward secrecy)
    func sendMessage(conversationId: String, body: String) async throws -> String {
        guard let privKey = privateKey else { throw SecureLegionError.notAuthenticated }
        guard var state = conversationKeys[conversationId] else {
            throw SecureLegionError.noConversationState
        }

        let plaintext = Data(body.utf8)

        // Encrypt with current send chain key
        guard let ciphertext = RustBridge.encryptMessage(plaintext, key: state.sendChainKey) else {
            throw SecureLegionError.encryptionFailed
        }

        // Sign the ciphertext with our Ed25519 identity key
        guard let signature = RustBridge.signData(ciphertext, privateKey: privKey) else {
            throw SecureLegionError.signingFailed
        }

        // Evolve chain key (forward secrecy — old key is destroyed)
        guard let newChainKey = RustBridge.evolveChainKey(&state.sendChainKey) else {
            throw SecureLegionError.keyDerivationFailed
        }
        state.sendChainKey = newChainKey
        state.sendSequence += 1
        conversationKeys[conversationId] = state

        let messageId = UUID().uuidString
        let _ = signature // Would be sent alongside ciphertext over Tor
        return messageId
    }

    /// Decrypt a received message and verify signature
    func decryptMessage(
        conversationId: String,
        ciphertext: Data,
        signature: Data,
        senderPublicKey: Data
    ) throws -> (content: String, verified: Bool) {
        guard var state = conversationKeys[conversationId] else {
            throw SecureLegionError.noConversationState
        }

        // Verify Ed25519 signature
        let verified = RustBridge.verifySignature(ciphertext, signature: signature, publicKey: senderPublicKey)

        // Decrypt with receive chain key
        guard let plaintext = RustBridge.decryptMessage(ciphertext, key: state.recvChainKey) else {
            throw SecureLegionError.decryptionFailed
        }

        // Evolve receive chain key
        guard let newRecvKey = RustBridge.evolveChainKey(&state.recvChainKey) else {
            throw SecureLegionError.keyDerivationFailed
        }
        state.recvChainKey = newRecvKey
        state.recvSequence += 1
        conversationKeys[conversationId] = state

        guard let content = String(data: plaintext, encoding: .utf8) else {
            throw SecureLegionError.decryptionFailed
        }

        return (content, verified)
    }
}

// MARK: - Errors

enum SecureLegionError: LocalizedError {
    case keyGenerationFailed
    case keyDerivationFailed
    case keyExchangeFailed
    case encryptionFailed
    case decryptionFailed
    case signingFailed
    case wrongPassword
    case notAuthenticated
    case noConversationState
    case corruptedKeychain

    var errorDescription: String? {
        switch self {
        case .keyGenerationFailed: return "فشل توليد المفاتيح"
        case .keyDerivationFailed: return "فشل اشتقاق المفتاح"
        case .keyExchangeFailed: return "فشل تبادل المفاتيح"
        case .encryptionFailed: return "فشل التشفير"
        case .decryptionFailed: return "فشل فك التشفير"
        case .signingFailed: return "فشل التوقيع"
        case .wrongPassword: return "كلمة المرور غير صحيحة"
        case .notAuthenticated: return "لم يتم تسجيل الدخول"
        case .noConversationState: return "لا توجد حالة محادثة"
        case .corruptedKeychain: return "بيانات Keychain تالفة"
        }
    }
}

// MARK: - Keychain Helper

private struct KeychainHelper {
    static func save(key: String, data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
