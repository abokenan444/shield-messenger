package com.shieldmessenger

import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.TextPaint
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.securelegion.crypto.KeyManager

/**
 * Welcome screen for new users (no wallet exists)
 * Provides options to create a new account or import an existing one
 *
 * Security: This activity is separate from LockActivity to maintain
 * clear separation between authentication and onboarding flows
 */
class WelcomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if account already exists BEFORE showing any UI
        // This handles the case where CreateAccountActivity crashed mid-setup
        // but the wallet was already initialized
        try {
            val keyManager = KeyManager.getInstance(this)
            if (keyManager.isInitialized()) {
                Log.i("WelcomeActivity", "Account already exists - redirecting to LockActivity")
                val intent = Intent(this, LockActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
                return
            }
        } catch (e: Exception) {
            Log.e("WelcomeActivity", "Error checking account status", e)
        }

        // Security: Prevent screenshots and screen recording
        // TODO: Re-enable FLAG_SECURE after demo recording
        // window.setFlags(
        // WindowManager.LayoutParams.FLAG_SECURE,
        // WindowManager.LayoutParams.FLAG_SECURE
        // )

        // Make status bar black to match app theme
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.statusBarColor = Color.BLACK
        }

        setContentView(R.layout.activity_welcome)

        setupClickListeners()
        setupImportText()
    }

    private fun setupClickListeners() {
        findViewById<View>(R.id.newAccountButton).setOnClickListener {
            Log.d("WelcomeActivity", "User selected 'Create New Account'")
            val intent = Intent(this, CreateAccountActivity::class.java)
            startActivity(intent)
        }
    }

    private fun setupImportText() {
        val importTextView = findViewById<TextView>(R.id.importText)
        val fullText = "Already have an account? Import"
        val spannableString = SpannableString(fullText)

        // Find the "Import" part and make it clickable
        val importStartIndex = fullText.indexOf("Import")
        if (importStartIndex != -1) {
            val clickableSpan = object : ClickableSpan() {
                override fun onClick(widget: View) {
                    Log.d("WelcomeActivity", "User selected 'Import'")
                    val intent = Intent(this@WelcomeActivity, RestoreAccountActivity::class.java)
                    startActivity(intent)
                }

                override fun updateDrawState(ds: TextPaint) {
                    super.updateDrawState(ds)
                    ds.color = Color.parseColor("#FFFFFF") // White color for "Import"
                    ds.isUnderlineText = false
                }
            }

            spannableString.setSpan(
                clickableSpan,
                importStartIndex,
                fullText.length,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }

        // Set the color for the first part
        importTextView.text = spannableString
        importTextView.setTextColor(Color.parseColor("#666666")) // Gray for main text
        importTextView.movementMethod = LinkMovementMethod.getInstance()
        importTextView.highlightColor = Color.TRANSPARENT // Remove highlight on click
    }
}
