import Foundation
import LocalAuthentication

/// BiometricAuthHelper — Face ID / Touch ID authentication wrapper.
///
/// Provides biometric authentication for app unlock and sensitive
/// operations such as seed phrase export and account wipe confirmation.
final class BiometricAuthHelper {

    enum BiometricType {
        case faceID
        case touchID
        case none
    }

    enum AuthError: Error {
        case biometryNotAvailable
        case biometryNotEnrolled
        case userCancelled
        case failed(String)
    }

    static let shared = BiometricAuthHelper()

    private init() {}

    /// Returns the biometric type available on this device.
    var availableBiometricType: BiometricType {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        default:
            return .none
        }
    }

    /// Whether biometric authentication is available and enrolled.
    var isBiometricAvailable: Bool {
        return availableBiometricType != .none
    }

    /// Authenticate the user with biometrics.
    /// - Parameter reason: Localized reason string shown to the user.
    /// - Parameter completion: Called on main thread with success/failure.
    func authenticate(reason: String, completion: @escaping (Result<Void, AuthError>) -> Void) {
        let context = LAContext()
        context.localizedFallbackTitle = ""  // Hide "Enter Password" fallback

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            DispatchQueue.main.async {
                if let laError = error as? LAError, laError.code == .biometryNotEnrolled {
                    completion(.failure(.biometryNotEnrolled))
                } else {
                    completion(.failure(.biometryNotAvailable))
                }
            }
            return
        }

        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, evaluateError in
            DispatchQueue.main.async {
                if success {
                    completion(.success(()))
                } else if let laError = evaluateError as? LAError, laError.code == .userCancel {
                    completion(.failure(.userCancelled))
                } else {
                    completion(.failure(.failed(evaluateError?.localizedDescription ?? "Unknown error")))
                }
            }
        }
    }
}
