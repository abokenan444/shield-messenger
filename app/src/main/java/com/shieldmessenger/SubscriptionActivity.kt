package com.shieldmessenger

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.TextView
import com.shieldmessenger.services.SubscriptionManager
import com.shieldmessenger.utils.ThemedToast

class SubscriptionActivity : BaseActivity(), SubscriptionManager.SubscriptionCallback {

    private lateinit var subscriptionManager: SubscriptionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_subscription)

        subscriptionManager = SubscriptionManager.getInstance(this)
        subscriptionManager.setCallback(this)
        subscriptionManager.initialize {
            runOnUiThread { updateUI() }
        }

        setupClickListeners()
        updateUI()
    }

    private fun setupClickListeners() {
        findViewById<View>(R.id.backButton).setOnClickListener { finish() }

        findViewById<View>(R.id.subscribeButton).setOnClickListener {
            val currentTier = subscriptionManager.getCurrentTier()
            if (currentTier == SubscriptionManager.TIER_SUPPORTER) {
                ThemedToast.show(this, "You're already a Supporter!")
                return@setOnClickListener
            }
            subscriptionManager.launchSupporterPurchase(this, this)
        }

        findViewById<View>(R.id.contactButton).setOnClickListener {
            val intent = Intent(Intent.ACTION_SENDTO).apply {
                data = Uri.parse("mailto:enterprise@shieldmessenger.com")
                putExtra(Intent.EXTRA_SUBJECT, "Shield Messenger Enterprise Inquiry")
            }
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
            } else {
                ThemedToast.show(this, "No email app found")
            }
        }
    }

    private fun updateUI() {
        val currentTier = subscriptionManager.getCurrentTier()
        val planLabel = findViewById<TextView>(R.id.currentPlanLabel)
        val subscribeButton = findViewById<TextView>(R.id.subscribeButton)
        val priceLabel = findViewById<TextView>(R.id.supporterPrice)

        when (currentTier) {
            SubscriptionManager.TIER_FREE -> {
                planLabel.text = "Current Plan: Free"
                subscribeButton.text = "Subscribe"
                subscribeButton.isEnabled = true
            }
            SubscriptionManager.TIER_SUPPORTER -> {
                planLabel.text = "Current Plan: Supporter ✓"
                subscribeButton.text = "Subscribed"
                subscribeButton.isEnabled = false
            }
            SubscriptionManager.TIER_ENTERPRISE -> {
                planLabel.text = "Current Plan: Enterprise ✓"
                subscribeButton.text = "Subscribed"
                subscribeButton.isEnabled = false
            }
        }

        // Update price from Play Store if available
        val price = subscriptionManager.getSupporterPrice()
        priceLabel.text = "$price / month"
    }

    override fun onPurchaseComplete(tier: String) {
        runOnUiThread {
            ThemedToast.show(this, "Thank you for supporting Shield Messenger!")
            updateUI()
        }
    }

    override fun onPurchaseFailed(error: String) {
        runOnUiThread {
            ThemedToast.show(this, error)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        subscriptionManager.setCallback(null)
    }
}
