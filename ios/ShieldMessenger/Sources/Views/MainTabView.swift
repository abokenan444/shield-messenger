import SwiftUI

/// Main tab navigation
struct MainTabView: View {
    @EnvironmentObject var chatVM: ChatViewModel

    var body: some View {
        TabView {
            ChatListView()
                .tabItem {
                    Label("المحادثات", systemImage: "bubble.left.and.bubble.right")
                }

            CallsView()
                .tabItem {
                    Label("المكالمات", systemImage: "phone")
                }

            ContactsView()
                .tabItem {
                    Label("جهات الاتصال", systemImage: "person.2")
                }

            SettingsView()
                .tabItem {
                    Label("الإعدادات", systemImage: "gearshape")
                }
        }
        .tint(.green)
        .task {
            await chatVM.loadRooms()
        }
    }
}

/// Chat list screen
struct ChatListView: View {
    @EnvironmentObject var chatVM: ChatViewModel
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
            .searchable(text: $searchText, prompt: "بحث في المحادثات")
            .navigationTitle("المحادثات")
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
                    Text(room.lastMessage ?? "لا توجد رسائل")
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
                        Text("الرسائل مشفرة تشفيراً تاماً")
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

                TextField("اكتب رسالة مشفرة...", text: $messageText, axis: .vertical)
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
                Button { } label: {
                    Image(systemName: "phone")
                }
                Button { } label: {
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
struct CallsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "phone.badge.checkmark")
                    .font(.system(size: 48))
                    .foregroundStyle(.green)
                Text("المكالمات")
                    .font(.title2)
                Text("مكالمات صوتية ومرئية مشفرة E2EE")
                    .foregroundStyle(.secondary)
            }
            .navigationTitle("المكالمات")
        }
    }
}

struct ContactsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "person.2.badge.key")
                    .font(.system(size: 48))
                    .foregroundStyle(.green)
                Text("جهات الاتصال")
                    .font(.title2)
                Text("أضف جهات اتصال عبر مسح رمز QR")
                    .foregroundStyle(.secondary)
            }
            .navigationTitle("جهات الاتصال")
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var authVM: AuthViewModel

    var body: some View {
        NavigationStack {
            List {
                Section("الملف الشخصي") {
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
                            Text(authVM.displayName ?? "مستخدم")
                                .font(.headline)
                            Text(authVM.userId ?? "")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("الخصوصية والأمان") {
                    Label("التشفير التام (E2EE)", systemImage: "lock.shield")
                    Label("المصادقة الثنائية", systemImage: "key")
                    Label("وضع التصفح الخفي", systemImage: "eye.slash")
                    Label("الرسائل المختفية", systemImage: "timer")
                    Label("توجيه عبر Tor", systemImage: "network")
                }

                Section("المظهر") {
                    Label("السمة", systemImage: "paintbrush")
                    Label("اللغة", systemImage: "globe")
                }

                Section {
                    Button(role: .destructive) {
                        authVM.logout()
                    } label: {
                        Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("الإعدادات")
        }
    }
}
