import Foundation

/// DataExtensions — Convenience extensions on Data and [UInt8].
///
/// Provides hex encoding/decoding and secure zeroing of byte buffers,
/// used throughout the crypto layer for key representation and wire formats.

extension Data {

    /// Hex-encode this data: Data([0xDE, 0xAD]) → "dead"
    var hexString: String {
        return map { String(format: "%02x", $0) }.joined()
    }

    /// Initialize Data from a hex string. Returns nil if the string is invalid.
    init?(hex: String) {
        let cleanHex = hex.replacingOccurrences(of: " ", with: "")
        guard cleanHex.count.isMultiple(of: 2) else { return nil }

        var data = Data(capacity: cleanHex.count / 2)
        var index = cleanHex.startIndex

        for _ in 0..<cleanHex.count / 2 {
            let nextIndex = cleanHex.index(index, offsetBy: 2)
            guard let byte = UInt8(cleanHex[index..<nextIndex], radix: 16) else {
                return nil
            }
            data.append(byte)
            index = nextIndex
        }

        self = data
    }

    /// Base64url encoding (RFC 4648 §5), used for JWK/JWT interop.
    var base64urlEncoded: String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// Decode a base64url string.
    init?(base64url: String) {
        var base64 = base64url
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        // Pad to multiple of 4
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }
        self.init(base64Encoded: base64)
    }

    /// Constant-time equality comparison to avoid timing side-channels.
    func constantTimeEquals(_ other: Data) -> Bool {
        guard self.count == other.count else { return false }
        var result: UInt8 = 0
        for i in 0..<self.count {
            result |= self[i] ^ other[i]
        }
        return result == 0
    }
}

extension Array where Element == UInt8 {

    /// Hex-encode this byte array.
    var hexString: String {
        return Data(self).hexString
    }
}
