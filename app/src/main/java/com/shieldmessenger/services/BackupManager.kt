package com.shieldmessenger.services

import android.content.Context
import android.net.Uri
import android.util.Log
import com.securelegion.crypto.KeyManager
import com.shieldmessenger.database.ShieldMessengerDatabase
import com.shieldmessenger.database.entities.Contact
import com.shieldmessenger.database.entities.Message
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import java.security.SecureRandom
import android.util.Base64

/**
 * BackupManager - Exports/imports contacts and messages as encrypted JSON.
 *
 * Backup format:
 * - Header: 16-byte salt + 12-byte IV
 * - Body: AES-256-GCM encrypted JSON blob
 * - Key derived from database passphrase via PBKDF2
 */
class BackupManager(private val context: Context) {

    companion object {
        private const val TAG = "BackupManager"
        private const val BACKUP_VERSION = 1
        private const val PBKDF2_ITERATIONS = 100_000
        private const val KEY_LENGTH = 256
        private const val GCM_IV_LENGTH = 12
        private const val GCM_TAG_LENGTH = 128
        private const val SALT_LENGTH = 16
    }

    interface BackupCallback {
        fun onProgress(percent: Int, status: String)
        fun onComplete(success: Boolean, message: String)
    }

    /**
     * Create encrypted backup of contacts and messages to the given URI.
     */
    suspend fun createBackup(uri: Uri, callback: BackupCallback) {
        withContext(Dispatchers.IO) {
            try {
                callback.onProgress(0, "Preparing backup...")

                val keyManager = KeyManager.getInstance(context)
                val dbPassphrase = keyManager.getDatabasePassphrase()
                val db = ShieldMessengerDatabase.getInstance(context, dbPassphrase)

                // Export contacts
                callback.onProgress(10, "Exporting contacts...")
                val contacts = db.contactDao().getAllContacts()
                val contactsArray = JSONArray()
                for (contact in contacts) {
                    contactsArray.put(contactToJson(contact))
                }

                // Export messages per contact
                callback.onProgress(30, "Exporting messages...")
                val messagesArray = JSONArray()
                val totalContacts = contacts.size
                for ((index, contact) in contacts.withIndex()) {
                    val messages = db.messageDao().getMessagesForContact(contact.id)
                    for (msg in messages) {
                        messagesArray.put(messageToJson(msg))
                    }
                    val progress = 30 + ((index + 1) * 40 / maxOf(totalContacts, 1))
                    callback.onProgress(progress, "Exporting messages (${index + 1}/$totalContacts)...")
                }

                // Build backup JSON
                callback.onProgress(75, "Encrypting backup...")
                val backup = JSONObject().apply {
                    put("version", BACKUP_VERSION)
                    put("app", "shield-messenger")
                    put("timestamp", System.currentTimeMillis())
                    put("date", SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date()))
                    put("contactCount", contacts.size)
                    put("messageCount", messagesArray.length())
                    put("contacts", contactsArray)
                    put("messages", messagesArray)
                }

                val plaintext = backup.toString().toByteArray(Charsets.UTF_8)

                // Encrypt with AES-256-GCM using key derived from DB passphrase
                val salt = ByteArray(SALT_LENGTH)
                SecureRandom().nextBytes(salt)
                val iv = ByteArray(GCM_IV_LENGTH)
                SecureRandom().nextBytes(iv)

                val key = deriveKey(dbPassphrase, salt)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH, iv))
                val ciphertext = cipher.doFinal(plaintext)

                // Write: salt + iv + ciphertext
                callback.onProgress(90, "Writing backup file...")
                context.contentResolver.openOutputStream(uri)?.use { os ->
                    os.write(salt)
                    os.write(iv)
                    os.write(ciphertext)
                }

