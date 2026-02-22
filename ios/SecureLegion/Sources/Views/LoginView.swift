import SwiftUI

/// Login screen with Shield Messenger identity authentication
struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var l10n: LocalizationManager
    @State private var username = ""
    @State private var password = ""
    @State private var showRegister = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // Logo
                    VStack(spacing: 12) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 64))
                            .foregroundStyle(.green)
                            .padding()
                            .background(.green.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 20))

                        Text("Shield Messenger")
                            .font(.largeTitle.bold())

                        Text(l10n.t["login_subtitle"] ?? "Private & Encrypted Messaging Platform")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 60)

                    // Form
                    VStack(spacing: 16) {
                        TextField(l10n.t["login_username"] ?? "Username", text: $username)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        SecureField(l10n.t["login_password"] ?? "Password", text: $password)
                            .textFieldStyle(.roundedBorder)

                        if let error = authVM.errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(.red)
                                .padding(.vertical, 8)
                        }

                        Button {
                            Task {
                                await authVM.login(username: username, password: password)
                            }
                        } label: {
                            if authVM.isLoading {
                                ProgressView()
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            } else {
                                Text(l10n.t["login_button"] ?? "Sign In")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .disabled(username.isEmpty || password.isEmpty || authVM.isLoading)

                        Button(l10n.t["login_no_account"] ?? "Don't have an account? Register now") {
                            showRegister = true
                        }
                        .font(.footnote)
                        .foregroundStyle(.green)
                    }
                    .padding(.horizontal, 24)

                    // Encryption badge
                    HStack(spacing: 4) {
                        Image(systemName: "lock.shield")
                            .font(.caption2)
                        Text(l10n.t["login_e2ee"] ?? "End-to-End Encryption \u2022 E2EE")
                            .font(.caption2)
                    }
                    .foregroundStyle(.green.opacity(0.7))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.green.opacity(0.1))
                    .clipShape(Capsule())
                }
            }
            .background(Color(.systemBackground))
            .sheet(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(authVM)
            }
        }
    }
}

/// Registration screen
struct RegisterView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var l10n: LocalizationManager
    @Environment(\.dismiss) var dismiss
    @State private var username = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Image(systemName: "person.badge.shield.checkmark")
                        .font(.system(size: 48))
                        .foregroundStyle(.green)
                        .padding(.top, 32)

                    Text(l10n.t["register_title"] ?? "Create New Account")
                        .font(.title2.bold())

                    Text(l10n.t["register_no_email"] ?? "No email or phone number required")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    VStack(spacing: 16) {
                        TextField(l10n.t["login_username"] ?? "Username", text: $username)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)

                        SecureField(l10n.t["register_password_hint"] ?? "Password (at least 8 characters)", text: $password)
                            .textFieldStyle(.roundedBorder)

                        SecureField(l10n.t["register_confirm"] ?? "Confirm Password", text: $confirmPassword)
                            .textFieldStyle(.roundedBorder)

                        if let error = authVM.errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(.red)
                        }

                        Button {
                            guard password == confirmPassword else {
                                authVM.errorMessage = l10n.t["register_mismatch"] ?? "Passwords do not match"
                                return
                            }
                            Task {
                                await authVM.register(username: username, password: password)
                                if authVM.isAuthenticated { dismiss() }
                            }
                        } label: {
                            if authVM.isLoading {
                                ProgressView()
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            } else {
                                Text(l10n.t["register_button"] ?? "Create Account")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .disabled(username.isEmpty || password.count < 8 || authVM.isLoading)
                    }
                    .padding(.horizontal, 24)
                }
            }
            .navigationTitle(l10n.t["register_nav"] ?? "Register")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(l10n.t["register_cancel"] ?? "Cancel") { dismiss() }
                }
            }
        }
    }
}
