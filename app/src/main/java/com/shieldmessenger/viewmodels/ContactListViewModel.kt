package com.shieldmessenger.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.shieldmessenger.database.ShieldMessengerDatabase
import com.shieldmessenger.database.entities.Contact
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ViewModel for the main contact list (MainActivity / ConversationsFragment).
 *
 * Manages the list of contacts and conversations, providing observable
 * state for the UI layer. Handles:
 * - Loading contacts from the encrypted database
 * - Filtering/searching contacts
 * - Tracking unread message counts per contact
 * - Contact deletion and archiving
 */
class ContactListViewModel(application: Application) : AndroidViewModel(application) {

    companion object {
        private const val TAG = "ContactListVM"
    }

    // ─── Observable State ───

    private val _contacts = MutableLiveData<List<Contact>>(emptyList())
    val contacts: LiveData<List<Contact>> = _contacts

    private val _filteredContacts = MutableLiveData<List<Contact>>(emptyList())
    val filteredContacts: LiveData<List<Contact>> = _filteredContacts

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _totalUnread = MutableLiveData(0)
    val totalUnread: LiveData<Int> = _totalUnread

    private val _pendingFriendRequests = MutableLiveData(0)
    val pendingFriendRequests: LiveData<Int> = _pendingFriendRequests

    private var currentSearchQuery: String = ""

    private val database by lazy {
        ShieldMessengerDatabase.getDatabase(getApplication())
    }

    // ─── Loading ───

    /**
     * Load all contacts from the database.
     * Contacts are sorted by last message timestamp (most recent first).
     */
    fun loadContacts() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val contactList = withContext(Dispatchers.IO) {
                    database.contactDao().getAllContacts()
                }
                _contacts.value = contactList
                applyFilter(currentSearchQuery)

                // Count total unread
                val unread = withContext(Dispatchers.IO) {
                    database.messageDao().getTotalUnreadCount()
                }
                _totalUnread.value = unread

                Log.d(TAG, "Loaded ${contactList.size} contacts, $unread unread messages")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load contacts", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Load pending friend request count.
     */
    fun loadPendingRequests() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val count = database.friendRequestDao().getPendingCount()
                _pendingFriendRequests.postValue(count)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load pending requests", e)
            }
        }
    }

    // ─── Search/Filter ───

    /**
     * Filter contacts by search query.
     * Matches against contact name and address.
     */
    fun searchContacts(query: String) {
        currentSearchQuery = query
        applyFilter(query)
    }

    private fun applyFilter(query: String) {
        val all = _contacts.value.orEmpty()
        if (query.isBlank()) {
            _filteredContacts.value = all
        } else {
            val lower = query.lowercase()
            _filteredContacts.value = all.filter { contact ->
                contact.name.lowercase().contains(lower) ||
                contact.address.lowercase().contains(lower)
            }
        }
    }

    // ─── Contact Actions ───

    /**
     * Delete a contact and all associated messages.
     */
    fun deleteContact(contactId: Long) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    database.messageDao().deleteMessagesForContact(contactId)
                    database.contactDao().deleteContactById(contactId)
                }
                // Refresh list
                val current = _contacts.value.orEmpty().toMutableList()
                current.removeAll { it.id == contactId }
                _contacts.value = current
                applyFilter(currentSearchQuery)
                Log.d(TAG, "Contact deleted: $contactId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to delete contact: $contactId", e)
            }
        }
    }

    /**
     * Clear all messages for a specific contact (keep the contact).
     */
    fun clearChat(contactId: Long) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                database.messageDao().deleteMessagesForContact(contactId)
                Log.d(TAG, "Chat cleared for contact: $contactId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to clear chat: $contactId", e)
            }
        }
    }
}
