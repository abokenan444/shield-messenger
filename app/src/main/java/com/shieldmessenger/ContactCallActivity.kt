package com.shieldmessenger

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.shieldmessenger.adapters.CallHistoryAdapter
import com.securelegion.crypto.KeyManager
import com.shieldmessenger.database.ShieldMessengerDatabase
import com.shieldmessenger.database.entities.CallHistory
import com.shieldmessenger.database.entities.ed25519PublicKeyBytes
import com.shieldmessenger.database.entities.x25519PublicKeyBytes
import com.shieldmessenger.utils.ThemedToast
import com.shieldmessenger.voice.CallSignaling
import com.shieldmessenger.voice.VoiceCallManager
import com.shieldmessenger.voice.crypto.VoiceCallCrypto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

class ContactCallActivity : BaseActivity() {

    companion object {
        private const val TAG = "ContactCallActivity"
        const val EXTRA_CONTACT_ID = "CONTACT_ID"
        const val EXTRA_CONTACT_NAME = "CONTACT_NAME"
        const val EXTRA_CONTACT_ADDRESS = "CONTACT_ADDRESS"
    }

    private var contactId: Long = -1
    private var contactName: String = ""
    private var contactAddress: String = ""
    private lateinit var historyAdapter: CallHistoryAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_contact_call)

        contactId = intent.getLongExtra(EXTRA_CONTACT_ID, -1)
        contactName = intent.getStringExtra(EXTRA_CONTACT_NAME) ?: ""
        contactAddress = intent.getStringExtra(EXTRA_CONTACT_ADDRESS) ?: ""

        // Set contact name
        findViewById<TextView>(R.id.contactName).text = contactName

        // Back button
        findViewById<View>(R.id.backButton).setOnClickListener {
            finish()
        }

        // Call history button — opens full call history
        findViewById<View>(R.id.callHistoryButton).setOnClickListener {
            startActivity(Intent(this, CallHistoryActivity::class.java))
        }

        // Setup bottom nav
        setupBottomNav()

        // Call button — starts the actual call
        findViewById<View>(R.id.actionCall).setOnClickListener {
            startCall()
        }

        // Message button — opens chat
        findViewById<View>(R.id.actionMessage).setOnClickListener {
            val intent = Intent(this, ChatActivity::class.java).apply {
                putExtra(ChatActivity.EXTRA_CONTACT_ID, contactId)
                putExtra(ChatActivity.EXTRA_CONTACT_NAME, contactName)
                putExtra(ChatActivity.EXTRA_CONTACT_ADDRESS, contactAddress)
            }
            startActivity(intent)
        }

        // Setup call history list
        historyAdapter = CallHistoryAdapter(
            callHistory = emptyList(),
            onReCallClick = { startCall() },
            onItemClick = { /* no-op, already on this contact */ }
        )
        val recyclerView = findViewById<RecyclerView>(R.id.historyRecyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = historyAdapter

        // Load contact info + call history
        loadContactData()
    }

    override fun onResume() {
        super.onResume()
        // Refresh call history when coming back from a call
        loadContactData()
    }

    private fun loadContactData() {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val keyManager = KeyManager.getInstance(this@ContactCallActivity)
                val dbPassphrase = keyManager.getDatabasePassphrase()
                val database = ShieldMessengerDatabase.getInstance(this@ContactCallActivity, dbPassphrase)

                val contact = database.contactDao().getContactById(contactId)
                val history = database.callHistoryDao().getCallHistoryForContactList(contactId)

                withContext(Dispatchers.Main) {
                    // Load profile photo
                    if (contact != null && !contact.profilePictureBase64.isNullOrEmpty()) {
                        try {
                            val photoBytes = android.util.Base64.decode(contact.profilePictureBase64, android.util.Base64.NO_WRAP)
                            val bitmap = android.graphics.BitmapFactory.decodeByteArray(photoBytes, 0, photoBytes.size)
                            if (bitmap != null) {
                                findViewById<ImageView>(R.id.profilePicture).setImageBitmap(bitmap)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to decode profile photo", e)
                        }
                    }

                    // Update call history
                    val emptyState = findViewById<TextView>(R.id.emptyStateText)
                    val recyclerView = findViewById<RecyclerView>(R.id.historyRecyclerView)

                    if (history.isEmpty()) {
                        emptyState.visibility = View.VISIBLE
                        recyclerView.visibility = View.GONE
                    } else {
                        emptyState.visibility = View.GONE
                        recyclerView.visibility = View.VISIBLE
                        historyAdapter.updateHistory(history)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load contact data", e)
            }
        }
    }

    private fun setupBottomNav() {
        BottomNavigationHelper.setupBottomNavigation(this)
    }

    private var isInitiatingCall = false

    private fun startCall() {
        if (isInitiatingCall) {
            Log.w(TAG, "Call initiation already in progress")
            return
        }
        isInitiatingCall = true

        lifecycleScope.launch {
            try {
                // Check RECORD_AUDIO permission
                if (ContextCompat.checkSelfPermission(
                        this@ContactCallActivity,
                        Manifest.permission.RECORD_AUDIO
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        this@ContactCallActivity,
                        arrayOf(Manifest.permission.RECORD_AUDIO),
                        100
                    )
                    isInitiatingCall = false
                    return@launch
                }

                val keyManager = KeyManager.getInstance(this@ContactCallActivity)
                val dbPassphrase = keyManager.getDatabasePassphrase()
                val database = ShieldMessengerDatabase.getInstance(this@ContactCallActivity, dbPassphrase)
                val contact = withContext(Dispatchers.IO) {
                    database.contactDao().getContactById(contactId)
                }

                if (contact == null) {
                    ThemedToast.show(this@ContactCallActivity, "Contact not found")
                    isInitiatingCall = false
                    return@launch
                }

                if (contact.voiceOnion.isNullOrEmpty()) {
                    ThemedToast.show(this@ContactCallActivity, "${contact.displayName} doesn't have a voice address")
                    isInitiatingCall = false
                    return@launch
                }

                if (contact.messagingOnion == null) {
                    ThemedToast.show(this@ContactCallActivity, "Contact has no messaging address")
                    isInitiatingCall = false
                    return@launch
                }

                // Generate call ID and ephemeral keypair
                val callId = UUID.randomUUID().toString()
                val crypto = VoiceCallCrypto()
                val ephemeralKeypair = crypto.generateEphemeralKeypair()

                // Launch VoiceCallActivity immediately (shows "Calling..." UI)
                val intent = Intent(this@ContactCallActivity, VoiceCallActivity::class.java).apply {
                    putExtra(VoiceCallActivity.EXTRA_CONTACT_ID, contactId)
                    putExtra(VoiceCallActivity.EXTRA_CONTACT_NAME, contactName)
                    putExtra(VoiceCallActivity.EXTRA_CALL_ID, callId)
                    putExtra(VoiceCallActivity.EXTRA_IS_OUTGOING, true)
                    putExtra(VoiceCallActivity.EXTRA_OUR_EPHEMERAL_SECRET_KEY, ephemeralKeypair.secretKey.asBytes)
                }
                startActivity(intent)

                // Get our voice onion and X25519 public key
                val torManager = com.shieldmessenger.crypto.TorManager.getInstance(this@ContactCallActivity)
                val myVoiceOnion = torManager.getVoiceOnionAddress() ?: ""
                val ourX25519PublicKey = keyManager.getEncryptionPublicKey()

                // Send CALL_OFFER via HTTP POST to recipient's voice .onion
                Log.i(TAG, "CALL_OFFER_SEND attempt=1 call_id=$callId")
                val success = withContext(Dispatchers.IO) {
                    CallSignaling.sendCallOffer(
                        recipientX25519PublicKey = contact.x25519PublicKeyBytes,
                        recipientOnion = contact.voiceOnion!!,
                        callId = callId,
                        ephemeralPublicKey = ephemeralKeypair.publicKey.asBytes,
                        voiceOnion = myVoiceOnion,
                        ourX25519PublicKey = ourX25519PublicKey,
                        numCircuits = 1
                    )
                }

                if (!success) {
                    ThemedToast.show(this@ContactCallActivity, "Failed to send call offer")
                    isInitiatingCall = false
                    return@launch
                }

                // Register pending call with VoiceCallManager
                val callManager = VoiceCallManager.getInstance(this@ContactCallActivity)

                val timeoutJob = lifecycleScope.launch {
                    while (isActive) {
                        delay(1000)
                        callManager.checkPendingCallTimeouts()
                    }
                }

                // CALL_OFFER retry: resend every 2s for up to 25s
                val setupStartTime = System.currentTimeMillis()
                var offerAttemptNum = 1

                val offerRetryJob = lifecycleScope.launch {
                    while (isActive) {
                        delay(2000L)
                        val elapsed = System.currentTimeMillis() - setupStartTime
                        if (elapsed >= 25000L) break

                        offerAttemptNum++
                        Log.i(TAG, "CALL_OFFER_SEND attempt=$offerAttemptNum call_id=$callId (retry)")
                        withContext(Dispatchers.IO) {
                            CallSignaling.sendCallOffer(
                                recipientX25519PublicKey = contact.x25519PublicKeyBytes,
                                recipientOnion = contact.voiceOnion!!,
                                callId = callId,
                                ephemeralPublicKey = ephemeralKeypair.publicKey.asBytes,
                                voiceOnion = myVoiceOnion,
                                ourX25519PublicKey = ourX25519PublicKey,
                                numCircuits = 1
                            )
                        }
                    }
                }

                callManager.registerPendingOutgoingCall(
                    callId = callId,
                    contactOnion = contact.voiceOnion!!,
                    contactEd25519PublicKey = contact.ed25519PublicKeyBytes,
                    contactName = contactName,
                    ourEphemeralPublicKey = ephemeralKeypair.publicKey.asBytes,
                    onAnswered = { theirEphemeralKey ->
                        lifecycleScope.launch(Dispatchers.Main) {
                            timeoutJob.cancel()
                            offerRetryJob.cancel()
                            VoiceCallActivity.onCallAnswered(callId, theirEphemeralKey)
                            isInitiatingCall = false
                        }
                    },
                    onRejected = { reason ->
                        lifecycleScope.launch(Dispatchers.Main) {
                            timeoutJob.cancel()
                            offerRetryJob.cancel()
                            VoiceCallActivity.onCallRejected(callId, reason)
                            isInitiatingCall = false
                        }
                    },
                    onBusy = {
                        lifecycleScope.launch(Dispatchers.Main) {
                            timeoutJob.cancel()
                            offerRetryJob.cancel()
                            VoiceCallActivity.onCallBusy(callId)
                            isInitiatingCall = false
                        }
                    },
                    onTimeout = {
                        lifecycleScope.launch(Dispatchers.Main) {
                            timeoutJob.cancel()
                            offerRetryJob.cancel()
                            VoiceCallActivity.onCallTimeout(callId)
                            isInitiatingCall = false
                        }
                    }
                )

                Log.i(TAG, "Voice call initiated to $contactName with call ID: $callId")

            } catch (e: Exception) {
                Log.e(TAG, "Failed to start call", e)
                ThemedToast.show(this@ContactCallActivity, "Failed to start call: ${e.message}")
                isInitiatingCall = false
            }
        }
    }
}
