import Foundation
import Combine

/// Authentication view model — manages identity creation and login
/// No external server — identity is a local cryptographic keypair
@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userId: String?
    @Published var displayName: String?
    @Published var publicKey: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    /// Login with username and password (unlocks local keypair)
    func login(username: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await ShieldMessengerService.shared.login(
                displayName: username,
                password: password
            )
            userId = result.userId
            displayName = result.displayName
            publicKey = result.publicKey
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Create a new identity
    func register(username: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await ShieldMessengerService.shared.createIdentity(
                displayName: username,
                password: password
            )
            userId = result.userId
            displayName = result.displayName
            publicKey = result.publicKey
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    /// Logout and clear session
    func logout() {
        ShieldMessengerService.shared.logout()
        isAuthenticated = false
        userId = nil
        displayName = nil
        publicKey = nil
    }
}
