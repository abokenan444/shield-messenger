package com.shieldmessenger.viewmodels

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.shieldmessenger.crypto.TorManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Shared ViewModel for Tor connection status.
 *
 * Provides a single source of truth for Tor status across all Activities
 * and Fragments. This eliminates the need for each Activity to independently
 * poll TorManager and reduces redundant status checks.
 *
 * Usage:
 *   val torViewModel: TorStatusViewModel by viewModels()
 *   torViewModel.status.observe(this) { status -> updateUI(status) }
 */
class TorStatusViewModel(application: Application) : AndroidViewModel(application) {

    companion object {
        private const val TAG = "TorStatusVM"
        private const val STATUS_POLL_INTERVAL_MS = 3000L
    }

    // ─── Observable State ───

    private val _status = MutableLiveData(TorStatus.DISCONNECTED)
    val status: LiveData<TorStatus> = _status

    private val _bootstrapProgress = MutableLiveData(0)
    val bootstrapProgress: LiveData<Int> = _bootstrapProgress

    private val _onionAddress = MutableLiveData<String?>(null)
    val onionAddress: LiveData<String?> = _onionAddress

    private val _circuitCount = MutableLiveData(0)
    val circuitCount: LiveData<Int> = _circuitCount

    private val _bandwidthUp = MutableLiveData(0L)
    val bandwidthUp: LiveData<Long> = _bandwidthUp

    private val _bandwidthDown = MutableLiveData(0L)
    val bandwidthDown: LiveData<Long> = _bandwidthDown

    private val _isUsingBridges = MutableLiveData(false)
    val isUsingBridges: LiveData<Boolean> = _isUsingBridges

    // ─── Status Polling ───

    init {
        startStatusPolling()
    }

    private fun startStatusPolling() {
        viewModelScope.launch {
            while (isActive) {
                updateStatus()
                delay(STATUS_POLL_INTERVAL_MS)
            }
        }
    }

    private suspend fun updateStatus() {
        try {
            withContext(Dispatchers.IO) {
                val torManager = TorManager.getInstance(getApplication())

                val isConnected = torManager.isConnected()
                val isBootstrapping = torManager.isBootstrapping()
                val progress = torManager.getBootstrapProgress()

                val newStatus = when {
                    isConnected && progress >= 100 -> TorStatus.CONNECTED
                    isBootstrapping -> TorStatus.BOOTSTRAPPING
                    else -> TorStatus.DISCONNECTED
                }

                _status.postValue(newStatus)
                _bootstrapProgress.postValue(progress)

                if (isConnected) {
                    _onionAddress.postValue(torManager.getOnionAddress())
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating Tor status", e)
            _status.postValue(TorStatus.ERROR)
        }
    }

    /**
     * Request Tor restart (e.g., after bridge configuration change).
     */
    fun restartTor() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                _status.postValue(TorStatus.RESTARTING)
                val torManager = TorManager.getInstance(getApplication())
                torManager.restart()
                Log.i(TAG, "Tor restart requested")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restart Tor", e)
                _status.postValue(TorStatus.ERROR)
            }
        }
    }

    /**
     * Request new Tor identity (new circuits).
     */
    fun newIdentity() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val torManager = TorManager.getInstance(getApplication())
                torManager.newIdentity()
                Log.i(TAG, "New Tor identity requested")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to get new identity", e)
            }
        }
    }

    // ─── Status Enum ───

    enum class TorStatus {
        DISCONNECTED,
        BOOTSTRAPPING,
        CONNECTED,
        RESTARTING,
        ERROR
    }
}
