import Foundation

/// SecureWipe — Cryptographic data erasure utilities.
///
/// Ensures sensitive data (keys, passphrases, plaintext) is securely
/// overwritten in memory before deallocation, preventing forensic recovery.
final class SecureWipe {

    static let shared = SecureWipe()

    private init() {}

    /// Securely zero out a mutable Data buffer.
    func wipe(_ data: inout Data) {
        data.withUnsafeMutableBytes { buffer in
            guard let baseAddress = buffer.baseAddress else { return }
            memset_s(baseAddress, buffer.count, 0, buffer.count)
        }
        data = Data()
    }

    /// Securely zero out a byte array.
    func wipe(_ bytes: inout [UInt8]) {
        bytes.withUnsafeMutableBufferPointer { buffer in
            guard let baseAddress = buffer.baseAddress else { return }
            memset_s(baseAddress, buffer.count, 0, buffer.count)
        }
        bytes = []
    }

    /// Securely wipe a String by zeroing its UTF-8 representation.
    /// Note: Swift strings are immutable/COW so this provides best-effort erasure.
    func wipe(_ string: inout String) {
        var utf8Bytes = Array(string.utf8)
        wipe(&utf8Bytes)
        string = ""
    }

    /// Wipe all stored keychain data and user defaults for this app.
    func wipeAllAppData() {
        KeychainHelper.shared.wipeAll()

        if let bundleId = Bundle.main.bundleIdentifier {
            UserDefaults.standard.removePersistentDomain(forName: bundleId)
        }
        UserDefaults.standard.synchronize()

        Logger.shared.info("All app data securely wiped")
    }

    // MARK: - Private

    /// Volatile memset that the compiler cannot optimize away.
    private func memset_s(_ dest: UnsafeMutableRawPointer, _ destSize: Int, _ value: Int32, _ count: Int) {
        memset(dest, value, min(destSize, count))
        // Access the pointer to prevent dead-store elimination
        _ = dest.load(as: UInt8.self)
    }
}
