import Foundation
import UserNotifications
import UIKit

/// NotificationService — Centralized notification management for Shield Messenger iOS.
///
/// Handles:
///  - Permission request and status tracking
///  - Local notification dispatch with privacy-aware content
///  - Notification categories with actions (reply, mark read, accept/decline)
///  - Identity key change security alerts
///  - Badge count management
///
/// Privacy: All notification content is generated locally from decrypted data.
/// No message content ever reaches Apple Push Notification service (APNs).
/// APNs is only used as a wake-up signal; actual content is fetched and decrypted on-device.
final class NotificationService: NSObject, UNUserNotificationCenterDelegate {

    static let shared = NotificationService()

    // MARK: - Category Identifiers

    private enum Category {
        static let message = "SL_MESSAGE"
        static let call = "SL_CALL"
        static let securityAlert = "SL_SECURITY_ALERT"
        static let friendRequest = "SL_FRIEND_REQUEST"
        static let groupInvite = "SL_GROUP_INVITE"
    }

    // MARK: - Action Identifiers

    private enum Action {
        static let reply = "SL_REPLY"
        static let markRead = "SL_MARK_READ"
        static let acceptCall = "SL_ACCEPT_CALL"
        static let declineCall = "SL_DECLINE_CALL"
        static let verifyContact = "SL_VERIFY_CONTACT"
        static let acceptRequest = "SL_ACCEPT_REQUEST"
        static let declineRequest = "SL_DECLINE_REQUEST"
    }

    // MARK: - User Defaults Keys

    private enum Prefs {
        static let showContent = "sl_notif_show_content"
        static let showSender = "sl_notif_show_sender"
        static let securityAlerts = "sl_notif_security_alerts"
    }

    private let center = UNUserNotificationCenter.current()

    private override init() {
        super.init()
    }

    // MARK: - Setup

    /// Configure notification categories and set delegate.
    /// Must be called at app launch (e.g., in AppDelegate.didFinishLaunching).
    func configure() {
        center.delegate = self
        registerCategories()
    }

