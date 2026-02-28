import SwiftUI

struct WalletView: View {
    @EnvironmentObject var l10n: LocalizationManager
    @State private var hasWallet = false
    @State private var walletType: String = "solana"
    @State private var address: String = ""
    @State private var totalBalance: Double = 0.0
    @State private var tokens: [(symbol: String, name: String, balance: Double, usdValue: Double, icon: String)] = []
    @State private var transactions: [(id: String, type: String, token: String, amount: Double, address: String, date: Date, status: String)] = []
    @State private var selectedTab = 0
    @State private var showSend = false
    @State private var sendTo = ""
    @State private var sendAmount = ""
    @State private var showSetup = false
    @State private var setupMode: SetupMode?
    @State private var seedInput = ""
    @State private var selectedType = "solana"
    @State private var copied = false

    enum SetupMode { case create, importWallet }

    var body: some View {
        NavigationStack {
            if !hasWallet {
                walletSetupView
            } else {
                walletMainView
            }
        }
    }

    // MARK: - Setup View
    var walletSetupView: some View {
        VStack(spacing: 20) {
            if setupMode == nil {
                Spacer()
                Image(systemName: "creditcard")
                    .font(.system(size: 60))
                    .foregroundStyle(.green)
                Text(l10n.t["wallet_title"] ?? "Wallet")
                    .font(.largeTitle.bold())
                Text(l10n.t["wallet_no_wallet"] ?? "No wallet yet")
                    .foregroundStyle(.secondary)

                VStack(spacing: 12) {
                    Button {
                        setupMode = .create
                    } label: {
                        Label(l10n.t["wallet_create"] ?? "Create Wallet", systemImage: "plus.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)

                    Button {
                        setupMode = .importWallet
                    } label: {
                        Label(l10n.t["wallet_import"] ?? "Import Wallet", systemImage: "arrow.down.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal, 40)
                Spacer()
            } else if setupMode == .create {
                typeSelectionView(action: {
                    createWallet(type: selectedType)
                    setupMode = nil
                })
            } else {
                importView
            }
        }
        .navigationTitle(l10n.t["wallet_title"] ?? "Wallet")
    }

    func typeSelectionView(action: @escaping () -> Void) -> some View {
        VStack(spacing: 16) {
            Text(l10n.t["wallet_create"] ?? "Create Wallet")
                .font(.headline)

            ForEach(["solana", "zcash"], id: \.self) { type in
                Button {
                    selectedType = type
                } label: {
                    HStack {
                        Text(type == "solana" ? "◎" : "Ⓩ")
                            .font(.title)
                        VStack(alignment: .leading) {
                            Text(type == "solana" ? "Solana" : "Zcash")
                                .font(.headline)
                            Text(type == "solana" ? "SOL + USDC + Jupiter DEX" : (l10n.t["wallet_shielded"] ?? "Shielded"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if selectedType == type {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(selectedType == type ? .green : .gray.opacity(0.3), lineWidth: selectedType == type ? 2 : 1)
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal)

            Button(action: action) {
                Text("\(l10n.t["wallet_create"] ?? "Create") \(selectedType == "solana" ? "Solana" : "Zcash")")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .padding(.horizontal)

            Button(l10n.t["friends_cancel"] ?? "Cancel") {
                setupMode = nil
            }
            .foregroundStyle(.secondary)

            Spacer()
        }
        .padding(.top)
    }

    var importView: some View {
        VStack(spacing: 16) {
            Text(l10n.t["wallet_import"] ?? "Import Wallet")
                .font(.headline)

            Picker("", selection: $selectedType) {
                Text("Solana").tag("solana")
                Text("Zcash").tag("zcash")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            TextEditor(text: $seedInput)
                .frame(height: 100)
                .padding(8)
                .background(RoundedRectangle(cornerRadius: 8).stroke(.gray.opacity(0.3)))
                .padding(.horizontal)
                .overlay(
                    Group {
                        if seedInput.isEmpty {
                            Text(l10n.t["wallet_seed_phrase"] ?? "Seed Phrase")
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 28)
                                .padding(.top, 18)
                        }
                    },
                    alignment: .topLeading
                )

            Button {
                importWallet(type: selectedType)
                setupMode = nil
                seedInput = ""
            } label: {
                Text(l10n.t["wallet_import"] ?? "Import")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .disabled(seedInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .padding(.horizontal)

            Button(l10n.t["friends_cancel"] ?? "Cancel") {
                setupMode = nil
            }
            .foregroundStyle(.secondary)

            Spacer()
        }
        .padding(.top)
    }

    // MARK: - Main Wallet View
    var walletMainView: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Balance card
                VStack(spacing: 8) {
                    Text(l10n.t["wallet_total_balance"] ?? "Total Balance")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("$\(totalBalance, specifier: "%.2f")")
                        .font(.system(size: 36, weight: .bold))
                    Text(address)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Button {
                        UIPasteboard.general.string = address
                        copied = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
                    } label: {
                        Text(copied ? (l10n.t["contacts_copied"] ?? "Copied!") : (l10n.t["contacts_copy_address"] ?? "Copy"))
                            .font(.caption)
                    }

                    // Action buttons
                    HStack(spacing: 16) {
                        actionButton(title: l10n.t["wallet_send"] ?? "Send", icon: "arrow.up.circle.fill") {
                            showSend = true
                        }
                        actionButton(title: l10n.t["wallet_receive"] ?? "Receive", icon: "arrow.down.circle.fill") {}
                        if walletType == "solana" {
                            actionButton(title: l10n.t["wallet_swap"] ?? "Swap", icon: "arrow.triangle.2.circlepath") {}
                        }
                    }
                    .padding(.top, 8)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(RoundedRectangle(cornerRadius: 16).fill(.green.opacity(0.1)))
                .padding(.horizontal)

                // Tabs
                Picker("", selection: $selectedTab) {
                    Text(l10n.t["wallet_tokens"] ?? "Tokens").tag(0)
                    Text(l10n.t["wallet_history"] ?? "History").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                if selectedTab == 0 {
                    // Tokens
                    ForEach(tokens, id: \.symbol) { token in
                        HStack(spacing: 12) {
                            Text(token.icon)
                                .font(.title2)
                            VStack(alignment: .leading) {
                                Text(token.name).font(.headline)
                                Text(token.symbol)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text(String(format: "%.4f", token.balance)).font(.headline)
                                Text("$\(token.usdValue, specifier: "%.2f")")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.horizontal)
                    }
                } else {
                    // Transactions
                    if transactions.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 40))
                                .foregroundStyle(.secondary.opacity(0.5))
                            Text(l10n.t["wallet_no_transactions"] ?? "No transactions")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 40)
                    } else {
                        ForEach(transactions, id: \.id) { tx in
                            HStack(spacing: 12) {
                                Image(systemName: tx.type == "send" ? "arrow.up.right" : tx.type == "receive" ? "arrow.down.left" : "arrow.triangle.2.circlepath")
                                    .foregroundStyle(tx.type == "send" ? .red : tx.type == "receive" ? .green : .blue)
                                VStack(alignment: .leading) {
                                    Text(tx.type.capitalized).font(.headline)
                                    Text(tx.address)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text("\(tx.type == "send" ? "-" : "+")\(tx.amount, specifier: "%.4f") \(tx.token)")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(tx.type == "send" ? .red : .green)
                                    Text(tx.date, style: .date)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                }
            }
        }
        .navigationTitle(l10n.t["wallet_title"] ?? "Wallet")
        .sheet(isPresented: $showSend) {
            sendSheet
        }
    }

    var sendSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                TextField(l10n.t["wallet_send_to"] ?? "Send To", text: $sendTo)
                    .textFieldStyle(.roundedBorder)
                HStack {
                    TextField(l10n.t["wallet_amount"] ?? "Amount", text: $sendAmount)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.decimalPad)
                }
                Button {
                    guard let amount = Double(sendAmount), !sendTo.isEmpty else { return }
                    transactions.insert(
                        (id: UUID().uuidString, type: "send", token: tokens.first?.symbol ?? "SOL",
                         amount: amount, address: sendTo, date: Date(), status: "pending"),
                        at: 0
                    )
                    showSend = false
                    sendTo = ""
                    sendAmount = ""
                } label: {
                    Text(l10n.t["wallet_confirm"] ?? "Confirm")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(sendTo.isEmpty || sendAmount.isEmpty)

                Spacer()
            }
            .padding()
            .navigationTitle(l10n.t["wallet_send"] ?? "Send")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(l10n.t["friends_cancel"] ?? "Cancel") {
                        showSend = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    func actionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption2)
            }
            .frame(width: 70)
        }
        .buttonStyle(.bordered)
        .tint(.green)
    }

    func createWallet(type: String) {
        walletType = type
        hasWallet = true
        address = type == "solana" ? "So1...Shield\(Int.random(in: 100...999))" : "zs1...Shield\(Int.random(in: 100...999))"
        tokens = type == "solana"
            ? [("SOL", "Solana", 0, 0, "◎"), ("USDC", "USD Coin", 0, 0, "$")]
            : [("ZEC", "Zcash", 0, 0, "Ⓩ")]
        totalBalance = 0
        transactions = []
    }

    func importWallet(type: String) {
        walletType = type
        hasWallet = true
        address = type == "solana" ? "So1...Import\(Int.random(in: 100...999))" : "zs1...Import\(Int.random(in: 100...999))"
        if type == "solana" {
            tokens = [("SOL", "Solana", 2.45, 245.0, "◎"), ("USDC", "USD Coin", 100, 100.0, "$")]
            totalBalance = 345.0
        } else {
            tokens = [("ZEC", "Zcash", 1.2, 36.0, "Ⓩ")]
            totalBalance = 36.0
        }
        transactions = [
            (id: UUID().uuidString, type: "receive", token: type == "solana" ? "SOL" : "ZEC",
             amount: type == "solana" ? 2.45 : 1.2, address: "external...addr",
             date: Date().addingTimeInterval(-86400), status: "confirmed")
        ]
    }
}
