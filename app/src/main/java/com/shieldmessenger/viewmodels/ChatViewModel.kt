package com.shieldmessenger.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.shieldmessenger.crypto.KeyChainManager
import com.shieldmessenger.crypto.KeyManager
import com.shieldmessenger.database.ShieldMessengerDatabase
import com.shieldmessenger.database.entities.Message
import com.shieldmessenger.services.MessageService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ViewModel for ChatActivity.
 *
 * Manages chat state, message loading, and message sending logic,
 * separating business logic from the UI layer. This enables:
 * - Surviving configuration changes (rotation, theme switch)
 * - Testable business logic without Android framework dependencies
 * - Cleaner Activity code focused on UI binding only
 *
 * Migration note: This ViewModel is designed to coexist with the existing
 * ChatActivity code. Activities can gradually delegate logic here without
 * requiring a full rewrite.
 */
class ChatViewModel(application: Application) : AndroidViewModel(application) {

    companion object {
        private const val TAG = "ChatViewModel"
        private const val POLL_INTERVAL_MS = 2000L
        private const val LOAD_DEBOUNCE_MS = 150L
    }

    // ─── Observable State ───

    private val _messages = MutableLiveData<List<Message>>(emptyList())
    val messages: LiveData<List<Message>> = _messages

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _sendStatus = MutableLiveData<SendResult?>()
    val sendStatus: LiveData<SendResult?> = _sendStatus

    private val _typingIndicator = MutableLiveData(false)
    val typingIndicator: LiveData<Boolean> = _typingIndicator

    private val _connectionStatus = MutableLiveData(ConnectionStatus.CONNECTING)
    val connectionStatus: LiveData<ConnectionStatus> = _connectionStatus

    private val _unreadCount = MutableLiveData(0)
    val unreadCount: LiveData<Int> = _unreadCount

    // ─── Internal State ───

    private var contactId: Long = -1
    private var contactAddress: String = ""
    private var contactName: String = ""
    private var pollingJob: Job? = null
    private var loadJob: Job? = null
    private var lastMessageTimestamp: Long = 0L

    private val database by lazy {
        ShieldMessengerDatabase.getDatabase(getApplication())
    }

    // ─── Initialization ───

    /**
     * Initialize the ViewModel with contact information.
     * Must be called once from ChatActivity.onCreate().
     */
    fun initialize(contactId: Long, contactAddress: String, contactName: String) {
        if (this.contactId == contactId) return // Already initialized for this contact
        this.contactId = contactId
        this.contactAddress = contactAddress
        this.contactName = contactName
        Log.d(TAG, "Initialized for contact: $contactName (ID: $contactId)")
        loadMessages()
    }

    // ─── Message Loading ───

    /**
     * Load messages from the local database for the current contact.
     * Debounced to prevent rapid successive calls.
     */
    fun loadMessages() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            delay(LOAD_DEBOUNCE_MS)
            _isLoading.value = true
            try {
                val msgs = withContext(Dispatchers.IO) {
                    database.messageDao().getMessagesForContact(contactId)
                }
                _messages.value = msgs
                if (msgs.isNotEmpty()) {
                    lastMessageTimestamp = msgs.maxOf { it.timestamp }
                }
                Log.d(TAG, "Loaded ${msgs.size} messages for contact $contactId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load messages", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Start polling for new messages at regular intervals.
     * Called from onResume().
     */
    fun startPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(POLL_INTERVAL_MS)
                checkForNewMessages()
            }
        }
        Log.d(TAG, "Message polling started")
    }

    /**
     * Stop polling for new messages.
     * Called from onPause().
     */
    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
        Log.d(TAG, "Message polling stopped")
    }

    /**
     * Check for new messages since the last known timestamp.
     */
    private suspend fun checkForNewMessages() {
        try {
            val newMessages = withContext(Dispatchers.IO) {
                database.messageDao().getMessagesForContactSince(contactId, lastMessageTimestamp)
            }
            if (newMessages.isNotEmpty()) {
                lastMessageTimestamp = newMessages.maxOf { it.timestamp }
                val current = _messages.value.orEmpty().toMutableList()
                val existingIds = current.map { it.id }.toSet()
                val truly_new = newMessages.filter { it.id !in existingIds }
                if (truly_new.isNotEmpty()) {
                    current.addAll(truly_new)
                    _messages.postValue(current.sortedBy { it.timestamp })
                    _unreadCount.postValue((_unreadCount.value ?: 0) + truly_new.size)
                    Log.d(TAG, "Found ${truly_new.size} new messages")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking for new messages", e)
        }
    }

    // ─── Message Sending ───

    /**
     * Send a text message to the current contact.
     */
    fun sendMessage(text: String) {
        if (text.isBlank() || contactId == -1L) return

        viewModelScope.launch {
            _sendStatus.value = SendResult.Sending
            try {
                val messageId = java.util.UUID.randomUUID().toString()
                val timestamp = System.currentTimeMillis()

                // Create local message entity
                val message = Message(
                    id = messageId,
                    contactId = contactId,
                    content = text,
                    timestamp = timestamp,
                    isOutgoing = true,
                    isDelivered = false,
                    isRead = false,
                    type = "text"
                )

                // Save to local database first (optimistic)
                withContext(Dispatchers.IO) {
                    database.messageDao().insertMessage(message)
                }

                // Update UI immediately
                val current = _messages.value.orEmpty().toMutableList()
                current.add(message)
                _messages.value = current.sortedBy { it.timestamp }

                // Send via Tor in background
                withContext(Dispatchers.IO) {
                    val service = MessageService.getInstance(getApplication())
                    service.sendTextMessage(contactAddress, text, messageId)
                }

                _sendStatus.value = SendResult.Success(messageId)
                Log.d(TAG, "Message sent: $messageId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send message", e)
                _sendStatus.value = SendResult.Error(e.message ?: "Unknown error")
            }
        }
    }

    /**
     * Mark all messages from this contact as read.
     */
    fun markAllAsRead() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                database.messageDao().markMessagesAsRead(contactId)
                _unreadCount.postValue(0)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to mark messages as read", e)
            }
        }
    }

    /**
     * Delete a specific message by ID.
     */
    fun deleteMessage(messageId: String) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    database.messageDao().deleteMessageById(messageId)
                }
                val current = _messages.value.orEmpty().toMutableList()
                current.removeAll { it.id == messageId }
                _messages.value = current
                Log.d(TAG, "Message deleted: $messageId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to delete message: $messageId", e)
            }
        }
    }

    /**
     * Clear send status after UI has handled it.
     */
    fun clearSendStatus() {
        _sendStatus.value = null
    }

    // ─── Cleanup ───

    override fun onCleared() {
        super.onCleared()
        stopPolling()
        Log.d(TAG, "ChatViewModel cleared for contact $contactId")
    }

    // ─── Data Classes ───

    sealed class SendResult {
        object Sending : SendResult()
        data class Success(val messageId: String) : SendResult()
        data class Error(val message: String) : SendResult()
    }

    enum class ConnectionStatus {
        CONNECTING,
        CONNECTED,
        DISCONNECTED,
        TOR_CIRCUIT_BUILDING
    }
}
