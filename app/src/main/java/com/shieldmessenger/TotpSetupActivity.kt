package com.shieldmessenger

import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.shieldmessenger.utils.ThemedToast
import com.shieldmessenger.utils.TotpHelper

class TotpSetupActivity : BaseActivity() {

    private var pendingSecret: ByteArray? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_totp_setup)

        findViewById<View>(R.id.backButton).setOnClickListener { finish() }

        if (TotpHelper.isEnabled(this)) {
            showEnabledSection()
        } else {
            showSetupSection()
        }
    }

    private fun showSetupSection() {
        findViewById<LinearLayout>(R.id.setupSection).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.enabledSection).visibility = View.GONE

        val secret = TotpHelper.generateSecret()
        pendingSecret = secret

        val base32Secret = TotpHelper.encodeBase32(secret)
        val otpAuthUri = TotpHelper.buildOtpAuthUri(secret, "user")

        // Show manual secret key
        val secretKeyText = findViewById<TextView>(R.id.secretKeyText)
        // Format in groups of 4 for readability
        secretKeyText.text = base32Secret.chunked(4).joinToString(" ")

        // Generate QR code
        generateQrCode(otpAuthUri)

        // Verify button
        findViewById<View>(R.id.verifyButton).setOnClickListener {
            val code = findViewById<EditText>(R.id.totpCodeInput).text.toString().trim()
            if (code.length != 6) {
                ThemedToast.show(this, "Enter a 6-digit code")
                return@setOnClickListener
            }

            val sec = pendingSecret
            if (sec == null) {
                ThemedToast.show(this, "Error: secret not found")
                return@setOnClickListener
            }

            if (TotpHelper.verifyCode(sec, code)) {
                TotpHelper.saveSecret(this, sec)
                ThemedToast.show(this, "Two-factor authentication enabled!")
                showEnabledSection()
            } else {
                ThemedToast.show(this, "Invalid code. Please try again.")
            }
        }
    }

    private fun showEnabledSection() {
        findViewById<LinearLayout>(R.id.setupSection).visibility = View.GONE
        findViewById<LinearLayout>(R.id.enabledSection).visibility = View.VISIBLE

        findViewById<View>(R.id.disableButton).setOnClickListener {
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Disable 2FA?")
                .setMessage("This will remove two-factor authentication from your account. You can re-enable it later.")
                .setPositiveButton("Disable") { _, _ ->
                    TotpHelper.disable(this)
                    ThemedToast.show(this, "Two-factor authentication disabled")
                    showSetupSection()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun generateQrCode(content: String) {
        try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, 512, 512)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
            findViewById<ImageView>(R.id.qrCodeImage).setImageBitmap(bitmap)
        } catch (e: Exception) {
            ThemedToast.show(this, "Failed to generate QR code")
        }
    }
}
