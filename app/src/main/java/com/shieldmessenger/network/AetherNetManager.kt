package com.shieldmessenger.network

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import com.securelegion.crypto.RustBridge
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * AetherNet Manager — Android integration layer for multi-transport mesh networking.
 *
 * Manages the AetherNet subsystem lifecycle:
 *  - Tor (via existing TorManager)
 *  - I2P (via SAM bridge if available)
 *  - LibreMesh (BLE/Wi-Fi Direct/LoRa)
 *
 * Provides smart transport switching, crisis mode, store-and-forward,
 * trust scoring, crowd mesh, solidarity relay, and persistence.
 */
class AetherNetManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "AetherNetManager"
        private const val TICK_INTERVAL_MS = 30_000L
        private const val PERSIST_INTERVAL_MS = 300_000L // 5 minutes
        private const val PREFS_NAME = "aethernet_state"
        private const val PREF_STORE_FORWARD = "store_forward_data"
        private const val PREF_TRUST_MAP = "trust_map_data"

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
    private var persistJob: Job? = null
    private var receiveJob: Job? = null
    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Volatile
    private var initialized = false

    private var messageListener: MessageListener? = null

    interface MessageListener {
        fun onMessageReceived(
            senderId: String,
            senderPubkey: ByteArray,
            payload: ByteArray,
            priority: Int,
            timestamp: Long
        )
    }

    fun setMessageListener(listener: MessageListener?) {
        messageListener = listener
    }

    fun initialize(publicKey: ByteArray, masterKey: ByteArray): Boolean {
        if (initialized) {
            Log.w(TAG, "Already initialized")
            return true
        }

        return try {
            val result = RustBridge.aethernetInit(publicKey, masterKey)
            if (result) {
                initialized = true
                restoreState()
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

    fun start() {
        if (!initialized) {
            Log.e(TAG, "Cannot start — not initialized")
            return
        }

        try {
            RustBridge.aethernetStart()
            startTickLoop()
            startPersistLoop()
            startReceiveLoop()
            Log.i(TAG, "AetherNet started")
        } catch (e: Exception) {
            Log.e(TAG, "AetherNet start error", e)
        }
    }

    fun stop() {
        tickJob?.cancel()
        tickJob = null
        persistJob?.cancel()
        persistJob = null
        receiveJob?.cancel()
        receiveJob = null

        if (initialized) {
            try {
                persistState()
                RustBridge.aethernetStop()
                Log.i(TAG, "AetherNet stopped")
            } catch (e: Exception) {
                Log.e(TAG, "AetherNet stop error", e)
            }
        }
    }

    // ── Send / Receive ───────────────────────────────────────────────────

    /**
     * Send a message through AetherNet with smart transport selection.
     * @param recipientPubkey 32-byte Ed25519 public key of the recipient
     * @param payload encrypted message payload
     * @param priority 0=Bulk, 1=Normal, 2=Urgent, 3=Critical
     * @param transportHint preferred transport: "Tor", "I2P", or "Mesh"
     */
    fun send(
        recipientPubkey: ByteArray,
        payload: ByteArray,
        priority: Int = 1,
        transportHint: String = "Tor"
    ): Boolean {
        if (!initialized) return false
        return try {
            RustBridge.aethernetSend(recipientPubkey, payload, priority, transportHint)
        } catch (e: Exception) {
            Log.e(TAG, "Send error", e)
            false
        }
    }

    /**
     * Receive pending messages from all transports.
     * Returns parsed envelopes.
     */
    fun receive(maxCount: Int = 50): List<AetherNetEnvelope> {
        if (!initialized) return emptyList()
        return try {
            val json = RustBridge.aethernetReceive(maxCount) ?: return emptyList()
            parseEnvelopes(json)
        } catch (e: Exception) {
            Log.e(TAG, "Receive error", e)
            emptyList()
        }
    }

    // ── Tor Integration ──────────────────────────────────────────────────

    /**
     * Set the Tor hidden service onion address.
     * Call this after TorService establishes the hidden service.
     */
    fun setTorOnion(onion: String): Boolean {
        if (!initialized) return false
        return try {
            RustBridge.aethernetSetTorOnion(onion)
        } catch (e: Exception) {
            Log.e(TAG, "setTorOnion error", e)
            false
        }
    }

    // ── Mesh Platform Callbacks ──────────────────────────────────────────

    fun meshPeerDiscovered(
        peerPubkey: ByteArray,
        radioAddr: String,
        radioType: MeshRadioType,
        signalStrength: Int,
        hasInternet: Boolean,
        batteryLevel: Int = -1
    ): Boolean {
        if (!initialized) return false
        return try {
            RustBridge.aethernetMeshPeerDiscovered(
                peerPubkey,
                radioAddr,
                radioType.ordinal,
                signalStrength,
                hasInternet,
                batteryLevel
            )
        } catch (e: Exception) {
            Log.e(TAG, "meshPeerDiscovered error", e)
            false
        }
    }

    fun meshPeerLost(peerPubkey: ByteArray): Boolean {
        if (!initialized) return false
        return try {
            RustBridge.aethernetMeshPeerLost(peerPubkey)
        } catch (e: Exception) {
            Log.e(TAG, "meshPeerLost error", e)
            false
        }
    }

    fun meshDataReceived(data: ByteArray): Boolean {
        if (!initialized) return false
        return try {
            RustBridge.aethernetMeshDataReceived(data)
        } catch (e: Exception) {
            Log.e(TAG, "meshDataReceived error", e)
            false
        }
    }

    fun meshTakeOutbound(): List<MeshOutbound> {
        if (!initialized) return emptyList()
        return try {
            val json = RustBridge.aethernetMeshTakeOutbound() ?: return emptyList()
            parseMeshOutbound(json)
        } catch (e: Exception) {
            Log.e(TAG, "meshTakeOutbound error", e)
            emptyList()
        }
    }

    // ── Crisis / Solidarity / Status ─────────────────────────────────────

    fun activateCrisis(trigger: CrisisTrigger = CrisisTrigger.MANUAL): Boolean {
        return try {
            RustBridge.aethernetActivateCrisis(trigger.ordinal)
        } catch (e: Exception) {
            Log.e(TAG, "Crisis activation error", e)
            false
        }
    }

    fun deactivateCrisis(): Boolean {
        return try {
            RustBridge.aethernetDeactivateCrisis()
        } catch (e: Exception) {
            Log.e(TAG, "Crisis deactivation error", e)
            false
        }
    }

    fun isCrisisActive(): Boolean {
        return try {
            RustBridge.aethernetIsCrisisActive()
        } catch (e: Exception) {
            false
        }
    }

    fun enableSolidarity(): Boolean {
        return try {
            RustBridge.aethernetEnableSolidarity()
        } catch (e: Exception) {
            Log.e(TAG, "Solidarity enable error", e)
            false
        }
    }

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

    fun pendingCount(): Int {
        return try {
            RustBridge.aethernetPendingCount()
        } catch (e: Exception) {
            0
        }
    }

    fun trustScore(peerPubkey: ByteArray): Int {
        return try {
            RustBridge.aethernetTrustScore(peerPubkey)
        } catch (e: Exception) {
            0
        }
    }

    // ── Persistence ──────────────────────────────────────────────────────

    private fun persistState() {
        try {
            val json = RustBridge.aethernetPersist() ?: return
            val obj = JSONObject(json)
            val editor = prefs.edit()
            if (!obj.isNull("store_forward")) {
                editor.putString(PREF_STORE_FORWARD, obj.getString("store_forward"))
            }
            if (!obj.isNull("trust_map")) {
                editor.putString(PREF_TRUST_MAP, obj.getString("trust_map"))
            }
            editor.apply()
            Log.d(TAG, "State persisted")
        } catch (e: Exception) {
            Log.e(TAG, "Persist error", e)
        }
    }

    private fun restoreState() {
        try {
            val sfB64 = prefs.getString(PREF_STORE_FORWARD, null)
            val tmB64 = prefs.getString(PREF_TRUST_MAP, null)

            val sfData = sfB64?.let { Base64.decode(it, Base64.DEFAULT) }
            val tmData = tmB64?.let { Base64.decode(it, Base64.DEFAULT) }

            if (sfData != null || tmData != null) {
                RustBridge.aethernetRestore(sfData, tmData)
                Log.i(TAG, "State restored")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Restore error", e)
        }
    }

    // ── Background Loops ─────────────────────────────────────────────────

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

    private fun startPersistLoop() {
        persistJob?.cancel()
        persistJob = scope.launch {
            while (isActive) {
                delay(PERSIST_INTERVAL_MS)
                persistState()
            }
        }
    }

    private fun startReceiveLoop() {
        receiveJob?.cancel()
        receiveJob = scope.launch {
            while (isActive) {
                delay(5_000L)
                try {
                    val envelopes = receive(50)
                    for (env in envelopes) {
                        messageListener?.onMessageReceived(
                            env.id,
                            env.senderPubkey,
                            env.payload,
                            env.priority,
                            env.timestamp
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Receive loop error", e)
                }
            }
        }
    }

    // ── Parsing ──────────────────────────────────────────────────────────

    private fun parseEnvelopes(json: String): List<AetherNetEnvelope> {
        val result = mutableListOf<AetherNetEnvelope>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                result.add(
                    AetherNetEnvelope(
                        id = obj.getString("id"),
                        senderPubkey = hexToBytes(obj.getString("sender")),
                        recipientPubkey = hexToBytes(obj.getString("recipient")),
                        payload = Base64.decode(obj.getString("payload"), Base64.DEFAULT),
                        priority = obj.getInt("priority"),
                        timestamp = obj.getLong("timestamp"),
                        hopCount = obj.optInt("hop_count", 0),
                    )
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Parse envelopes error", e)
        }
        return result
    }

    private fun parseMeshOutbound(json: String): List<MeshOutbound> {
        val result = mutableListOf<MeshOutbound>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val data = Base64.decode(obj.getString("data"), Base64.DEFAULT)
                val target = if (obj.isNull("target")) null else hexToBytes(obj.getString("target"))
                result.add(MeshOutbound(data, target))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Parse mesh outbound error", e)
        }
        return result
    }

    private fun hexToBytes(hex: String): ByteArray {
        val len = hex.length
        val data = ByteArray(len / 2)
        for (i in 0 until len step 2) {
            data[i / 2] = ((Character.digit(hex[i], 16) shl 4) + Character.digit(hex[i + 1], 16)).toByte()
        }
        return data
    }

    // ── Data Classes ─────────────────────────────────────────────────────

    enum class CrisisTrigger {
        MANUAL,
        NETWORK_TAMPERING,
        TRAFFIC_ANALYSIS,
    }

    enum class MeshRadioType {
        BLE,
        WIFI_DIRECT,
        LORA,
    }

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

    data class AetherNetEnvelope(
        val id: String,
        val senderPubkey: ByteArray,
        val recipientPubkey: ByteArray,
        val payload: ByteArray,
        val priority: Int,
        val timestamp: Long,
        val hopCount: Int,
    )

    data class MeshOutbound(
        val data: ByteArray,
        val target: ByteArray?,
    )
}
