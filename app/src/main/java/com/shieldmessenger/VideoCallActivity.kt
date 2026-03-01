package com.shieldmessenger

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.shieldmessenger.utils.ThemedToast
import com.shieldmessenger.voice.VoiceCallManager
import com.shieldmessenger.voice.VoiceCallSession
import java.util.Locale

/**
 * VideoCallActivity - Video call screen extending voice call with camera.
 *
 * Uses the existing VoiceCallManager/VoiceCallSession for audio (Opus over Tor)
 * and adds CameraX local preview. The actual call is initiated by ChatActivity
 * which sends CALL_OFFER, forwards the intent here, and notifies us when
 * CALL_ANSWER arrives — same flow as VoiceCallActivity.
 *
 * Currently provides:
 * - Full voice call functionality (audio over Tor)
 * - Local camera preview (front/back toggle)
 * - Camera on/off toggle
 * - Call timer and status display
 */
class VideoCallActivity : BaseActivity() {

    companion object {
        private const val TAG = "VideoCallActivity"
        private const val CAMERA_PERMISSION_REQUEST = 2001

        const val EXTRA_CONTACT_ID = "CONTACT_ID"
        const val EXTRA_CONTACT_NAME = "CONTACT_NAME"
        const val EXTRA_CALL_ID = "CALL_ID"
        const val EXTRA_IS_OUTGOING = "IS_OUTGOING"
        const val EXTRA_OUR_EPHEMERAL_SECRET_KEY = "OUR_EPHEMERAL_SECRET_KEY"

        private var activeInstance: VideoCallActivity? = null

        fun onCallAnswered(callId: String, theirEphemeralKey: ByteArray) {
            activeInstance?.handleCallAnswered(callId, theirEphemeralKey)
        }

        fun onCallTimeout(callId: String) {
            activeInstance?.handleCallTimeout(callId)
        }

        fun onCallRejected(callId: String, reason: String) {
            activeInstance?.handleCallRejected(callId, reason)
        }

        fun onCallBusy(callId: String) {
            activeInstance?.handleCallBusy(callId)
        }
    }

    // UI elements
    private lateinit var contactNameText: TextView
    private lateinit var callStatusText: TextView
    private lateinit var callTimerText: TextView
    private lateinit var localCameraPreview: PreviewView
    private lateinit var muteButton: FloatingActionButton
    private lateinit var cameraToggleButton: FloatingActionButton
    private lateinit var endCallButton: FloatingActionButton
    private lateinit var flipCameraButton: FloatingActionButton

    // Call state
    private var contactId: Long = -1
    private var contactName: String = ""
    private var callId: String = ""
    private var isOutgoing: Boolean = true
    private var isMuted = false
    private var isCameraOn = true
    private var isUsingFrontCamera = true

    // Camera
    private var cameraProvider: ProcessCameraProvider? = null

    // Timer
    private val timerHandler = Handler(Looper.getMainLooper())
    private var callStartTime = 0L
    private val timerRunnable = object : Runnable {
        override fun run() {
            if (callStartTime > 0) {
                val elapsed = (System.currentTimeMillis() - callStartTime) / 1000
                val minutes = elapsed / 60
                val seconds = elapsed % 60
                callTimerText.text = String.format(Locale.US, "%d:%02d", minutes, seconds)
            }
            timerHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_video_call)

        contactId = intent.getLongExtra(EXTRA_CONTACT_ID, -1)
        contactName = intent.getStringExtra(EXTRA_CONTACT_NAME) ?: "Unknown"
        callId = intent.getStringExtra(EXTRA_CALL_ID) ?: ""
        isOutgoing = intent.getBooleanExtra(EXTRA_IS_OUTGOING, true)

        activeInstance = this

        initViews()
        setupControls()
        checkCameraPermission()

        // Enable speaker for video call
        val audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = true

        // Monitor call state from VoiceCallManager (audio session is managed by ChatActivity)
        val manager = VoiceCallManager.getInstance(this)
        manager.getActiveCall()?.onCallStateChanged = { state ->
            runOnUiThread {
                when (state) {
                    VoiceCallSession.Companion.CallState.ACTIVE -> updateCallConnected()
                    VoiceCallSession.Companion.CallState.ENDED -> {
                        ThemedToast.show(this, "Call ended")
                        finish()
                    }
                    else -> {}
                }
            }
        }
    }

