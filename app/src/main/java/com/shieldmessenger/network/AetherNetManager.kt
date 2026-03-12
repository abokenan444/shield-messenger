package com.shieldmessenger.network

import android.content.Context
import android.util.Log
import com.securelegion.crypto.RustBridge
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * AetherNet Manager — Android integration layer for multi-transport mesh networking.
 *
 * Manages the AetherNet subsystem lifecycle:
 *  - Tor (via existing TorManager)
 *  - I2P (via SAM bridge if available)
 *  - LibreMesh (BLE/Wi-Fi Direct)
 *
 * Provides smart transport switching, crisis mode, store-and-forward,
 * trust scoring, crowd mesh, and solidarity relay.
 */
class AetherNetManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "AetherNetManager"
        private const val TICK_INTERVAL_MS = 30_000L // 30 seconds

        @Volatile
        private var instance: AetherNetManager? = null

        fun getInstance(context: Context): AetherNetManager {
            return instance ?: synchronized(this) {
                instance ?: AetherNetManager(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var tickJob: Job? = null

    @Volatile
    private var initialized = false

    /**
     * Initialize AetherNet with the user's cryptographic keys.
     */
    fun initialize(publicKey: ByteArray, masterKey: ByteArray): Boolean {
        if (initialized) {
            Log.w(TAG, "Already initialized")
            return true
        }

        return try {
            val result = RustBridge.aethernetInit(publicKey, masterKey)
            if (result) {
                initialized = true
                Log.i(TAG, "AetherNet initialized")
            } else {
                Log.e(TAG, "AetherNet initialization failed")
            }
            result
        } catch (e: Exception) {
            Log.e(TAG, "AetherNet init error", e)
            false
        }
    }

    /**
     * Start all transports and begin periodic maintenance.
     */
    fun start() {
        if (!initialized) {
            Log.e(TAG, "Cannot start — not initialized")
            return
        }

        try {
            RustBridge.aethernetStart()
            startTickLoop()
            Log.i(TAG, "AetherNet started")
        } catch (e: Exception) {
            Log.e(TAG, "AetherNet start error", e)
        }
    }

    /**
     * Stop all transports and maintenance loop.
     */
    fun stop() {
        tickJob?.cancel()
        tickJob = null

        if (initialized) {
            try {
                RustBridge.aethernetStop()
                Log.i(TAG, "AetherNet stopped")
            } catch (e: Exception) {
                Log.e(TAG, "AetherNet stop error", e)
            }
        }
    }

    /**
     * Activate crisis mode.
     */
    fun activateCrisis(trigger: CrisisTrigger = CrisisTrigger.MANUAL): Boolean {
        return try {
            RustBridge.aethernetActivateCrisis(trigger.ordinal)
        } catch (e: Exception) {
            Log.e(TAG, "Crisis activation error", e)
            false
        }
    }

    /**
     * Deactivate crisis mode.
     */
    fun deactivateCrisis(): Boolean {
        return try {
            RustBridge.aethernetDeactivateCrisis()
        } catch (e: Exception) {
            Log.e(TAG, "Crisis deactivation error", e)
            false
        }
    }

    /**
     * Check if crisis mode is active.
     */
    fun isCrisisActive(): Boolean {
        return try {
            RustBridge.aethernetIsCrisisActive()
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Enable solidarity relay (voluntary bandwidth sharing).
     */
    fun enableSolidarity(): Boolean {
        return try {
            RustBridge.aethernetEnableSolidarity()
        } catch (e: Exception) {
            Log.e(TAG, "Solidarity enable error", e)
            false
        }
    }

    /**
     * Get current AetherNet status.
     */
    fun getStatus(): AetherNetStatus? {
        return try {
            val json = RustBridge.aethernetGetStatus() ?: return null
            val obj = JSONObject(json)
            AetherNetStatus(
                torAvailable = obj.optBoolean("tor_available", false),
                i2pAvailable = obj.optBoolean("i2p_available", false),
                meshAvailable = obj.optBoolean("mesh_available", false),
                crisisActive = obj.optBoolean("crisis_active", false),
                threatLevel = obj.optString("threat_level", "Normal"),
                pendingMessages = obj.optInt("pending_messages", 0),
                meshPeers = obj.optInt("mesh_peers", 0),
                meshClusters = obj.optInt("mesh_clusters", 0),
                solidarityEnabled = obj.optBoolean("solidarity_enabled", false),
                trustPeers = obj.optInt("trust_peers", 0),
            )
        } catch (e: Exception) {
            Log.e(TAG, "Status fetch error", e)
            null
        }
    }

    /**
     * Get number of pending store-and-forward messages.
     */
    fun pendingCount(): Int {
        return try {
            RustBridge.aethernetPendingCount()
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Get trust score for a peer (0-100).
     */
    fun trustScore(peerPubkey: ByteArray): Int {
        return try {
            RustBridge.aethernetTrustScore(peerPubkey)
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Start periodic maintenance loop.
     */
    private fun startTickLoop() {
        tickJob?.cancel()
        tickJob = scope.launch {
            while (isActive) {
                delay(TICK_INTERVAL_MS)
                try {
                    RustBridge.aethernetTick()
                } catch (e: Exception) {
                    Log.e(TAG, "Tick error", e)
                }
            }
        }
    }

    /**
     * Crisis trigger types.
     */
    enum class CrisisTrigger {
        MANUAL,
        NETWORK_TAMPERING,
        TRAFFIC_ANALYSIS,
    }

    /**
     * AetherNet status snapshot.
     */
    data class AetherNetStatus(
        val torAvailable: Boolean,
        val i2pAvailable: Boolean,
        val meshAvailable: Boolean,
        val crisisActive: Boolean,
        val threatLevel: String,
        val pendingMessages: Int,
        val meshPeers: Int,
        val meshClusters: Int,
        val solidarityEnabled: Boolean,
        val trustPeers: Int,
    )
}
