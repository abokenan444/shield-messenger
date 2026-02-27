import Foundation
import React

/**
 * RustBridge — Swift Native Module that wraps the Rust C FFI (libsecurelegion.a).
 *
 * This module is registered with React Native and exposes async methods
 * callable from TypeScript via NativeModules.RustBridge.
 *
 * Build requirements:
 *   1. Compile Rust for iOS:
 *      $ rustup target add aarch64-apple-ios aarch64-apple-ios-sim
 *      $ cargo build --target aarch64-apple-ios --features ios --release
 *   2. Link libsecurelegion.a in Xcode → Build Phases → Link Binary
 *   3. Add ShieldMessenger-Bridging-Header.h with C function declarations
 */

@objc(RustBridge)
class RustBridge: NSObject {

  // MARK: - Core

  @objc
  func `init`(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    let result = sl_init()
    resolve(result)
  }

  @objc
  func getVersion(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let cStr = sl_version() else {
      resolve("unknown")
      return
    }
    let version = String(cString: cStr)
    sl_free_string(cStr)
    resolve(version)
  }

  // MARK: - Identity Keypair

  @objc
  func generateIdentityKeypair(_ resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    let keypair = sl_generate_identity_keypair()
    guard keypair.success == 1 else {
      reject("ERR_KEYGEN", "Failed to generate identity keypair", nil)
      return
    }

    var pubKey = keypair.public_key
    var privKey = keypair.private_key
    let pubData = Data(bytes: &pubKey, count: 32)
    let privData = Data(bytes: &privKey, count: 32)

    resolve([
      "publicKey": pubData.base64EncodedString(),
      "privateKey": privData.base64EncodedString(),
    ])
  }

  // MARK: - X25519 Key Exchange

  @objc
  func generateX25519Keypair(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
    let keypair = sl_generate_x25519_keypair()
    guard keypair.success == 1 else {
      reject("ERR_KEYGEN", "Failed to generate X25519 keypair", nil)
      return
    }

    var pubKey = keypair.public_key
    var privKey = keypair.private_key
    let pubData = Data(bytes: &pubKey, count: 32)
    let privData = Data(bytes: &privKey, count: 32)

    resolve([
      "publicKey": pubData.base64EncodedString(),
      "privateKey": privData.base64EncodedString(),
    ])
  }

  @objc
  func deriveSharedSecret(_ ourPrivateKey: String,
                          theirPublicKey: String,
                          resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let ourData = Data(base64Encoded: ourPrivateKey),
          let theirData = Data(base64Encoded: theirPublicKey),
          ourData.count == 32, theirData.count == 32 else {
      reject("ERR_INPUT", "Invalid key data", nil)
      return
    }

    var outSecret = [UInt8](repeating: 0, count: 32)
    let result = ourData.withUnsafeBytes { ourPtr in
      theirData.withUnsafeBytes { theirPtr in
        sl_x25519_derive_shared_secret(
          ourPtr.baseAddress!.assumingMemoryBound(to: UInt8.self),
          theirPtr.baseAddress!.assumingMemoryBound(to: UInt8.self),
          &outSecret
        )
      }
    }

    guard result == 0 else {
      reject("ERR_DH", "Key exchange failed", nil)
      return
    }

    resolve(Data(outSecret).base64EncodedString())
  }

  // MARK: - Encryption

  @objc
  func encrypt(_ plaintext: String,
               key: String,
               resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let keyData = Data(base64Encoded: key), keyData.count == 32 else {
      reject("ERR_INPUT", "Invalid key", nil)
      return
    }

    let plaintextBytes = Array(plaintext.utf8)
    var outLen: Int = 0

    let result = keyData.withUnsafeBytes { keyPtr in
      sl_encrypt(
        plaintextBytes, plaintextBytes.count,
        keyPtr.baseAddress!.assumingMemoryBound(to: UInt8.self),
        &outLen
      )
    }

    guard let resultPtr = result, outLen > 0 else {
      reject("ERR_ENCRYPT", "Encryption failed", nil)
      return
    }

    let cipherData = Data(bytes: resultPtr, count: outLen)
    sl_free_bytes(UnsafeMutablePointer(mutating: resultPtr), outLen, outLen)

    resolve([
      "ciphertext": cipherData.base64EncodedString(),
      "nonce": "", // nonce is prepended to ciphertext
    ])
  }

  // MARK: - Password Hashing

  @objc
  func hashPassword(_ password: String,
                    resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let cPassword = password.cString(using: .utf8) else {
      reject("ERR_INPUT", "Invalid password string", nil)
      return
    }

    guard let hashPtr = sl_hash_password(cPassword) else {
      reject("ERR_HASH", "Password hashing failed", nil)
      return
    }

    let hash = String(cString: hashPtr)
    sl_free_string(hashPtr)
    resolve(hash)
  }

  // MARK: - Safety Numbers

  @objc
  func generateSafetyNumber(_ ourIdentity: String,
                             theirIdentity: String,
                             resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let ourData = Data(base64Encoded: ourIdentity),
          let theirData = Data(base64Encoded: theirIdentity) else {
      reject("ERR_INPUT", "Invalid identity keys", nil)
      return
    }

    var outBuf = [CChar](repeating: 0, count: 256)
    let result = ourData.withUnsafeBytes { ourPtr in
      theirData.withUnsafeBytes { theirPtr in
        sl_generate_safety_number(
          ourPtr.baseAddress!.assumingMemoryBound(to: UInt8.self), ourData.count,
          theirPtr.baseAddress!.assumingMemoryBound(to: UInt8.self), theirData.count,
          &outBuf, 256
        )
      }
    }

    guard result == 0 else {
      reject("ERR_SAFETY", "Safety number generation failed", nil)
      return
    }

    let number = String(cString: outBuf)
    resolve(["number": number, "qrData": ""])
  }

  // MARK: - Module Configuration

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  static func moduleName() -> String {
    return "RustBridge"
  }
}