                callback.onProgress(100, "Backup complete!")
                callback.onComplete(true, "Backed up ${contacts.size} contacts and ${messagesArray.length()} messages")

            } catch (e: Exception) {
                Log.e(TAG, "Backup failed", e)
                callback.onComplete(false, "Backup failed: ${e.message}")
            }
        }
    }

    /**
     * Restore contacts and messages from an encrypted backup file.
     */
    suspend fun restoreBackup(uri: Uri, callback: BackupCallback) {
        withContext(Dispatchers.IO) {
            try {
                callback.onProgress(0, "Reading backup file...")

                val keyManager = KeyManager.getInstance(context)
                val dbPassphrase = keyManager.getDatabasePassphrase()

                // Read full file
                val rawBytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw Exception("Cannot read backup file")

                if (rawBytes.size < SALT_LENGTH + GCM_IV_LENGTH + 1) {
                    throw Exception("Invalid backup file (too small)")
                }

                // Extract salt, IV, ciphertext
                val salt = rawBytes.copyOfRange(0, SALT_LENGTH)
                val iv = rawBytes.copyOfRange(SALT_LENGTH, SALT_LENGTH + GCM_IV_LENGTH)
                val ciphertext = rawBytes.copyOfRange(SALT_LENGTH + GCM_IV_LENGTH, rawBytes.size)

                callback.onProgress(10, "Decrypting backup...")
                val key = deriveKey(dbPassphrase, salt)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH, iv))
                val plaintext: ByteArray
                try {
                    plaintext = cipher.doFinal(ciphertext)
                } catch (e: Exception) {
                    throw Exception("Wrong password or corrupted backup file")
                }

                callback.onProgress(20, "Parsing backup data...")
                val backup = JSONObject(String(plaintext, Charsets.UTF_8))

                val version = backup.optInt("version", 0)
                if (version != BACKUP_VERSION) {
                    throw Exception("Unsupported backup version: $version")
                }

                val db = ShieldMessengerDatabase.getInstance(context, dbPassphrase)

                // Restore contacts
                val contactsArray = backup.getJSONArray("contacts")
                callback.onProgress(30, "Restoring ${contactsArray.length()} contacts...")
                var contactsRestored = 0
                val contactIdMap = mutableMapOf<Long, Long>() // oldId -> newId

                for (i in 0 until contactsArray.length()) {
                    val contactJson = contactsArray.getJSONObject(i)
                    val oldId = contactJson.getLong("id")
                    val solanaAddress = contactJson.getString("solanaAddress")

                    // Check if contact already exists
                    val existing = db.contactDao().getContactBySolanaAddress(solanaAddress)
                    if (existing != null) {
                        contactIdMap[oldId] = existing.id
                        continue
                    }

                    val contact = jsonToContact(contactJson)
                    val newId = db.contactDao().insertContact(contact)
                    contactIdMap[oldId] = newId
                    contactsRestored++

                    val progress = 30 + ((i + 1) * 30 / maxOf(contactsArray.length(), 1))
                    callback.onProgress(progress, "Restoring contacts (${i + 1}/${contactsArray.length()})...")
                }

                // Restore messages
                val messagesArray = backup.getJSONArray("messages")
                callback.onProgress(65, "Restoring ${messagesArray.length()} messages...")
                var messagesRestored = 0

                for (i in 0 until messagesArray.length()) {
                    val msgJson = messagesArray.getJSONObject(i)
                    val oldContactId = msgJson.getLong("contactId")
                    val newContactId = contactIdMap[oldContactId] ?: continue
                    val messageId = msgJson.getString("messageId")

                    // Skip if message already exists (dedup by messageId)
                    val existingMsg = db.messageDao().getMessageByMessageId(messageId)
                    if (existingMsg != null) continue

                    val message = jsonToMessage(msgJson, newContactId)
                    db.messageDao().insertMessage(message)
                    messagesRestored++

                    if (i % 100 == 0) {
                        val progress = 65 + ((i + 1) * 30 / maxOf(messagesArray.length(), 1))
                        callback.onProgress(progress, "Restoring messages (${i + 1}/${messagesArray.length()})...")
                    }
                }

                callback.onProgress(100, "Restore complete!")
                callback.onComplete(true, "Restored $contactsRestored contacts and $messagesRestored messages")

            } catch (e: Exception) {
                Log.e(TAG, "Restore failed", e)
                callback.onComplete(false, "Restore failed: ${e.message}")
            }
        }
    }

    private fun deriveKey(passphrase: ByteArray, salt: ByteArray): SecretKeySpec {
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val chars = CharArray(passphrase.size) { passphrase[it].toInt().toChar() }
        val spec = PBEKeySpec(chars, salt, PBKDF2_ITERATIONS, KEY_LENGTH)
        val secret = factory.generateSecret(spec)
        chars.fill('\u0000')
        return SecretKeySpec(secret.encoded, "AES")
    }

    private fun contactToJson(contact: Contact): JSONObject {
        return JSONObject().apply {
            put("id", contact.id)
            put("displayName", contact.displayName)
            put("solanaAddress", contact.solanaAddress)
            put("publicKeyBase64", contact.publicKeyBase64)
            put("x25519PublicKeyBase64", contact.x25519PublicKeyBase64)
            put("kyberPublicKeyBase64", contact.kyberPublicKeyBase64 ?: JSONObject.NULL)
            put("friendRequestOnion", contact.friendRequestOnion)
            put("messagingOnion", contact.messagingOnion ?: JSONObject.NULL)
            put("voiceOnion", contact.voiceOnion ?: JSONObject.NULL)
            put("ipfsCid", contact.ipfsCid ?: JSONObject.NULL)
            put("contactPin", contact.contactPin ?: JSONObject.NULL)
            put("addedTimestamp", contact.addedTimestamp)
            put("lastContactTimestamp", contact.lastContactTimestamp)
            put("trustLevel", contact.trustLevel)
            put("isDistressContact", contact.isDistressContact)
            put("notes", contact.notes ?: JSONObject.NULL)
            put("isBlocked", contact.isBlocked)
            put("friendshipStatus", contact.friendshipStatus)
            put("isPinned", contact.isPinned)
        }
    }

    private fun jsonToContact(json: JSONObject): Contact {
        return Contact(
            id = 0, // auto-generate new ID
            displayName = json.getString("displayName"),
            solanaAddress = json.getString("solanaAddress"),
            publicKeyBase64 = json.getString("publicKeyBase64"),
            x25519PublicKeyBase64 = json.getString("x25519PublicKeyBase64"),
            kyberPublicKeyBase64 = json.optString("kyberPublicKeyBase64", null),
            friendRequestOnion = json.optString("friendRequestOnion", ""),
            messagingOnion = json.optString("messagingOnion", null),
            voiceOnion = json.optString("voiceOnion", null),
            ipfsCid = json.optString("ipfsCid", null),
            contactPin = json.optString("contactPin", null),
            addedTimestamp = json.getLong("addedTimestamp"),
            lastContactTimestamp = json.optLong("lastContactTimestamp", json.getLong("addedTimestamp")),
            trustLevel = json.optInt("trustLevel", 0),
            isDistressContact = json.optBoolean("isDistressContact", false),
            notes = json.optString("notes", null),
            isBlocked = json.optBoolean("isBlocked", false),
            friendshipStatus = json.optString("friendshipStatus", Contact.FRIENDSHIP_PENDING_SENT),
            isPinned = json.optBoolean("isPinned", false)
        )
    }

    private fun messageToJson(message: Message): JSONObject {
        return JSONObject().apply {
            put("contactId", message.contactId)
            put("messageId", message.messageId)
            put("encryptedContent", message.encryptedContent)
            put("isSentByMe", message.isSentByMe)
            put("timestamp", message.timestamp)
            put("status", message.status)
            put("signatureBase64", message.signatureBase64)
            put("nonceBase64", message.nonceBase64)
            put("messageNonce", message.messageNonce)
            put("messageType", message.messageType)
            put("voiceDuration", message.voiceDuration ?: JSONObject.NULL)
            put("voiceFilePath", message.voiceFilePath ?: JSONObject.NULL)
            put("attachmentType", message.attachmentType ?: JSONObject.NULL)
            put("attachmentData", message.attachmentData ?: JSONObject.NULL)
            put("isRead", message.isRead)
            put("requiresReadReceipt", message.requiresReadReceipt)
        }
    }

    private fun jsonToMessage(json: JSONObject, contactId: Long): Message {
        return Message(
            id = 0,
            contactId = contactId,
            messageId = json.getString("messageId"),
            encryptedContent = json.getString("encryptedContent"),
            isSentByMe = json.getBoolean("isSentByMe"),
            timestamp = json.getLong("timestamp"),
            status = json.optInt("status", Message.STATUS_DELIVERED),
            signatureBase64 = json.getString("signatureBase64"),
            nonceBase64 = json.getString("nonceBase64"),
            messageNonce = json.getLong("messageNonce"),
            messageType = json.optString("messageType", Message.MESSAGE_TYPE_TEXT),
            voiceDuration = if (json.isNull("voiceDuration")) null else json.optInt("voiceDuration"),
            voiceFilePath = json.optString("voiceFilePath", null),
            attachmentType = json.optString("attachmentType", null),
            attachmentData = json.optString("attachmentData", null),
            isRead = json.optBoolean("isRead", true),
            requiresReadReceipt = json.optBoolean("requiresReadReceipt", true)
        )
    }
}
