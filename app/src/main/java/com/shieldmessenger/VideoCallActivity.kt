package com.shieldmessenger

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Size
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.securelegion.crypto.KeyManager
import com.shieldmessenger.crypto.TorManager
import com.shieldmessenger.database.entities.ed25519PublicKeyBytes
import com.shieldmessenger.database.entities.x25519PublicKeyBytes
import com.shieldmessenger.utils.ThemedToast
import com.shieldmessenger.voice.CallSignaling
import com.shieldmessenger.voice.VoiceCallManager
import com.shieldmessenger.voice.VoiceCallSession
import com.shieldmessenger.voice.crypto.VoiceCallCrypto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale
import java.util.concurrent.Executors

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
        const val EXTRA_THEIR_EPHEMERAL_KEY = "THEIR_EPHEMERAL_KEY"
        const val EXTRA_CONTACT_ONION = "CONTACT_ONION"
        const val EXTRA_CONTACT_X25519_PUBLIC_KEY = "CONTACT_X25519_PUBLIC_KEY"

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
    private var waitingForAnswer = false

    // Call data
    private var theirEphemeralKey: ByteArray? = null
    private var ourEphemeralSecretKey: ByteArray? = null
    private var contactOnion: String = ""
    private var contactX25519PublicKey: ByteArray? = null

    // Camera
    private var cameraProvider: ProcessCameraProvider? = null

    // Video streaming
    private var remoteSurfaceView: SurfaceView? = null
    private var isVideoStreaming = false
    private val imageAnalysisExecutor = Executors.newSingleThreadExecutor()

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
        theirEphemeralKey = intent.getByteArrayExtra(EXTRA_THEIR_EPHEMERAL_KEY)
        ourEphemeralSecretKey = intent.getByteArrayExtra(EXTRA_OUR_EPHEMERAL_SECRET_KEY)
        contactOnion = intent.getStringExtra(EXTRA_CONTACT_ONION) ?: ""
        contactX25519PublicKey = intent.getByteArrayExtra(EXTRA_CONTACT_X25519_PUBLIC_KEY)

        activeInstance = this

        initViews()
        setupControls()
        checkCameraPermission()

        // Enable speaker for video call
        val audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        audioManager.isSpeakerphoneOn = true

        // Monitor call state from VoiceCallManager
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

        if (isOutgoing) {
            // Outgoing call: wait for CALL_ANSWER
            waitingForAnswer = true
        } else {
            // Incoming call: start answering flow
            answerIncomingCall()
        }
    }

    private fun answerIncomingCall() {
        val callManager = VoiceCallManager.getInstance(this)
        callStatusText.text = "Connecting..."

        lifecycleScope.launch {
            try {
                // Look up contact from database
                val keyManager = KeyManager.getInstance(this@VideoCallActivity)
                val dbPassphrase = keyManager.getDatabasePassphrase()
                val db = com.shieldmessenger.database.ShieldMessengerDatabase.getInstance(this@VideoCallActivity, dbPassphrase)

                val contact = withContext(Dispatchers.IO) {
                    db.contactDao().getContactById(contactId)
                }
                if (contact == null) {
                    Log.e(TAG, "Contact not found for incoming video call")
                    handleCallEnded("Contact not found")
                    return@launch
                }

                if (contact.messagingOnion == null) {
                    Log.e(TAG, "Contact has no messaging address")
                    handleCallEnded("Contact has no messaging address")
                    return@launch
                }

                val contactVoiceOnion = contact.voiceOnion ?: ""
                if (contactVoiceOnion.isEmpty()) {
                    Log.e(TAG, "Contact has no voice onion - cannot answer")
                    val x25519Key = contactX25519PublicKey ?: ByteArray(0)
                    val ourX25519PublicKey = keyManager.getEncryptionPublicKey()
                    CallSignaling.sendCallReject(x25519Key, contactOnion, callId, "Voice onion not available", ourX25519PublicKey)
                    handleCallEnded("Contact's voice address missing")
                    return@launch
                }

                // Generate ephemeral keypair
                val crypto = VoiceCallCrypto()
                val ourEphemeralKeypair = crypto.generateEphemeralKeypair()

                // Get our voice onion
                val torManager = TorManager.getInstance(this@VideoCallActivity)
                val myVoiceOnion = torManager.getVoiceOnionAddress() ?: ""

                val x25519Key = contactX25519PublicKey ?: ByteArray(0)
                val ourX25519PublicKey = keyManager.getEncryptionPublicKey()

                // Send CALL_ANSWER immediately
                runOnUiThread { callStatusText.text = "Sending call response..." }
                val success = withContext(Dispatchers.IO) {
                    CallSignaling.sendCallAnswer(
                        x25519Key,
                        contactOnion,
                        callId,
                        ourEphemeralKeypair.publicKey.asBytes,
                        myVoiceOnion,
                        ourX25519PublicKey
                    )
                }

                if (!success) {
                    Log.e(TAG, "Failed to send CALL_ANSWER")
                    handleCallEnded("Failed to establish connection")
                    return@launch
                }

                // Answer call in call manager (creates Tor circuits)
                runOnUiThread { callStatusText.text = "Establishing secure connection..." }
                val result = callManager.answerCall(
                    callId = callId,
                    contactVoiceOnion = contactVoiceOnion,
                    ourEphemeralSecretKey = ourEphemeralKeypair.secretKey.asBytes,
                    contactX25519PublicKey = x25519Key,
                    contactMessagingOnion = contact.messagingOnion!!,
                    ourEphemeralPublicKey = ourEphemeralKeypair.publicKey.asBytes,
                    myVoiceOnion = myVoiceOnion
                )

                if (result.isFailure) {
                    Log.e(TAG, "Failed to answer call: ${result.exceptionOrNull()?.message}")
                    CallSignaling.sendCallReject(x25519Key, contactOnion, callId, "Failed to establish call", ourX25519PublicKey)
                    handleCallEnded("Failed to answer call: ${result.exceptionOrNull()?.message}")
                    return@launch
                }

                // Monitor the new active call session
                callManager.getActiveCall()?.onCallStateChanged = { state ->
                    runOnUiThread {
                        when (state) {
                            VoiceCallSession.Companion.CallState.ACTIVE -> updateCallConnected()
                            VoiceCallSession.Companion.CallState.ENDED -> {
                                ThemedToast.show(this@VideoCallActivity, "Call ended")
                                finish()
                            }
                            else -> {}
                        }
                    }
                }

                Log.i(TAG, "Incoming video call answered successfully")
                runOnUiThread { updateCallConnected() }

            } catch (e: Exception) {
                Log.e(TAG, "Error answering incoming video call", e)
                if (callManager.hasActiveCall()) {
                    callManager.endCall("Error during setup")
                }
                handleCallEnded("Error: ${e.message}")
            }
        }
    }

    private fun handleCallEnded(reason: String) {
        runOnUiThread {
            ThemedToast.show(this, reason)
            finish()
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

        // Set up remote video SurfaceView
        remoteSurfaceView = SurfaceView(this)
        val container = findViewById<android.widget.FrameLayout>(R.id.remoteVideoContainer)
        container.addView(remoteSurfaceView, 0, // Add behind placeholder
            android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            ))
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
                VoiceCallManager.getInstance(this).getActiveCall()?.setVideoEnabled(true)
            } else {
                stopCamera()
                cameraToggleButton.setImageResource(R.drawable.ic_videocam_off)
                cameraToggleButton.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFFFF6B6B.toInt())
                findViewById<View>(R.id.localVideoCard).visibility = View.GONE
                VoiceCallManager.getInstance(this).getActiveCall()?.setVideoEnabled(false)
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

    private fun handleCallAnswered(answeredCallId: String, receivedTheirEphemeralKey: ByteArray) {
        if (answeredCallId != callId) {
            Log.w(TAG, "Received CALL_ANSWER for different call ID: $answeredCallId (expected $callId)")
            return
        }
        if (!waitingForAnswer) {
            Log.w(TAG, "Received CALL_ANSWER but not waiting for answer")
            return
        }

        Log.i(TAG, "Received CALL_ANSWER for our outgoing video call")
        waitingForAnswer = false
        theirEphemeralKey = receivedTheirEphemeralKey

        runOnUiThread {
            callStatusText.text = "Connecting..."
            startOutgoingCall()
        }
    }

    private fun startOutgoingCall() {
        val callManager = VoiceCallManager.getInstance(this)

        lifecycleScope.launch {
            try {
                val keyManager = KeyManager.getInstance(this@VideoCallActivity)
                val dbPassphrase = keyManager.getDatabasePassphrase()
                val db = com.shieldmessenger.database.ShieldMessengerDatabase.getInstance(this@VideoCallActivity, dbPassphrase)

                val contact = withContext(Dispatchers.IO) {
                    db.contactDao().getContactById(contactId)
                }
                if (contact == null) {
                    Log.e(TAG, "Contact not found for outgoing video call")
                    handleCallEnded("Contact not found")
                    return@launch
                }
                if (contact.messagingOnion == null) {
                    Log.e(TAG, "Contact has no messaging address")
                    handleCallEnded("Contact has no messaging address")
                    return@launch
                }

                val theirEphKey = theirEphemeralKey
                if (theirEphKey == null) {
                    Log.e(TAG, "No their ephemeral key available")
                    handleCallEnded("Missing encryption key")
                    return@launch
                }

                val contactVoiceOnion = contact.voiceOnion ?: ""
                if (contactVoiceOnion.isEmpty()) {
                    Log.e(TAG, "Contact has no voice onion address")
                    handleCallEnded("Contact has no voice address")
                    return@launch
                }

                val ourEphSecret = ourEphemeralSecretKey
                if (ourEphSecret == null) {
                    Log.e(TAG, "No our ephemeral secret key")
                    handleCallEnded("Missing encryption key")
                    return@launch
                }

                val result = callManager.startCall(
                    contactOnion = contact.messagingOnion!!,
                    contactVoiceOnion = contactVoiceOnion,
                    contactEd25519PublicKey = contact.ed25519PublicKeyBytes,
                    contactName = contact.displayName,
                    theirEphemeralPublicKey = theirEphKey,
                    ourEphemeralSecretKey = ourEphSecret,
                    callId = callId,
                    contactX25519PublicKey = contact.x25519PublicKeyBytes
                )

                if (result.isFailure) {
                    Log.e(TAG, "Failed to start video call", result.exceptionOrNull())
                    handleCallEnded("Failed to connect: ${result.exceptionOrNull()?.message}")
                } else {
                    Log.i(TAG, "Outgoing video call started successfully")
                    // Monitor the session
                    callManager.getActiveCall()?.onCallStateChanged = { state ->
                        runOnUiThread {
                            when (state) {
                                VoiceCallSession.Companion.CallState.ACTIVE -> updateCallConnected()
                                VoiceCallSession.Companion.CallState.ENDED -> {
                                    ThemedToast.show(this@VideoCallActivity, "Call ended")
                                    finish()
                                }
                                else -> {}
                            }
                        }
                    }
                    runOnUiThread { updateCallConnected() }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error starting outgoing video call", e)
                if (callManager.hasActiveCall()) {
                    callManager.endCall("Error during setup")
                }
                handleCallEnded("Error: ${e.message}")
            }
        }
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

        // Start video streaming when call connects
        startVideoStreaming()
    }

    /**
     * Start the video streaming pipeline once the call is active.
     * Uses hardware H.264 encoder → Tor circuits → hardware H.264 decoder → SurfaceView
     */
    private fun startVideoStreaming() {
        val session = VoiceCallManager.getInstance(this).getActiveCall() ?: return
        val surfaceView = remoteSurfaceView ?: return

        surfaceView.holder.addCallback(object : SurfaceHolder.Callback {
            override fun surfaceCreated(holder: SurfaceHolder) {
                val remoteSurface = holder.surface
                try {
                    val started = session.startVideoStream(remoteSurface)
                    if (started) {
                        isVideoStreaming = true
                        // Hide placeholder, show remote video
                        findViewById<View>(R.id.noVideoPlaceholder).visibility = View.GONE
                        // Bind camera with ImageAnalysis to feed encoder
                        if (isCameraOn) bindCameraForVideo()
                        Log.i(TAG, "Video streaming started")
                    } else {
                        Log.w(TAG, "Failed to start video stream - audio only")
                        findViewById<TextView>(R.id.placeholderText).text =
                            "$contactName\nAudio only"
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error starting video stream", e)
                }
            }

            override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {}
            override fun surfaceDestroyed(holder: SurfaceHolder) {
                isVideoStreaming = false
                session.stopVideoStream()
            }
        })
    }

    /**
     * Bind camera to both local preview and video encoder via ImageAnalysis.
     */
    private fun bindCameraForVideo() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val provider = cameraProviderFuture.get()
            cameraProvider = provider
            provider.unbindAll()

            val session = VoiceCallManager.getInstance(this).getActiveCall()
            val encoderSize = session?.getVideoEncoderSize()
            val targetWidth = encoderSize?.first ?: 320
            val targetHeight = encoderSize?.second ?: 240

            // Local preview
            val preview = Preview.Builder().build().also {
                it.surfaceProvider = localCameraPreview.surfaceProvider
            }

            // ImageAnalysis to capture frames for encoding
            val imageAnalysis = ImageAnalysis.Builder()
                .setTargetResolution(Size(targetWidth, targetHeight))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            imageAnalysis.setAnalyzer(imageAnalysisExecutor) { imageProxy ->
                if (isVideoStreaming && isCameraOn) {
                    val yuvData = imageProxyToNv12(imageProxy)
                    val pts = imageProxy.imageInfo.timestamp / 1000 // ns to us
                    session?.feedCameraFrame(yuvData, pts)
                }
                imageProxy.close()
            }

            val cameraSelector = if (isUsingFrontCamera) {
                CameraSelector.DEFAULT_FRONT_CAMERA
            } else {
                CameraSelector.DEFAULT_BACK_CAMERA
            }

            try {
                provider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis)
            } catch (e: Exception) {
                Log.e(TAG, "Camera bind failed", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    /**
     * Convert ImageProxy (YUV_420_888) to NV12 byte array for MediaCodec encoder.
     */
    private fun imageProxyToNv12(image: ImageProxy): ByteArray {
        val yPlane = image.planes[0]
        val uPlane = image.planes[1]
        val vPlane = image.planes[2]

        val width = image.width
        val height = image.height
        val ySize = width * height
        val uvSize = width * height / 2
        val nv12 = ByteArray(ySize + uvSize)

        // Copy Y plane (handle row stride padding)
        val yBuffer = yPlane.buffer
        val yRowStride = yPlane.rowStride
        if (yRowStride == width) {
            yBuffer.position(0)
            yBuffer.get(nv12, 0, ySize)
        } else {
            for (row in 0 until height) {
                yBuffer.position(row * yRowStride)
                yBuffer.get(nv12, row * width, width)
            }
        }

        // Copy UV planes
        val uvPixelStride = uPlane.pixelStride
        val uvRowStride = uPlane.rowStride
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        if (uvPixelStride == 2) {
            // Semi-planar: U plane already interleaved as UVUV (NV12)
            uBuffer.position(0)
            val remaining = minOf(uBuffer.remaining(), uvSize)
            uBuffer.get(nv12, ySize, remaining)
        } else {
            // Planar: manually interleave U and V
            var uvIdx = ySize
            for (row in 0 until height / 2) {
                for (col in 0 until width / 2) {
                    nv12[uvIdx++] = uBuffer.get(row * uvRowStride + col)
                    nv12[uvIdx++] = vBuffer.get(row * uvRowStride + col)
                }
            }
        }

        return nv12
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
        VoiceCallManager.getInstance(this).getActiveCall()?.stopVideoStream()
        imageAnalysisExecutor.shutdown()
    }

    override fun onPause() {
        super.onPause()
        VoiceCallManager.getInstance(this).getActiveCall()?.setVideoEnabled(false)
        stopCamera()
    }

    override fun onResume() {
        super.onResume()
        if (isCameraOn && isVideoStreaming) {
            VoiceCallManager.getInstance(this).getActiveCall()?.setVideoEnabled(true)
            bindCameraForVideo()
        } else if (isCameraOn) {
            startCamera()
        }
    }
}
