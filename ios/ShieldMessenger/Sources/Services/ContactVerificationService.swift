import Foundation

/// ContactVerificationService — Manages contact identity verification for Shield Messenger iOS.
///
/// Provides:
///  - Safety number generation and verification
///  - QR code fingerprint encoding/decoding for in-person verification
///  - Identity key change detection with automatic security alerts
///  - Verified contact state persistence in Keychain
///
/// All cryptographic operations are delegated to the Rust core via RustBridge.
final class ContactVerificationService {

    static let shared = ContactVerificationService()

    private let defaults = UserDefaults.standard
    private let keyPrefix = "sl_contact_"

    private init() {}

    // MARK: - Safety Numbers

    /// Generate a 60-digit safety number for verifying a contact.
    /// The result is commutative: generate(A, B) == generate(B, A).
    func generateSafetyNumber(ourIdentity: Data, theirIdentity: Data) -> String? {
        return RustBridge.generateSafetyNumber(ourIdentity: ourIdentity, theirIdentity: theirIdentity)
    }

    /// Verify a safety number matches two identity keys.
    func verifySafetyNumber(ourIdentity: Data, theirIdentity: Data, safetyNumber: String) -> Bool {
        return RustBridge.verifySafetyNumber(
            ourIdentity: ourIdentity,
            theirIdentity: theirIdentity,
            safetyNumber: safetyNumber
        )
    }

    // MARK: - QR Code Verification

    /// Generate a QR code payload for in-person verification.
    func generateQrPayload(identityKey: Data, safetyNumber: String) -> String? {
        return RustBridge.encodeFingerprintQr(identityKey: identityKey, safetyNumber: safetyNumber)
    }

    /// Verify a scanned QR code against our identity key.
    func verifyScannedQr(ourIdentity: Data, scannedQrData: String) -> VerificationResult {
        let status = RustBridge.verifyContactFingerprint(
            ourIdentity: ourIdentity,
            scannedQrData: scannedQrData
        )
        switch status {
        case .verified: return .verified
        case .mismatch: return .mismatch
        case .invalidData: return .invalidData
        }
    }

    // MARK: - Identity Key Change Detection

    /// Check if a contact's identity key has changed since last seen.
    /// Automatically triggers a security alert notification if a change is detected.
    func checkIdentityKeyChange(
        ourIdentity: Data,
        contactId: String,
        contactName: String,
        currentTheirIdentity: Data
    ) -> IdentityChangeResult {
        let storedKey = getStoredIdentityKey(for: contactId)

        let result = RustBridge.detectIdentityKeyChange(
            ourIdentity: ourIdentity,
            storedTheirIdentity: storedKey,
            currentTheirIdentity: currentTheirIdentity
        )

        // Store the current key for future comparisons
        storeIdentityKey(currentTheirIdentity, for: contactId)

        switch result {
        case .firstSeen:
            return .firstSeen

        case .unchanged:
            return .unchanged

        case .changed(let previousFingerprint, let newFingerprint):
            // Trigger security alert
            NotificationService.shared.notifyIdentityKeyChange(
                contactName: contactName,
                contactId: contactId
            )
            // Mark contact as unverified
            markContactUnverified(contactId: contactId)
            return .changed(
                previousFingerprint: previousFingerprint,
                newFingerprint: newFingerprint
            )
        }
    }

    // MARK: - Verification State Persistence

    /// Mark a contact as verified (safety number confirmed in person).
    func markContactVerified(contactId: String) {
        defaults.set(true, forKey: "\(keyPrefix)verified_\(contactId)")
        defaults.set(Date().timeIntervalSince1970, forKey: "\(keyPrefix)verified_at_\(contactId)")
    }

    /// Mark a contact as unverified (e.g., after identity key change).
    func markContactUnverified(contactId: String) {
        defaults.set(false, forKey: "\(keyPrefix)verified_\(contactId)")
        defaults.removeObject(forKey: "\(keyPrefix)verified_at_\(contactId)")
    }

    /// Check if a contact has been verified.
    func isContactVerified(contactId: String) -> Bool {
        return defaults.bool(forKey: "\(keyPrefix)verified_\(contactId)")
    }

    /// Get the timestamp when a contact was last verified.
    func getVerificationDate(contactId: String) -> Date? {
        let ts = defaults.double(forKey: "\(keyPrefix)verified_at_\(contactId)")
        return ts > 0 ? Date(timeIntervalSince1970: ts) : nil
    }

    // MARK: - Identity Key Storage

    private func storeIdentityKey(_ key: Data, for contactId: String) {
        defaults.set(key.base64EncodedString(), forKey: "\(keyPrefix)identity_\(contactId)")
    }

    private func getStoredIdentityKey(for contactId: String) -> Data? {
        guard let b64 = defaults.string(forKey: "\(keyPrefix)identity_\(contactId)") else {
            return nil
        }
        return Data(base64Encoded: b64)
    }

    // MARK: - Result Types

    enum VerificationResult {
        case verified
        case mismatch
        case invalidData
    }

    enum IdentityChangeResult {
        case firstSeen
        case unchanged
        case changed(previousFingerprint: String, newFingerprint: String)
    }
}
