import Foundation

/// Represents a chat room (1:1 or group)
struct ChatRoom: Identifiable {
    let id: String
    let name: String
    let avatar: String?
    var lastMessage: String?
    var lastMessageTime: Date?
    var unreadCount: Int
    let encrypted: Bool
    let isDirect: Bool
    let members: [String]

    static func mockRooms() -> [ChatRoom] {
        [
            ChatRoom(
                id: "conv-001",
                name: "أحمد محمد",
                avatar: nil,
                lastMessage: "مرحباً، كيف حالك؟",
                lastMessageTime: Date().addingTimeInterval(-300),
                unreadCount: 2,
                encrypted: true,
                isDirect: true,
                members: ["sl_me", "sl_ahmed"]
            ),
            ChatRoom(
                id: "conv-002",
                name: "فريق التطوير",
                avatar: nil,
                lastMessage: "تم تحديث الكود",
                lastMessageTime: Date().addingTimeInterval(-3600),
                unreadCount: 0,
                encrypted: true,
                isDirect: false,
                members: ["sl_me", "sl_dev1", "sl_dev2"]
            ),
        ]
    }
}

/// Represents a single message
struct ChatMessage: Identifiable {
    let id: String
    let roomId: String
    let senderId: String
    let senderName: String
    let content: String
    let timestamp: Date
    let type: MessageType
    let encrypted: Bool
    var status: MessageStatus

    enum MessageType {
        case text, image, file, audio, system
    }

    enum MessageStatus {
        case sending, sent, delivered, read, failed
    }
}
