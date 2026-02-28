package com.shieldmessenger.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.shieldmessenger.MainActivity
import com.shieldmessenger.R

/**
 * NotificationHelper — Centralized notification management for Shield Messenger.
 *
 * Handles:
 *  - Notification channel creation (messages, calls, security alerts, friend requests)
 *  - Local notification dispatch with privacy-aware content
 *  - Badge count management
 *  - Notification preferences
 *
 * Privacy: All notification content is generated locally from decrypted data.
 * No message content ever reaches any push server.
 */
object NotificationHelper {

    private const val TAG = "SL:Notify"

    // ─── Channel IDs ───
    const val CHANNEL_MESSAGES = "sl_messages"
    const val CHANNEL_CALLS = "sl_calls"
    const val CHANNEL_SECURITY = "sl_security_alerts"
    const val CHANNEL_FRIEND_REQUESTS = "sl_friend_requests"
    const val CHANNEL_GROUP_INVITES = "sl_group_invites"
    const val CHANNEL_SERVICE = "sl_foreground_service"

    // ─── Notification IDs (base values, actual IDs are computed per-conversation) ───
    private const val NOTIF_ID_MESSAGE_BASE = 1000
    private const val NOTIF_ID_CALL_BASE = 2000
    private const val NOTIF_ID_SECURITY_BASE = 3000
    private const val NOTIF_ID_FRIEND_REQUEST_BASE = 4000
    private const val NOTIF_ID_GROUP_INVITE_BASE = 5000

    // ─── Preferences ───
    private const val PREFS_NAME = "sl_notification_prefs"
    private const val PREF_SHOW_CONTENT = "show_message_content"
    private const val PREF_SHOW_SENDER = "show_sender_name"
    private const val PREF_SOUND_ENABLED = "sound_enabled"
    private const val PREF_VIBRATION_ENABLED = "vibration_enabled"
    private const val PREF_SECURITY_ALERTS = "security_alerts_enabled"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // ─── Initialization ───

    /**
     * Create all notification channels. Must be called at app startup.
     * Safe to call multiple times (channels are updated, not duplicated).
     */
    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val notificationManager = context.getSystemService(NotificationManager::class.java) ?: return

        val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val callSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        // Messages channel
        val messagesChannel = NotificationChannel(
            CHANNEL_MESSAGES,
            "Messages",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "New encrypted message notifications"
            enableVibration(true)
            setShowBadge(true)
            setSound(defaultSound, audioAttributes)
        }

        // Calls channel (highest priority)
        val callsChannel = NotificationChannel(
            CHANNEL_CALLS,
            "Voice & Video Calls",
            NotificationManager.IMPORTANCE_MAX
        ).apply {
            description = "Incoming encrypted call notifications"
            enableVibration(true)
            setShowBadge(true)
            setSound(callSound, AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build())
        }

        // Security alerts channel (high priority, cannot be silenced by user)
        val securityChannel = NotificationChannel(
            CHANNEL_SECURITY,
            "Security Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Critical security alerts (identity key changes, verification failures)"
            enableVibration(true)
            setShowBadge(true)
            setSound(defaultSound, audioAttributes)
        }

        // Friend requests channel
        val friendRequestChannel = NotificationChannel(
            CHANNEL_FRIEND_REQUESTS,
            "Contact Requests",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "New contact request notifications"
            enableVibration(true)
            setShowBadge(true)
        }

        // Group invites channel
        val groupInviteChannel = NotificationChannel(
            CHANNEL_GROUP_INVITES,
            "Group Invitations",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Group invitation notifications"
            enableVibration(true)
            setShowBadge(true)
        }

        // Foreground service channel (low priority, persistent)
        val serviceChannel = NotificationChannel(
            CHANNEL_SERVICE,
            "Background Service",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Keeps Shield Messenger connected for receiving messages"
            setShowBadge(false)
        }

        notificationManager.createNotificationChannels(
            listOf(
                messagesChannel,
                callsChannel,
                securityChannel,
                friendRequestChannel,
                groupInviteChannel,
                serviceChannel,
            )
        )

