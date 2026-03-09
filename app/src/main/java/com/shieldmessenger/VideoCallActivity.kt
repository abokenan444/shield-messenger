package com.shieldmessenger

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
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

    // Camera
    private var cameraProvider: ProcessCameraProvider? = null
    private val cameraExecutor = Executors.newSingleThreadExecutor()

    // Remote video rendering
    private var remoteSurfaceView: SurfaceView? = null
    private var remoteSurface: Surface? = null
    private var videoStarted = false

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

        // Check if call is already active (e.g. incoming call answered before activity started)
        if (manager.getActiveCall()?.getState() == VoiceCallSession.Companion.CallState.ACTIVE) {
            updateCallConnected()
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
                VoiceCallManager.getInstance(this).getActiveCall()?.setVideoEnabled(true)
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

        // If video stream is active, add ImageAnalysis to capture frames for encoding
        if (videoStarted) {
            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                try {
                    val manager = VoiceCallManager.getInstance(this)
                    val session = manager.getActiveCall()
                    if (session != null) {
                        val nv12 = imageProxyToNv12(imageProxy, session)
                        if (nv12 != null) {
                            session.feedCameraFrame(nv12, imageProxy.imageInfo.timestamp / 1000)
                        }
                    }
                } catch (e: Exception) {
                    // Silently continue - frame drops are acceptable
                } finally {
                    imageProxy.close()
                }
            }

            try {
                provider.bindToLifecycle(this, cameraSelector, preview, imageAnalysis)
                Log.i(TAG, "Camera bound with preview + ImageAnalysis (feeding video encoder)")
            } catch (e: Exception) {
                Log.e(TAG, "Camera bind with ImageAnalysis failed, falling back to preview only", e)
                try {
                    provider.unbindAll()
                    provider.bindToLifecycle(this, cameraSelector, preview)
                } catch (e2: Exception) {
                    Log.e(TAG, "Camera bind failed entirely", e2)
                }
            }
        } else {
            // No video stream yet, just show preview
            try {
                provider.bindToLifecycle(this, cameraSelector, preview)
            } catch (e: Exception) {
                Log.e(TAG, "Camera bind failed", e)
            }
        }
    }

    /**
     * Convert CameraX ImageProxy (YUV_420_888) to NV12 byte array matching encoder dimensions.
     * NV12 = Y plane followed by interleaved UV (semi-planar).
     */
    private fun imageProxyToNv12(imageProxy: ImageProxy, session: VoiceCallSession): ByteArray? {
        val encoderSize = session.getVideoEncoderSize() ?: return null
        val targetW = encoderSize.first
        val targetH = encoderSize.second

        val yPlane = imageProxy.planes[0]
        val uPlane = imageProxy.planes[1]
        val vPlane = imageProxy.planes[2]

        val imageW = imageProxy.width
        val imageH = imageProxy.height

        // Allocate NV12 buffer: Y (w*h) + UV interleaved (w*h/2)
        val nv12Size = targetW * targetH * 3 / 2
        val nv12 = ByteArray(nv12Size)

        val yBuffer = yPlane.buffer
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val yRowStride = yPlane.rowStride
        val uvRowStride = uPlane.rowStride
        val uvPixelStride = uPlane.pixelStride

        // Scale factors (simple nearest-neighbor for speed)
        val scaleX = imageW.toFloat() / targetW
        val scaleY = imageH.toFloat() / targetH

        // Copy Y plane with scaling
        for (row in 0 until targetH) {
            val srcRow = (row * scaleY).toInt().coerceAtMost(imageH - 1)
            for (col in 0 until targetW) {
                val srcCol = (col * scaleX).toInt().coerceAtMost(imageW - 1)
                val srcIndex = srcRow * yRowStride + srcCol
                if (srcIndex < yBuffer.capacity()) {
                    nv12[row * targetW + col] = yBuffer.get(srcIndex)
                }
            }
        }

        // Copy UV planes (interleaved as NV12: U, V, U, V, ...)
        val uvOffset = targetW * targetH
        val halfTargetH = targetH / 2
        val halfTargetW = targetW / 2
        val halfImageH = imageH / 2
        val halfImageW = imageW / 2

        if (uvPixelStride == 2) {
            // Already semi-planar (NV12 or NV21) — most common on Android
            for (row in 0 until halfTargetH) {
                val srcRow = (row * scaleY).toInt().coerceAtMost(halfImageH - 1)
                for (col in 0 until halfTargetW) {
                    val srcCol = (col * scaleX).toInt().coerceAtMost(halfImageW - 1)
                    val dstIndex = uvOffset + row * targetW + col * 2
                    val srcUIndex = srcRow * uvRowStride + srcCol * uvPixelStride
                    val srcVIndex = srcRow * uvRowStride + srcCol * uvPixelStride + 1
                    if (srcUIndex < uBuffer.capacity() && srcVIndex < vBuffer.capacity() && dstIndex + 1 < nv12.size) {
                        nv12[dstIndex] = uBuffer.get(srcUIndex)
                        nv12[dstIndex + 1] = vBuffer.get(srcVIndex)
                    }
                }
            }
        } else {
            // Planar format — need to interleave U and V
            for (row in 0 until halfTargetH) {
                val srcRow = (row * scaleY).toInt().coerceAtMost(halfImageH - 1)
                for (col in 0 until halfTargetW) {
                    val srcCol = (col * scaleX).toInt().coerceAtMost(halfImageW - 1)
                    val dstIndex = uvOffset + row * targetW + col * 2
                    val srcUIndex = srcRow * uvRowStride + srcCol
                    val srcVIndex = srcRow * uvRowStride + srcCol
                    if (srcUIndex < uBuffer.capacity() && srcVIndex < vBuffer.capacity() && dstIndex + 1 < nv12.size) {
                        nv12[dstIndex] = uBuffer.get(srcUIndex)
                        nv12[dstIndex + 1] = vBuffer.get(srcVIndex)
                    }
                }
            }
        }

        return nv12
    }

    private fun stopCamera() {
        cameraProvider?.unbindAll()
        // Pause video when camera is turned off (audio continues)
        val manager = VoiceCallManager.getInstance(this)
        manager.getActiveCall()?.setVideoEnabled(false)
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

        // Start the video stream
        startVideoStreaming()
    }

    /**
     * Create a SurfaceView for remote video, wait for the Surface to be ready,
     * then start the video pipeline (encoder + decoder + Tor transport).
     */
    private fun startVideoStreaming() {
        if (videoStarted) return

        val container = findViewById<FrameLayout>(R.id.remoteVideoContainer)

        // Create SurfaceView for remote video rendering
        val surfaceView = SurfaceView(this)
        surfaceView.setZOrderMediaOverlay(true) // Render above the background
        remoteSurfaceView = surfaceView

        surfaceView.holder.addCallback(object : SurfaceHolder.Callback {
            override fun surfaceCreated(holder: SurfaceHolder) {
                Log.i(TAG, "Remote video surface created")
                remoteSurface = holder.surface
                activateVideoStream(holder.surface)
            }

            override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
                Log.d(TAG, "Remote video surface changed: ${width}x${height}")
            }

            override fun surfaceDestroyed(holder: SurfaceHolder) {
                Log.i(TAG, "Remote video surface destroyed")
                remoteSurface = null
            }
        })

        // Hide placeholder, add SurfaceView
        val placeholder = findViewById<View>(R.id.noVideoPlaceholder)
        placeholder.visibility = View.GONE
        container.addView(surfaceView, 0,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT))

        // If surface is already valid (rare but possible)
        if (surfaceView.holder.surface?.isValid == true) {
            remoteSurface = surfaceView.holder.surface
            activateVideoStream(surfaceView.holder.surface)
        }
    }

    /**
     * Actually start the video stream once the Surface is ready.
     */
    private fun activateVideoStream(surface: Surface) {
        if (videoStarted) return

        val manager = VoiceCallManager.getInstance(this)
        val session = manager.getActiveCall()

        if (session == null) {
            Log.w(TAG, "No active call session — will retry in 1s")
            Handler(Looper.getMainLooper()).postDelayed({
                val s = remoteSurface
                if (s != null && s.isValid && !videoStarted) {
                    activateVideoStream(s)
                }
            }, 1000)
            return
        }

        val started = session.startVideoStream(surface)
        if (started) {
            videoStarted = true
            Log.i(TAG, "Video stream activated — rebinding camera with ImageAnalysis")
            // Rebind camera to include ImageAnalysis for frame capture
            if (isCameraOn) {
                startCamera()
            }
        } else {
            Log.w(TAG, "startVideoStream returned false — will retry in 2s")
            Handler(Looper.getMainLooper()).postDelayed({
                val s = remoteSurface
                if (s != null && s.isValid && !videoStarted) {
                    activateVideoStream(s)
                }
            }, 2000)
        }
    }

    private fun endCall(reason: String) {
        try {
            val manager = VoiceCallManager.getInstance(this)
            manager.getActiveCall()?.stopVideoStream()
            manager.endCall(reason)
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
        cameraExecutor.shutdown()
        try {
            VoiceCallManager.getInstance(this).getActiveCall()?.stopVideoStream()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping video stream on destroy", e)
        }
        videoStarted = false
    }
}
