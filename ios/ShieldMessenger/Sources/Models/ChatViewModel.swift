import Foundation
import Combine

/// Chat view model — manages rooms, messages, and real-time sync
@MainActor
class ChatViewModel: ObservableObject {
    @Published var rooms: [ChatRoom] = []
    @Published var activeRoomId: String?
    @Published var messages: [String: [ChatMessage]] = [:]
    @Published var isLoading = false

    /// Load conversations from encrypted local storage
    func loadRooms() async {
        isLoading = true
        // TODO: Load from Rust Core FFI (encrypted local storage)
        rooms = ChatRoom.mockRooms()
        isLoading = false
    }

    /// Send an encrypted text message
    func sendMessage(roomId: String, text: String) async {
        let message = ChatMessage(
            id: UUID().uuidString,
            roomId: roomId,
            senderId: "sl_me",
            senderName: "أنا",
            content: text,
            timestamp: Date(),
            type: .text,
            encrypted: true,
            status: .sending
        )

        // Add to local state immediately
        if messages[roomId] != nil {
            messages[roomId]?.append(message)
        } else {
            messages[roomId] = [message]
        }

        // TODO: Send via Shield Messenger Protocol (Tor P2P)
        // Simulate delivery
        try? await Task.sleep(nanoseconds: 500_000_000)
        if let index = messages[roomId]?.firstIndex(where: { $0.id == message.id }) {
            messages[roomId]?[index].status = .sent
        }
    }
}
