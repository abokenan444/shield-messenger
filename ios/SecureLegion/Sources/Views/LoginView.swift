import SwiftUI

/// Login screen with Secure Legion identity authentication
struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
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

                        Text("Secure Legion")
                            .font(.largeTitle.bold())

                        Text("منصة المراسلة الخاصة والمشفرة")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 60)

                    // Form
                    VStack(spacing: 16) {
                        TextField("اسم المستخدم", text: $username)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        SecureField("كلمة المرور", text: $password)
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
                                Text("تسجيل الدخول")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                        .disabled(username.isEmpty || password.isEmpty || authVM.isLoading)

                        Button("ليس لديك حساب؟ سجّل الآن") {
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
                        Text("تشفير تام بين الطرفين • E2EE")
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

                    Text("إنشاء حساب جديد")
                        .font(.title2.bold())

                    Text("لا نطلب بريداً إلكترونياً أو رقم هاتف")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    VStack(spacing: 16) {
                        TextField("اسم المستخدم", text: $username)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)

                        SecureField("كلمة المرور (8 أحرف على الأقل)", text: $password)
                            .textFieldStyle(.roundedBorder)

                        SecureField("تأكيد كلمة المرور", text: $confirmPassword)
                            .textFieldStyle(.roundedBorder)

                        if let error = authVM.errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(.red)
                        }

                        Button {
                            guard password == confirmPassword else {
                                authVM.errorMessage = "كلمتا المرور غير متطابقتين"
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
                                Text("إنشاء حساب")
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
            .navigationTitle("تسجيل")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { dismiss() }
                }
            }
        }
    }
}
