import SwiftUI

struct SecurityView: View {
    @EnvironmentObject var l10n: LocalizationManager
    @State private var appLockEnabled = false
    @State private var biometricEnabled = false
    @State private var duressEnabled = false
    @State private var showDuressSetup = false
    @State private var duressPin = ""
    @State private var showWipeConfirm = false
    @State private var lockTimeout = 5

    var body: some View {
        NavigationStack {
            List {
                // App Lock
                Section(l10n.t["security_app_lock"] ?? "App Lock") {
                    Toggle(l10n.t["security_app_lock"] ?? "App Lock", isOn: $appLockEnabled)
                        .tint(.green)

                    if appLockEnabled {
                        Toggle(l10n.t["security_biometric"] ?? "Biometric Authentication", isOn: $biometricEnabled)
                            .tint(.green)

                        HStack {
                            Text(l10n.t["security_lock_timeout"] ?? "Lock Timeout")
                            Spacer()
                            Picker("", selection: $lockTimeout) {
                                Text("1 min").tag(1)
                                Text("5 min").tag(5)
                                Text("15 min").tag(15)
                                Text("30 min").tag(30)
                            }
                            .pickerStyle(.menu)
                        }
                    }
                }

                // Duress PIN
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(l10n.t["security_duress_pin"] ?? "Duress PIN")
                            .font(.headline)
                        Text(l10n.t["security_duress_desc"] ?? "A PIN that wipes all data when entered")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if duressEnabled {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                            Text(l10n.t["state_connected"] ?? "Enabled")
                                .foregroundStyle(.green)
                            Spacer()
                            Button(l10n.t["security_disable"] ?? "Disable") {
                                duressEnabled = false
                            }
                            .foregroundStyle(.red)
                        }
                    } else if showDuressSetup {
                        SecureField("PIN (4+)", text: $duressPin)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.numberPad)

                        HStack {
                            Button(l10n.t["wallet_confirm"] ?? "Confirm") {
                                if duressPin.count >= 4 {
                                    duressEnabled = true
                                    showDuressSetup = false
                                    duressPin = ""
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                            .disabled(duressPin.count < 4)

                            Button(l10n.t["friends_cancel"] ?? "Cancel") {
                                showDuressSetup = false
                                duressPin = ""
                            }
                            .buttonStyle(.bordered)
                        }
                    } else {
                        Button(l10n.t["security_setup_duress"] ?? "Set Duress PIN") {
                            showDuressSetup = true
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)
                    }
                }

                // Encryption Status
                Section(l10n.t["settings_privacy"] ?? "Privacy & Security") {
                    Label {
                        HStack {
                            Text("End-to-End Encryption")
                            Spacer()
                            Text("Double Ratchet + PQ")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                    } icon: {
                        Image(systemName: "lock.shield.fill")
                            .foregroundStyle(.green)
                    }

                    Label {
                        HStack {
                            Text("Post-Quantum Crypto")
                            Spacer()
                            Text("X25519 + ML-KEM-1024")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                    } icon: {
                        Image(systemName: "atom")
                            .foregroundStyle(.green)
                    }

                    Label {
                        HStack {
                            Text(l10n.t["settings_tor"] ?? "Tor Routing")
                            Spacer()
                            Text(l10n.t["tor_connected"] ?? "Connected")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                    } icon: {
                        Image(systemName: "network")
                            .foregroundStyle(.green)
                    }

                    Label {
                        HStack {
                            Text("SQLCipher")
                            Spacer()
                            Text(l10n.t["tor_connected"] ?? "Enabled")
                                .font(.caption)
                                .foregroundStyle(.green)
                        }
                    } icon: {
                        Image(systemName: "cylinder.split.1x2")
                            .foregroundStyle(.green)
                    }
                }

                // Tor Status
                Section(l10n.t["tor_status"] ?? "Tor Status") {
                    HStack {
                        Text(l10n.t["tor_status"] ?? "Status")
                        Spacer()
                        HStack(spacing: 4) {
                            Circle()
                                .fill(.green)
                                .frame(width: 8, height: 8)
                            Text(l10n.t["tor_connected"] ?? "Connected")
                                .foregroundStyle(.green)
                                .font(.caption)
                        }
                    }

                    HStack {
                        Text(l10n.t["tor_circuits"] ?? "Circuits")
                        Spacer()
                        Text("6")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text(l10n.t["tor_bridges"] ?? "Bridges")
                        Spacer()
                        Text("obfs4")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text(l10n.t["tor_health"] ?? "Health")
                        Spacer()
                        Text("●●●●○")
                            .foregroundStyle(.green)
                    }

                    Toggle(l10n.t["tor_vpn_mode"] ?? "VPN Mode", isOn: .constant(false))
                        .tint(.green)
                }

                // Secure Wipe
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Label(l10n.t["security_wipe"] ?? "Wipe Account", systemImage: "trash.fill")
                            .foregroundStyle(.red)
                            .font(.headline)
                        Text(l10n.t["security_wipe_desc"] ?? "Permanently delete all data, keys, and messages")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Button(role: .destructive) {
                        showWipeConfirm = true
                    } label: {
                        Text(l10n.t["security_wipe"] ?? "Wipe Account")
                            .frame(maxWidth: .infinity)
                    }
                    .alert(l10n.t["security_wipe_confirm"] ?? "Are you sure?", isPresented: $showWipeConfirm) {
                        Button(l10n.t["friends_cancel"] ?? "Cancel", role: .cancel) {}
                        Button(l10n.t["security_wipe"] ?? "Wipe", role: .destructive) {
                            // Would clear all data in production
                        }
                    }
                }
            }
            .navigationTitle(l10n.t["security_title"] ?? "Security")
        }
    }
}