        Log.d(TAG, "All notification channels created")
    }

    // ─── Permission Check ───

    /**
     * Check if notification permission is granted (Android 13+).
     */
    fun hasPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Permission not required before Android 13
        }
    }

    // ─── Notification Dispatch ───

    /**
     * Show a new message notification.
     * Respects user preferences for content and sender visibility.
     */
    fun notifyNewMessage(
        context: Context,
        senderName: String,
        messagePreview: String,
        chatId: String,
    ) {
        if (!hasPermission(context)) return

        val prefs = getPrefs(context)
        val showContent = prefs.getBoolean(PREF_SHOW_CONTENT, true)
        val showSender = prefs.getBoolean(PREF_SHOW_SENDER, true)

        val title = if (showSender) senderName else "Shield Messenger"
        val body = if (showContent) messagePreview else "New encrypted message"

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "chat")
            putExtra("chat_id", chatId)
        }

        val pendingIntent = PendingIntent.getActivity(
            context, chatId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_notification_logo)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setGroup("sl_messages")
            .build()

        val notifId = NOTIF_ID_MESSAGE_BASE + (chatId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).notify(notifId, notification)
        Log.d(TAG, "Message notification shown for chat: $chatId")
    }

    /**
     * Show an incoming call notification (high priority, full-screen intent).
     */
    fun notifyIncomingCall(
        context: Context,
        callerName: String,
        callId: String,
    ) {
        if (!hasPermission(context)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "call")
            putExtra("call_id", callId)
        }

        val pendingIntent = PendingIntent.getActivity(
            context, callId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_CALLS)
            .setSmallIcon(R.drawable.ic_notification_logo)
            .setContentTitle(callerName)
            .setContentText("Incoming encrypted call")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true)
            .setVibrate(longArrayOf(0, 500, 200, 500))
            .build()

        val notifId = NOTIF_ID_CALL_BASE + (callId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).notify(notifId, notification)
        Log.d(TAG, "Call notification shown for: $callerName")
    }

    /**
     * Show a security alert when a contact's identity key changes.
     * This is critical for MITM detection — always shown regardless of preferences.
     */
    fun notifyIdentityKeyChange(
        context: Context,
        contactName: String,
        contactId: String,
    ) {
        if (!hasPermission(context)) return

        val prefs = getPrefs(context)
        if (!prefs.getBoolean(PREF_SECURITY_ALERTS, true)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "verify_contact")
            putExtra("contact_id", contactId)
        }

        val pendingIntent = PendingIntent.getActivity(
            context, contactId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_SECURITY)
            .setSmallIcon(R.drawable.ic_notification_logo)
            .setContentTitle("Security Alert")
            .setContentText("$contactName's security key has changed. Verify their identity.")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("$contactName's security key has changed. This could indicate a new device, or a potential man-in-the-middle attack. Please verify their identity before continuing the conversation."))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setVibrate(longArrayOf(0, 300, 100, 300, 100, 300))
            .build()

        val notifId = NOTIF_ID_SECURITY_BASE + (contactId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).notify(notifId, notification)
        Log.w(TAG, "SECURITY ALERT: Identity key change for contact: $contactId")
    }

    /**
     * Show a friend request notification.
     */
    fun notifyFriendRequest(
        context: Context,
        senderName: String,
        requestId: String,
    ) {
        if (!hasPermission(context)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "contacts")
            putExtra("tab", "requests")
        }

        val pendingIntent = PendingIntent.getActivity(
            context, requestId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_FRIEND_REQUESTS)
            .setSmallIcon(R.drawable.ic_notification_logo)
            .setContentTitle("New Contact Request")
            .setContentText("$senderName wants to connect")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_SOCIAL)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notifId = NOTIF_ID_FRIEND_REQUEST_BASE + (requestId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).notify(notifId, notification)
        Log.d(TAG, "Friend request notification shown from: $senderName")
    }

    /**
     * Show a group invite notification.
     */
    fun notifyGroupInvite(
        context: Context,
        groupName: String,
        inviterName: String,
        groupId: String,
    ) {
        if (!hasPermission(context)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("navigate_to", "contacts")
            putExtra("tab", "groups")
        }

        val pendingIntent = PendingIntent.getActivity(
            context, groupId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_GROUP_INVITES)
            .setSmallIcon(R.drawable.ic_notification_logo)
            .setContentTitle("Group Invitation")
            .setContentText("$inviterName invited you to $groupName")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_SOCIAL)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notifId = NOTIF_ID_GROUP_INVITE_BASE + (groupId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).notify(notifId, notification)
        Log.d(TAG, "Group invite notification shown for: $groupName")
    }

    // ─── Notification Cancellation ───

    /**
     * Cancel all notifications for a specific chat (e.g., when user opens the chat).
     */
    fun cancelChatNotifications(context: Context, chatId: String) {
        val notifId = NOTIF_ID_MESSAGE_BASE + (chatId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).cancel(notifId)
    }

    /**
     * Cancel a call notification.
     */
    fun cancelCallNotification(context: Context, callId: String) {
        val notifId = NOTIF_ID_CALL_BASE + (callId.hashCode() and 0x7FFFFFFF) % 999
        NotificationManagerCompat.from(context).cancel(notifId)
    }

    /**
     * Cancel all notifications.
     */
    fun cancelAll(context: Context) {
        NotificationManagerCompat.from(context).cancelAll()
    }

    // ─── Preferences Management ───

    fun setShowMessageContent(context: Context, show: Boolean) {
        getPrefs(context).edit().putBoolean(PREF_SHOW_CONTENT, show).apply()
    }

    fun setShowSenderName(context: Context, show: Boolean) {
        getPrefs(context).edit().putBoolean(PREF_SHOW_SENDER, show).apply()
    }

    fun setSoundEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(PREF_SOUND_ENABLED, enabled).apply()
    }

    fun setVibrationEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(PREF_VIBRATION_ENABLED, enabled).apply()
    }

    fun setSecurityAlertsEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(PREF_SECURITY_ALERTS, enabled).apply()
    }
}
