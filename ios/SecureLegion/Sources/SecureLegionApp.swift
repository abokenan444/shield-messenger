import SwiftUI

/// Shield Messenger - Private & Encrypted Messaging
/// Built with SwiftUI + Rust Core (Matrix Protocol)
@main
struct SecureLegionApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var chatViewModel = ChatViewModel()
    @StateObject private var l10nManager = LocalizationManager()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environmentObject(chatViewModel)
                    .environmentObject(l10nManager)
                    .environment(\.layoutDirection, l10nManager.layoutDirection)
                    .preferredColorScheme(.dark)
            } else {
                LoginView()
                    .environmentObject(authViewModel)
                    .environmentObject(l10nManager)
                    .environment(\.layoutDirection, l10nManager.layoutDirection)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
