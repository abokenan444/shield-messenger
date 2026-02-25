import SwiftUI

/// Secure Legion - Private & Encrypted Messaging
/// Built with SwiftUI + Rust Core (Matrix Protocol)
@main
struct SecureLegionApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var chatViewModel = ChatViewModel()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environmentObject(chatViewModel)
                    .preferredColorScheme(.dark)
            } else {
                LoginView()
                    .environmentObject(authViewModel)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
