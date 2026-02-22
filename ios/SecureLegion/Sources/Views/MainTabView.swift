import SwiftUI

/// Main tab navigation
struct MainTabView: View {
    @EnvironmentObject var chatVM: ChatViewModel
    @EnvironmentObject var callVM: CallViewModel
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        ZStack {
            TabView {
                ChatListView()
                    .tabItem {
                        Label(l10n.t["tab_chats"] ?? "Chats", systemImage: "bubble.left.and.bubble.right")
                    }

                CallsListView()
                    .tabItem {
                        Label(l10n.t["tab_calls"] ?? "Calls", systemImage: "phone")
                    }

                ContactsView()
                    .tabItem {
                        Label(l10n.t["tab_contacts"] ?? "Contacts", systemImage: "person.2")
                    }

                WalletView()
                    .tabItem {
                        Label(l10n.t["wallet_title"] ?? "Wallet", systemImage: "creditcard")
                    }

                SecurityView()
                    .tabItem {
                        Label(l10n.t["security_title"] ?? "Security", systemImage: "lock.shield")
                    }

                SettingsView()
                    .tabItem {
                        Label(l10n.t["tab_settings"] ?? "Settings", systemImage: "gearshape")
                    }
            }
            .tint(.green)
            .environment(\.layoutDirection, l10n.layoutDirection)
            .task {
                await chatVM.loadRooms()
            }

            // Active call overlay
            if callVM.isActive {
                Group {
                    if callVM.callType == .video {
                        VideoCallView()
                            .environmentObject(callVM)
                    } else {
                        VoiceCallView()
                            .environmentObject(callVM)
                    }
                }
                .transition(.move(edge: .bottom))
            }
        }
        .sheet(isPresented: $callVM.showIncomingCall) {
            IncomingCallSheet()
                .environmentObject(callVM)
                .presentationDetents([.medium])
        }
    }
}

/// Chat list screen
struct ChatListView: View {
    @EnvironmentObject var chatVM: ChatViewModel
    @EnvironmentObject var l10n: LocalizationManager
    @State private var searchText = ""

    var filteredRooms: [ChatRoom] {
        if searchText.isEmpty { return chatVM.rooms }
        return chatVM.rooms.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            List(filteredRooms) { room in
                NavigationLink {
                    ChatDetailView(room: room)
                        .environmentObject(chatVM)
                } label: {
                    ChatRowView(room: room)
                }
            }
            .listStyle(.plain)
            .searchable(text: $searchText, prompt: Text(l10n.t["chat_search"] ?? "Search chats"))
            .navigationTitle(l10n.t["tab_chats"] ?? "Chats")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        // New chat
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
        }
    }
}

/// Single chat row in the list
struct ChatRowView: View {
    let room: ChatRoom
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(.green.opacity(0.2))
                    .frame(width: 50, height: 50)
                Text(String(room.name.prefix(1)))
                    .font(.title2.bold())
                    .foregroundStyle(.green)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(room.name)
                        .font(.headline)

                    if room.encrypted {
                        Image(systemName: "lock.shield.fill")
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }

                    Spacer()