    private fun initViews() {
        contactNameText = findViewById(R.id.contactName)
        callStatusText = findViewById(R.id.callStatus)
        callTimerText = findViewById(R.id.callTimer)
        localCameraPreview = findViewById(R.id.localCameraPreview)
        muteButton = findViewById(R.id.muteButton)
        cameraToggleButton = findViewById(R.id.cameraToggleButton)
        endCallButton = findViewById(R.id.endCallButton)
        flipCameraButton = findViewById(R.id.flipCameraButton)

        contactNameText.text = contactName
        callStatusText.text = if (isOutgoing) "Calling..." else "Connecting..."
        findViewById<TextView>(R.id.placeholderText).text =
            if (isOutgoing) "Calling $contactName..." else "Connecting video..."
    }

    private fun setupControls() {
        findViewById<View>(R.id.backButton).setOnClickListener { finish() }

        muteButton.setOnClickListener {
            isMuted = !isMuted
            VoiceCallManager.getInstance(this).setMuted(isMuted)
            muteButton.setImageResource(if (isMuted) R.drawable.ic_mic_off else R.drawable.ic_mic)
            muteButton.backgroundTintList = android.content.res.ColorStateList.valueOf(
                if (isMuted) 0xFFFF6B6B.toInt() else 0x44FFFFFF
            )
        }

        cameraToggleButton.setOnClickListener {
            isCameraOn = !isCameraOn
            if (isCameraOn) {
                startCamera()
                cameraToggleButton.setImageResource(R.drawable.ic_videocam)
                cameraToggleButton.backgroundTintList = android.content.res.ColorStateList.valueOf(0x44FFFFFF)
                findViewById<View>(R.id.localVideoCard).visibility = View.VISIBLE
            } else {
                stopCamera()
                cameraToggleButton.setImageResource(R.drawable.ic_videocam_off)
                cameraToggleButton.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFFFF6B6B.toInt())
                findViewById<View>(R.id.localVideoCard).visibility = View.GONE
            }
        }

        endCallButton.setOnClickListener { endCall("User ended call") }

        flipCameraButton.setOnClickListener {
            isUsingFrontCamera = !isUsingFrontCamera
            if (isCameraOn) startCamera()
        }
    }

    private fun checkCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), CAMERA_PERMISSION_REQUEST)
        } else {
            startCamera()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            isCameraOn = false
            cameraToggleButton.setImageResource(R.drawable.ic_videocam_off)
            findViewById<View>(R.id.localVideoCard).visibility = View.GONE
            ThemedToast.show(this, "Camera permission denied - audio only")
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            bindCameraPreview()
        }, ContextCompat.getMainExecutor(this))
    }

    private fun bindCameraPreview() {
        val provider = cameraProvider ?: return
        provider.unbindAll()

        val preview = Preview.Builder().build().also {
            it.surfaceProvider = localCameraPreview.surfaceProvider
        }

        val cameraSelector = if (isUsingFrontCamera) {
            CameraSelector.DEFAULT_FRONT_CAMERA
        } else {
            CameraSelector.DEFAULT_BACK_CAMERA
        }

        try {
            provider.bindToLifecycle(this, cameraSelector, preview)
        } catch (e: Exception) {
            Log.e(TAG, "Camera bind failed", e)
        }
    }

    private fun stopCamera() {
        cameraProvider?.unbindAll()
    }

    private fun handleCallAnswered(answeredCallId: String, theirEphemeralKey: ByteArray) {
        if (answeredCallId != callId) return
        Log.i(TAG, "Call answered")
        runOnUiThread { callStatusText.text = "Connecting..." }
    }

    private fun handleCallTimeout(timedOutCallId: String) {
        if (timedOutCallId != callId) return
        runOnUiThread {
            ThemedToast.show(this, "No answer")
            finish()
        }
    }

    private fun handleCallRejected(rejectedCallId: String, reason: String) {
        if (rejectedCallId != callId) return
        runOnUiThread {
            ThemedToast.show(this, "Call declined")
            finish()
        }
    }

    private fun handleCallBusy(busyCallId: String) {
        if (busyCallId != callId) return
        runOnUiThread {
            ThemedToast.show(this, "Contact is busy")
            finish()
        }
    }

    private fun updateCallConnected() {
        callStatusText.text = "Encrypted video call"
        callTimerText.visibility = View.VISIBLE
        callStartTime = System.currentTimeMillis()
        timerHandler.post(timerRunnable)
        findViewById<TextView>(R.id.placeholderText).text = "$contactName\nVideo streaming coming soon"
    }

    private fun endCall(reason: String) {
        try {
            VoiceCallManager.getInstance(this).endCall(reason)
        } catch (e: Exception) {
            Log.e(TAG, "Error ending call", e)
        }
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        activeInstance = null
        timerHandler.removeCallbacks(timerRunnable)
        stopCamera()
    }
}
