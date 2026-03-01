package com.shieldmessenger

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.shieldmessenger.services.BackupManager
import com.shieldmessenger.services.SubscriptionManager
import com.shieldmessenger.utils.ThemedToast
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BackupActivity : BaseActivity() {

    private lateinit var progressSection: LinearLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var progressTitle: TextView
    private lateinit var progressStatus: TextView
    private lateinit var lastBackupCard: LinearLayout
    private lateinit var lastBackupDate: TextView
    private lateinit var createBackupButton: LinearLayout
    private lateinit var restoreBackupButton: LinearLayout

    private val backupManager by lazy { BackupManager(this) }
    private var isOperationInProgress = false

    private val createBackupLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/octet-stream")
    ) { uri ->
        if (uri != null) {
            startBackup(uri)
        }
    }

    private val restoreBackupLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            confirmRestore(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_backup)

        initViews()
        setupClickListeners()
        loadLastBackupInfo()
    }

    private fun initViews() {
        progressSection = findViewById(R.id.progressSection)
        progressBar = findViewById(R.id.progressBar)
        progressTitle = findViewById(R.id.progressTitle)
        progressStatus = findViewById(R.id.progressStatus)
        lastBackupCard = findViewById(R.id.lastBackupCard)
        lastBackupDate = findViewById(R.id.lastBackupDate)
        createBackupButton = findViewById(R.id.createBackupButton)
        restoreBackupButton = findViewById(R.id.restoreBackupButton)
    }

    private fun setupClickListeners() {
        findViewById<View>(R.id.backButton).setOnClickListener { finish() }

        createBackupButton.setOnClickListener {
            if (isOperationInProgress) return@setOnClickListener
            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            createBackupLauncher.launch("shield_backup_$timestamp.smb")
        }

        restoreBackupButton.setOnClickListener {
            if (isOperationInProgress) return@setOnClickListener
            restoreBackupLauncher.launch(arrayOf("application/octet-stream", "*/*"))
        }
    }

    private fun loadLastBackupInfo() {
        val prefs = getSharedPreferences("backup_prefs", MODE_PRIVATE)
        val lastBackup = prefs.getLong("last_backup_timestamp", 0)
        if (lastBackup > 0) {
            lastBackupCard.visibility = View.VISIBLE
            lastBackupDate.text = SimpleDateFormat("MMM dd, yyyy 'at' HH:mm", Locale.US).format(Date(lastBackup))
        }
    }

    private fun startBackup(uri: Uri) {
        isOperationInProgress = true
        showProgress("Creating backup...")
        setButtonsEnabled(false)

        lifecycleScope.launch {
            backupManager.createBackup(uri, object : BackupManager.BackupCallback {
                override fun onProgress(percent: Int, status: String) {
                    runOnUiThread {
                        progressBar.progress = percent
                        progressStatus.text = status
                    }
                }

                override fun onComplete(success: Boolean, message: String) {
                    runOnUiThread {
                        isOperationInProgress = false
                        hideProgress()
                        setButtonsEnabled(true)

                        if (success) {
                            getSharedPreferences("backup_prefs", MODE_PRIVATE)
                                .edit()
                                .putLong("last_backup_timestamp", System.currentTimeMillis())
                                .apply()
                            loadLastBackupInfo()
                            ThemedToast.show(this@BackupActivity, message)
                        } else {
                            ThemedToast.show(this@BackupActivity, message)
                        }
                    }
                }
            })
        }
    }

    private fun confirmRestore(uri: Uri) {
        AlertDialog.Builder(this)
            .setTitle("Restore Backup")
            .setMessage("This will import contacts and messages from the backup file. Existing data will not be deleted — only new contacts and messages will be added.\n\nContinue?")
            .setPositiveButton("Restore") { _, _ -> startRestore(uri) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun startRestore(uri: Uri) {
        isOperationInProgress = true
        showProgress("Restoring backup...")
        progressTitle.text = "Restoring backup..."
        setButtonsEnabled(false)

        lifecycleScope.launch {
            backupManager.restoreBackup(uri, object : BackupManager.BackupCallback {
                override fun onProgress(percent: Int, status: String) {
                    runOnUiThread {
                        progressBar.progress = percent
                        progressStatus.text = status
                    }
                }

                override fun onComplete(success: Boolean, message: String) {
                    runOnUiThread {
                        isOperationInProgress = false
                        hideProgress()
                        setButtonsEnabled(true)
                        ThemedToast.show(this@BackupActivity, message)
                    }
                }
            })
        }
    }

    private fun showProgress(title: String) {
        progressSection.visibility = View.VISIBLE
        progressTitle.text = title
        progressBar.progress = 0
        progressStatus.text = "Preparing..."
    }

    private fun hideProgress() {
        progressSection.visibility = View.GONE
    }

    private fun setButtonsEnabled(enabled: Boolean) {
        createBackupButton.alpha = if (enabled) 1f else 0.5f
        restoreBackupButton.alpha = if (enabled) 1f else 0.5f
        createBackupButton.isClickable = enabled
        restoreBackupButton.isClickable = enabled
    }
}