                    if let time = room.lastMessageTime {
                        Text(time, style: .relative)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack {
                    Text(room.lastMessage ?? (l10n.t["chat_no_messages"] ?? "No messages"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    Spacer()

                    if room.unreadCount > 0 {
                        Text("\(room.unreadCount)")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(.green)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

/// Chat detail / conversation view
struct ChatDetailView: View {
    let room: ChatRoom
    @EnvironmentObject var chatVM: ChatViewModel
    @EnvironmentObject var callVM: CallViewModel
    @EnvironmentObject var l10n: LocalizationManager
    @State private var messageText = ""

    var messages: [ChatMessage] {
        chatVM.messages[room.id] ?? []
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollView {
                LazyVStack(spacing: 8) {
                    // Encryption notice
                    HStack(spacing: 4) {
                        Image(systemName: "lock.shield")
                            .font(.caption2)
                        Text(l10n.t["chat_encrypted"] ?? "Messages are end-to-end encrypted")
                            .font(.caption2)
                    }
                    .foregroundStyle(.green.opacity(0.7))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.green.opacity(0.1))
                    .clipShape(Capsule())
                    .padding(.vertical, 16)

                    ForEach(messages) { message in
                        MessageBubble(
                            message: message,
                            isSentByMe: message.senderId == "sl_me"
                        )
                    }
                }
                .padding(.horizontal)
            }

            Divider()

            // Input bar
            HStack(spacing: 12) {
                Button {
                    // Attach file
                } label: {
                    Image(systemName: "paperclip")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                TextField(l10n.t["chat_placeholder"] ?? "Write an encrypted message...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)

                Button {
                    guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                    let text = messageText
                    messageText = ""
                    Task {
                        await chatVM.sendMessage(roomId: room.id, text: text)
                    }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundStyle(.green)
                }
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding()
        }
        .navigationTitle(room.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    callVM.startCall(
                        userId: room.members.first(where: { $0 != "sl_me" }) ?? "",
                        displayName: room.name,
                        type: .voice
                    )
                } label: {
                    Image(systemName: "phone")
                }
                Button {
                    callVM.startCall(
                        userId: room.members.first(where: { $0 != "sl_me" }) ?? "",
                        displayName: room.name,
                        type: .video
                    )
                } label: {
                    Image(systemName: "video")
                }
            }
        }
    }
}

/// Message bubble component
struct MessageBubble: View {
    let message: ChatMessage
    let isSentByMe: Bool

    var body: some View {
        HStack {
            if isSentByMe { Spacer() }

            VStack(alignment: isSentByMe ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(isSentByMe ? Color.green : Color(.systemGray5))
                    .foregroundStyle(isSentByMe ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18))

                HStack(spacing: 4) {
                    Text(message.timestamp, style: .time)
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if isSentByMe {
                        Image(systemName: statusIcon)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 4)
            }

            if !isSentByMe { Spacer() }
        }
    }

    var statusIcon: String {
        switch message.status {
        case .sending: return "clock"
        case .sent: return "checkmark"
        case .delivered: return "checkmark.circle"
        case .read: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.circle"
        }
    }
}

/// Placeholder views
struct CallsListView: View {
    @EnvironmentObject var callVM: CallViewModel
    @EnvironmentObject var l10n: LocalizationManager
    @State private var filter: CallFilter = .all

    enum CallFilter: String, CaseIterable {
        case all = "all"
        case missed = "missed"
        case voice = "voice"
        case video = "video"

        func localizedName(_ t: [String: String]) -> String {
            switch self {
            case .all: return t["calls_all"] ?? "All"
            case .missed: return t["calls_missed"] ?? "Missed"
            case .voice: return t["calls_voice"] ?? "Voice"
            case .video: return t["calls_video"] ?? "Video"
            }
        }
    }

    var filteredLog: [CallLogEntry] {
        switch filter {
        case .all: return callVM.callLog
        case .missed: return callVM.callLog.filter { $0.missed }
        case .voice: return callVM.callLog.filter { $0.type == .voice }
        case .video: return callVM.callLog.filter { $0.type == .video }
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter
                Picker(l10n.t["calls_filter"] ?? "Filter", selection: $filter) {
                    ForEach(CallFilter.allCases, id: \.self) { f in
                        Text(f.localizedName(l10n.t)).tag(f)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                if filteredLog.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "phone.badge.checkmark")
                            .font(.system(size: 48))
                            .foregroundStyle(.green.opacity(0.5))
                        Text(l10n.t["calls_no_calls"] ?? "No calls")
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    List(filteredLog) { entry in
                        CallLogRow(entry: entry) {
                            callVM.startCall(
                                userId: "",
                                displayName: entry.displayName,
                                type: entry.type
                            )
                        }
                    }
                    .listStyle(.plain)
                }

                // E2EE notice
                HStack(spacing: 4) {
                    Image(systemName: "lock.shield.fill")
                        .font(.caption2)
                    Text(l10n.t["calls_encrypted"] ?? "All calls are end-to-end encrypted E2EE")
                        .font(.caption2)
                }
                .foregroundStyle(.green.opacity(0.5))
                .padding(.vertical, 8)
            }
            .navigationTitle(l10n.t["tab_calls"] ?? "Calls")
        }
    }
}

struct CallLogRow: View {
    let entry: CallLogEntry
    let onCallBack: () -> Void
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(entry.missed ? .red.opacity(0.15) : .green.opacity(0.15))
                    .frame(width: 44, height: 44)
                Text(String(entry.displayName.prefix(1)))
                    .font(.title3.bold())
                    .foregroundStyle(entry.missed ? .red : .green)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(entry.displayName)
                    .font(.headline)
                    .foregroundStyle(entry.missed ? .red : .primary)

                HStack(spacing: 6) {
                    Image(systemName: entry.missed ? "phone.arrow.down.left" :
                            entry.direction == .incoming ? "phone.arrow.down.left" : "phone.arrow.up.right")
                        .font(.caption2)
                        .foregroundStyle(entry.missed ? .red : entry.direction == .incoming ? .green : .blue)

                    Image(systemName: entry.type == .video ? "video.fill" : "phone.fill")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Text(entry.timestamp, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if !entry.missed && entry.duration > 0 {
                        Text("• \(entry.formattedDuration)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if entry.missed {
                        Text(l10n.t["calls_missed_label"] ?? "Missed")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }

            Spacer()

            Button(action: onCallBack) {
                Image(systemName: entry.type == .video ? "video.fill" : "phone.fill")
                    .foregroundStyle(.green)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ContactsView: View {
    @EnvironmentObject var l10n: LocalizationManager
    @State private var searchText = ""
    @State private var selectedTab = 0
    @State private var showAddSheet = false
    @State private var newAddress = ""
    @State private var requestSent = false

    // Mock data
    @State private var contacts: [(id: String, name: String, onion: String, online: Bool, verified: Bool, blocked: Bool)] = [
        (id: "1", name: "أحمد محمد", onion: "abc123...onion", online: true, verified: true, blocked: false),
        (id: "2", name: "سارة أحمد", onion: "def456...onion", online: false, verified: true, blocked: false),
        (id: "3", name: "خالد حسن", onion: "ghi789...onion", online: true, verified: false, blocked: false),
    ]

    @State private var incomingRequests: [(id: String, name: String, onion: String)] = [
        (id: "fr1", name: "محمد علي", onion: "jkl012...onion"),
    ]

    var filteredContacts: [(id: String, name: String, onion: String, online: Bool, verified: Bool, blocked: Bool)] {
        let unblocked = contacts.filter { !$0.blocked }
        if searchText.isEmpty { return unblocked }
        return unblocked.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab picker
                Picker("", selection: $selectedTab) {
                    Text(l10n.t["contacts_title"] ?? "Contacts").tag(0)
                    HStack {
                        Text(l10n.t["friends_incoming"] ?? "Requests")
                        if !incomingRequests.isEmpty {
                            Text("\(incomingRequests.count)")
                                .font(.caption2.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.red)
                                .clipShape(Capsule())
                        }
                    }.tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                if selectedTab == 0 {
                    // Contacts list
                    if filteredContacts.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "person.2")
                                .font(.system(size: 48))
                                .foregroundStyle(.green.opacity(0.5))
                            Text(l10n.t["contacts_no_contacts"] ?? "No contacts yet")
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    } else {
                        List {
                            ForEach(filteredContacts, id: \.id) { contact in
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(.green.opacity(0.2))
                                            .frame(width: 44, height: 44)
                                        Text(String(contact.name.prefix(1)))
                                            .font(.title3.bold())
                                            .foregroundStyle(.green)
                                    }
                                    .overlay(
                                        Circle()
                                            .fill(contact.online ? .green : .gray)
                                            .frame(width: 12, height: 12)
                                            .offset(x: 16, y: 16)
                                    )

                                    VStack(alignment: .leading, spacing: 2) {
                                        HStack {
                                            Text(contact.name).font(.headline)
                                            if contact.verified {
                                                Image(systemName: "checkmark.shield.fill")
                                                    .font(.caption)
                                                    .foregroundStyle(.green)
                                            }
                                        }
                                        Text(contact.onion)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Text(contact.online
                                         ? (l10n.t["contacts_online"] ?? "Online")
                                         : (l10n.t["contacts_offline"] ?? "Offline"))
                                        .font(.caption)
                                        .foregroundStyle(contact.online ? .green : .secondary)
                                }
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) {
                                        contacts.removeAll { $0.id == contact.id }
                                    } label: {
                                        Label(l10n.t["contacts_remove"] ?? "Remove", systemImage: "trash")
                                    }
                                    Button {
                                        if let idx = contacts.firstIndex(where: { $0.id == contact.id }) {
                                            contacts[idx].blocked = true
                                        }
                                    } label: {
                                        Label(l10n.t["contacts_block"] ?? "Block", systemImage: "nosign")
                                    }
                                    .tint(.orange)
                                }
                            }
                        }
                        .listStyle(.plain)
                        .searchable(text: $searchText, prompt: Text(l10n.t["contacts_search"] ?? "Search contacts"))
                    }
                } else {
                    // Friend requests
                    if incomingRequests.isEmpty {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "envelope.open")
                                .font(.system(size: 48))
                                .foregroundStyle(.green.opacity(0.5))
                            Text(l10n.t["friends_no_requests"] ?? "No pending requests")
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    } else {
                        List {
                            ForEach(incomingRequests, id: \.id) { req in
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(.yellow.opacity(0.2))
                                            .frame(width: 44, height: 44)
                                        Text(String(req.name.prefix(1)))
                                            .font(.title3.bold())
                                            .foregroundStyle(.yellow)
                                    }

                                    VStack(alignment: .leading) {
                                        Text(req.name).font(.headline)
                                        Text(req.onion)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Button {
                                        contacts.append((id: req.id, name: req.name, onion: req.onion, online: false, verified: false, blocked: false))
                                        incomingRequests.removeAll { $0.id == req.id }
                                    } label: {
                                        Text(l10n.t["friends_accept"] ?? "Accept")
                                            .font(.caption.bold())
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(.green)

                                    Button {
                                        incomingRequests.removeAll { $0.id == req.id }
                                    } label: {
                                        Text(l10n.t["friends_reject"] ?? "Reject")
                                            .font(.caption.bold())
                                    }
                                    .buttonStyle(.bordered)
                                }
                            }
                        }
                        .listStyle(.plain)
                    }
                }
            }
            .navigationTitle(l10n.t["contacts_title"] ?? "Contacts")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                NavigationStack {
                    VStack(spacing: 20) {
                        // QR placeholder
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.green.opacity(0.1))
                            .frame(width: 200, height: 200)
                            .overlay(
                                VStack {
                                    Image(systemName: "qrcode")
                                        .font(.system(size: 60))
                                        .foregroundStyle(.green)
                                    Text(l10n.t["contacts_my_qr"] ?? "My QR Code")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            )

                        Divider()

                        // Add by address
                        VStack(alignment: .leading, spacing: 8) {
                            Text(l10n.t["friends_send_request"] ?? "Send Friend Request")
                                .font(.headline)
                            TextField(l10n.t["friends_enter_address"] ?? "Enter Onion address", text: $newAddress)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                guard !newAddress.isEmpty else { return }
                                newAddress = ""
                                requestSent = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { requestSent = false }
                            } label: {
                                Text(l10n.t["wallet_send"] ?? "Send")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                            .disabled(newAddress.isEmpty)

                            if requestSent {
                                Text(l10n.t["friends_request_sent"] ?? "Request sent!")
                                    .foregroundStyle(.green)
                                    .font(.caption)
                            }
                        }
                        .padding(.horizontal)

                        Spacer()
                    }
                    .padding(.top)
                    .navigationTitle(l10n.t["contacts_add_friend"] ?? "Add Friend")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(l10n.t["friends_cancel"] ?? "Cancel") {
                                showAddSheet = false
                            }
                        }
                    }
                }
                .presentationDetents([.large])
            }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @EnvironmentObject var l10n: LocalizationManager

    var body: some View {
        NavigationStack {
            List {
                Section(l10n.t["settings_profile"] ?? "Profile") {
                    HStack {
                        ZStack {
                            Circle()
                                .fill(.green.opacity(0.2))
                                .frame(width: 44, height: 44)
                            Text(String(authVM.displayName?.prefix(1) ?? "?"))
                                .font(.title3.bold())
                                .foregroundStyle(.green)
                        }
                        VStack(alignment: .leading) {
                            Text(authVM.displayName ?? (l10n.t["settings_user"] ?? "User"))
                                .font(.headline)
                            Text(authVM.userId ?? "")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section(l10n.t["settings_privacy"] ?? "Privacy & Security") {
                    Label(l10n.t["settings_e2ee"] ?? "End-to-End Encryption (E2EE)", systemImage: "lock.shield")
                    Label(l10n.t["settings_2fa"] ?? "Two-Factor Authentication", systemImage: "key")
                    Label(l10n.t["settings_incognito"] ?? "Incognito Mode", systemImage: "eye.slash")
                    Label(l10n.t["settings_disappearing"] ?? "Disappearing Messages", systemImage: "timer")
                    Label(l10n.t["settings_tor"] ?? "Route via Tor", systemImage: "network")
                }

                Section(l10n.t["settings_appearance"] ?? "Appearance") {
                    Label(l10n.t["settings_theme"] ?? "Theme", systemImage: "paintbrush")
                    HStack {
                        Label(l10n.t["settings_language"] ?? "Language", systemImage: "globe")
                        Spacer()
                        Picker("", selection: Binding(
                            get: { l10n.currentLocale },
                            set: { l10n.setLocale($0) }
                        )) {
                            ForEach(LocalizationManager.supportedLocales, id: \.code) { loc in
                                Text(loc.name).tag(loc.code)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        authVM.logout()
                    } label: {
                        Label(l10n.t["settings_logout"] ?? "Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle(l10n.t["tab_settings"] ?? "Settings")
        }
    }
}