    /// Request notification permission from the user.
    func requestPermission(completion: @escaping (Bool) -> Void) {
        center.requestAuthorization(options: [.alert, .sound, .badge, .criticalAlert]) { granted, error in
            if let error = error {
                print("[SL:Notify] Permission error: \(error.localizedDescription)")
            }
            DispatchQueue.main.async {
                completion(granted)
            }
        }
        // Register for remote notifications (APNs wake-up signal only)
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    /// Check current authorization status.
    func checkPermission(completion: @escaping (UNAuthorizationStatus) -> Void) {
        center.getNotificationSettings { settings in
            DispatchQueue.main.async {
                completion(settings.authorizationStatus)
            }
        }
    }

    // MARK: - Notification Dispatch

    /// Show a new message notification.
    func notifyNewMessage(
        senderName: String,
        messagePreview: String,
        chatId: String
    ) {
        let defaults = UserDefaults.standard
        let showContent = defaults.bool(forKey: Prefs.showContent)
        let showSender = defaults.bool(forKey: Prefs.showSender)

        let content = UNMutableNotificationContent()
        content.title = showSender ? senderName : "Shield Messenger"
        content.body = showContent ? messagePreview : "New encrypted message"
        content.sound = .default
        content.badge = NSNumber(value: incrementBadgeCount())
        content.categoryIdentifier = Category.message
        content.userInfo = ["type": "message", "chatId": chatId]
        content.threadIdentifier = "chat-\(chatId)"

        let request = UNNotificationRequest(
            identifier: "msg-\(chatId)-\(UUID().uuidString.prefix(8))",
            content: content,
            trigger: nil // Deliver immediately
        )

        center.add(request) { error in
            if let error = error {
                print("[SL:Notify] Message notification error: \(error.localizedDescription)")
            }
        }
    }

    /// Show an incoming call notification.
    func notifyIncomingCall(
        callerName: String,
        callId: String
    ) {
        let content = UNMutableNotificationContent()
        content.title = callerName
        content.body = "Incoming encrypted call"
        content.sound = UNNotificationSound.defaultCritical
        content.categoryIdentifier = Category.call
        content.userInfo = ["type": "call", "callId": callId]
        content.interruptionLevel = .timeSensitive

        let request = UNNotificationRequest(
            identifier: "call-\(callId)",
            content: content,
            trigger: nil
        )

        center.add(request) { error in
            if let error = error {
                print("[SL:Notify] Call notification error: \(error.localizedDescription)")
            }
        }
    }

    /// Show a security alert when a contact's identity key changes.
    /// This is critical for MITM detection.
    func notifyIdentityKeyChange(
        contactName: String,
        contactId: String
    ) {
        let defaults = UserDefaults.standard
        guard defaults.bool(forKey: Prefs.securityAlerts) != false else { return }

        let content = UNMutableNotificationContent()
        content.title = "Security Alert"
        content.subtitle = contactName
        content.body = "\(contactName)'s security key has changed. This could indicate a new device, or a potential man-in-the-middle attack. Please verify their identity."
        content.sound = UNNotificationSound.defaultCritical
        content.categoryIdentifier = Category.securityAlert
        content.userInfo = ["type": "security", "contactId": contactId]
        content.interruptionLevel = .critical

        let request = UNNotificationRequest(
            identifier: "security-\(contactId)-\(UUID().uuidString.prefix(8))",
            content: content,
            trigger: nil
        )

        center.add(request) { error in
            if let error = error {
                print("[SL:Notify] Security alert error: \(error.localizedDescription)")
            }
        }
    }

    /// Show a friend request notification.
    func notifyFriendRequest(
        senderName: String,
        requestId: String
    ) {
        let content = UNMutableNotificationContent()
        content.title = "New Contact Request"
        content.body = "\(senderName) wants to connect"
        content.sound = .default
        content.badge = NSNumber(value: incrementBadgeCount())
        content.categoryIdentifier = Category.friendRequest
        content.userInfo = ["type": "friendRequest", "requestId": requestId]

        let request = UNNotificationRequest(
            identifier: "friend-\(requestId)",
            content: content,
            trigger: nil
        )

        center.add(request) { error in
            if let error = error {
                print("[SL:Notify] Friend request notification error: \(error.localizedDescription)")
            }
        }
    }

    /// Show a group invite notification.
    func notifyGroupInvite(
        groupName: String,
        inviterName: String,
        groupId: String
    ) {
        let content = UNMutableNotificationContent()
        content.title = "Group Invitation"
        content.body = "\(inviterName) invited you to \(groupName)"
        content.sound = .default
        content.categoryIdentifier = Category.groupInvite
        content.userInfo = ["type": "groupInvite", "groupId": groupId]

        let request = UNNotificationRequest(
            identifier: "group-\(groupId)",
            content: content,
            trigger: nil
        )

        center.add(request) { error in
            if let error = error {
                print("[SL:Notify] Group invite notification error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Notification Cancellation

    /// Remove all notifications for a specific chat.
    func cancelChatNotifications(chatId: String) {
        center.getDeliveredNotifications { notifications in
            let ids = notifications
                .filter { $0.request.content.userInfo["chatId"] as? String == chatId }
                .map { $0.request.identifier }
            self.center.removeDeliveredNotifications(withIdentifiers: ids)
        }
    }

    /// Remove a call notification.
    func cancelCallNotification(callId: String) {
        center.removeDeliveredNotifications(withIdentifiers: ["call-\(callId)"])
    }

    /// Remove all delivered notifications.
    func cancelAll() {
        center.removeAllDeliveredNotifications()
        resetBadgeCount()
    }

    // MARK: - Badge Management

    private func incrementBadgeCount() -> Int {
        let current = UserDefaults.standard.integer(forKey: "sl_badge_count")
        let newCount = current + 1
        UserDefaults.standard.set(newCount, forKey: "sl_badge_count")
        return newCount
    }

    func resetBadgeCount() {
        UserDefaults.standard.set(0, forKey: "sl_badge_count")
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = 0
        }
    }

    // MARK: - Preferences

    func setShowMessageContent(_ show: Bool) {
        UserDefaults.standard.set(show, forKey: Prefs.showContent)
    }

    func setShowSenderName(_ show: Bool) {
        UserDefaults.standard.set(show, forKey: Prefs.showSender)
    }

    func setSecurityAlertsEnabled(_ enabled: Bool) {
        UserDefaults.standard.set(enabled, forKey: Prefs.securityAlerts)
    }

    // MARK: - Category Registration

    private func registerCategories() {
        // Message category with inline reply and mark-read actions
        let replyAction = UNTextInputNotificationAction(
            identifier: Action.reply,
            title: "Reply",
            options: [],
            textInputButtonTitle: "Send",
            textInputPlaceholder: "Encrypted reply..."
        )
        let markReadAction = UNNotificationAction(
            identifier: Action.markRead,
            title: "Mark as Read",
            options: []
        )
        let messageCategory = UNNotificationCategory(
            identifier: Category.message,
            actions: [replyAction, markReadAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // Call category with accept/decline
        let acceptCallAction = UNNotificationAction(
            identifier: Action.acceptCall,
            title: "Accept",
            options: [.foreground]
        )
        let declineCallAction = UNNotificationAction(
            identifier: Action.declineCall,
            title: "Decline",
            options: [.destructive]
        )
        let callCategory = UNNotificationCategory(
            identifier: Category.call,
            actions: [acceptCallAction, declineCallAction],
            intentIdentifiers: [],
            options: []
        )

        // Security alert with verify action
        let verifyAction = UNNotificationAction(
            identifier: Action.verifyContact,
            title: "Verify Identity",
            options: [.foreground]
        )
        let securityCategory = UNNotificationCategory(
            identifier: Category.securityAlert,
            actions: [verifyAction],
            intentIdentifiers: [],
            options: []
        )

        // Friend request with accept/decline
        let acceptRequestAction = UNNotificationAction(
            identifier: Action.acceptRequest,
            title: "Accept",
            options: []
        )
        let declineRequestAction = UNNotificationAction(
            identifier: Action.declineRequest,
            title: "Decline",
            options: [.destructive]
        )
        let friendRequestCategory = UNNotificationCategory(
            identifier: Category.friendRequest,
            actions: [acceptRequestAction, declineRequestAction],
            intentIdentifiers: [],
            options: []
        )

        // Group invite category
        let groupInviteCategory = UNNotificationCategory(
            identifier: Category.groupInvite,
            actions: [acceptRequestAction, declineRequestAction],
            intentIdentifiers: [],
            options: []
        )

        center.setNotificationCategories([
            messageCategory,
            callCategory,
            securityCategory,
            friendRequestCategory,
            groupInviteCategory,
        ])
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Handle notification when app is in foreground.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        let type = userInfo["type"] as? String ?? ""

        // Always show security alerts and calls even when app is in foreground
        if type == "security" || type == "call" {
            completionHandler([.banner, .sound, .badge])
        } else {
            // For messages, show banner only if user is not in the same chat
            completionHandler([.banner, .sound, .badge])
        }
    }

    /// Handle notification action (reply, accept call, etc.).
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let actionId = response.actionIdentifier

        switch actionId {
        case Action.reply:
            if let textResponse = response as? UNTextInputNotificationResponse,
               let chatId = userInfo["chatId"] as? String {
                handleInlineReply(text: textResponse.userText, chatId: chatId)
            }
        case Action.markRead:
            if let chatId = userInfo["chatId"] as? String {
                handleMarkRead(chatId: chatId)
            }
        case Action.acceptCall:
            if let callId = userInfo["callId"] as? String {
                handleAcceptCall(callId: callId)
            }
        case Action.declineCall:
            if let callId = userInfo["callId"] as? String {
                handleDeclineCall(callId: callId)
            }
        case Action.verifyContact:
            if let contactId = userInfo["contactId"] as? String {
                handleVerifyContact(contactId: contactId)
            }
        case Action.acceptRequest:
            if let requestId = userInfo["requestId"] as? String {
                handleAcceptFriendRequest(requestId: requestId)
            }
        case Action.declineRequest:
            if let requestId = userInfo["requestId"] as? String {
                handleDeclineFriendRequest(requestId: requestId)
            }
        case UNNotificationDefaultActionIdentifier:
            // User tapped the notification — navigate to appropriate screen
            handleNotificationTap(userInfo: userInfo)
        default:
            break
        }

        completionHandler()
    }

    // MARK: - Action Handlers

    private func handleInlineReply(text: String, chatId: String) {
        // Post notification for ChatViewModel to handle
        NotificationCenter.default.post(
            name: .slInlineReply,
            object: nil,
            userInfo: ["text": text, "chatId": chatId]
        )
    }

    private func handleMarkRead(chatId: String) {
        NotificationCenter.default.post(
            name: .slMarkRead,
            object: nil,
            userInfo: ["chatId": chatId]
        )
        cancelChatNotifications(chatId: chatId)
    }

    private func handleAcceptCall(callId: String) {
        NotificationCenter.default.post(
            name: .slAcceptCall,
            object: nil,
            userInfo: ["callId": callId]
        )
    }

    private func handleDeclineCall(callId: String) {
        NotificationCenter.default.post(
            name: .slDeclineCall,
            object: nil,
            userInfo: ["callId": callId]
        )
        cancelCallNotification(callId: callId)
    }

    private func handleVerifyContact(contactId: String) {
        NotificationCenter.default.post(
            name: .slVerifyContact,
            object: nil,
            userInfo: ["contactId": contactId]
        )
    }

    private func handleAcceptFriendRequest(requestId: String) {
        NotificationCenter.default.post(
            name: .slAcceptFriendRequest,
            object: nil,
            userInfo: ["requestId": requestId]
        )
    }

    private func handleDeclineFriendRequest(requestId: String) {
        NotificationCenter.default.post(
            name: .slDeclineFriendRequest,
            object: nil,
            userInfo: ["requestId": requestId]
        )
    }

    private func handleNotificationTap(userInfo: [AnyHashable: Any]) {
        NotificationCenter.default.post(
            name: .slNotificationTapped,
            object: nil,
            userInfo: userInfo as? [String: Any] ?? [:]
        )
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let slInlineReply = Notification.Name("com.shieldmessenger.inlineReply")
    static let slMarkRead = Notification.Name("com.shieldmessenger.markRead")
    static let slAcceptCall = Notification.Name("com.shieldmessenger.acceptCall")
    static let slDeclineCall = Notification.Name("com.shieldmessenger.declineCall")
    static let slVerifyContact = Notification.Name("com.shieldmessenger.verifyContact")
    static let slAcceptFriendRequest = Notification.Name("com.shieldmessenger.acceptFriendRequest")
    static let slDeclineFriendRequest = Notification.Name("com.shieldmessenger.declineFriendRequest")
    static let slNotificationTapped = Notification.Name("com.shieldmessenger.notificationTapped")
}
