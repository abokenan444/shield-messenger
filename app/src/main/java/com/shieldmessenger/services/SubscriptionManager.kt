package com.shieldmessenger.services

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

/**
 * SubscriptionManager - Manages Google Play subscription tiers.
 *
 * Tiers:
 *   FREE     – default, no purchase needed
 *   SUPPORTER – $4.99/month (product id "supporter_monthly")
 *   ENTERPRISE – contact sales (not managed through Play)
 */
class SubscriptionManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "SubscriptionManager"
        const val PRODUCT_SUPPORTER_MONTHLY = "supporter_monthly"
        const val PREFS_NAME = "subscription_prefs"
        const val KEY_TIER = "current_tier"

        const val TIER_FREE = "free"
        const val TIER_SUPPORTER = "supporter"
        const val TIER_ENTERPRISE = "enterprise"

        @Volatile
        private var instance: SubscriptionManager? = null

        fun getInstance(context: Context): SubscriptionManager {
            return instance ?: synchronized(this) {
                instance ?: SubscriptionManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private var billingClient: BillingClient? = null
    private var supporterDetails: ProductDetails? = null

    interface SubscriptionCallback {
        fun onPurchaseComplete(tier: String)
        fun onPurchaseFailed(error: String)
    }

    fun getCurrentTier(): String {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TIER, TIER_FREE) ?: TIER_FREE
    }

    fun isSupporter(): Boolean = getCurrentTier() == TIER_SUPPORTER || getCurrentTier() == TIER_ENTERPRISE

    private fun saveTier(tier: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_TIER, tier).apply()
    }

    fun initialize(onReady: (() -> Unit)? = null) {
        billingClient = BillingClient.newBuilder(context)
            .setListener { billingResult, purchases ->
                handlePurchaseUpdate(billingResult, purchases)
            }
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .enablePrepaidPlans()
                    .build()
            )
            .build()

        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.i(TAG, "Billing client connected")
                    queryProducts()
                    queryExistingPurchases()
                    onReady?.invoke()
                } else {
                    Log.e(TAG, "Billing setup failed: ${billingResult.debugMessage}")
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected")
            }
        })
    }

    private fun queryProducts() {
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_SUPPORTER_MONTHLY)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                supporterDetails = productDetailsList.firstOrNull()
                Log.i(TAG, "Product details loaded: ${supporterDetails?.name}")
            } else {
                Log.e(TAG, "Failed to query products: ${billingResult.debugMessage}")
            }
        }
    }

    private fun queryExistingPurchases() {
        billingClient?.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        ) { billingResult, purchaseList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                val hasActive = purchaseList.any { purchase ->
                    purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                    purchase.products.contains(PRODUCT_SUPPORTER_MONTHLY)
                }
                if (hasActive) {
                    saveTier(TIER_SUPPORTER)
                    // Acknowledge any unacknowledged purchases
                    purchaseList.filter { !it.isAcknowledged }.forEach { acknowledgePurchase(it) }
                } else {
                    saveTier(TIER_FREE)
                }
                Log.i(TAG, "Current tier: ${getCurrentTier()}")
            }
        }
    }

    fun launchSupporterPurchase(activity: Activity, callback: SubscriptionCallback) {
        val details = supporterDetails
        if (details == null) {
            callback.onPurchaseFailed("Product not available yet. Please try again.")
            return
        }

        val offerToken = details.subscriptionOfferDetails?.firstOrNull()?.offerToken
        if (offerToken == null) {
            callback.onPurchaseFailed("No subscription offer available")
            return
        }

        val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .setOfferToken(offerToken)
            .build()

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParams))
            .build()

        val result = billingClient?.launchBillingFlow(activity, flowParams)
        if (result?.responseCode != BillingClient.BillingResponseCode.OK) {
            callback.onPurchaseFailed("Failed to launch billing: ${result?.debugMessage}")
        }
    }

    private var activeCallback: SubscriptionCallback? = null

    fun setCallback(callback: SubscriptionCallback?) {
        activeCallback = callback
    }

    private fun handlePurchaseUpdate(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                    if (purchase.products.contains(PRODUCT_SUPPORTER_MONTHLY)) {
                        saveTier(TIER_SUPPORTER)
                        acknowledgePurchase(purchase)
                        activeCallback?.onPurchaseComplete(TIER_SUPPORTER)
                    }
                }
            }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            activeCallback?.onPurchaseFailed("Purchase cancelled")
        } else {
            activeCallback?.onPurchaseFailed("Purchase failed: ${billingResult.debugMessage}")
        }
    }

    private fun acknowledgePurchase(purchase: Purchase) {
        if (purchase.isAcknowledged) return
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()
        billingClient?.acknowledgePurchase(params) { result ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.i(TAG, "Purchase acknowledged")
            }
        }
    }

    fun getSupporterPrice(): String {
        return supporterDetails?.subscriptionOfferDetails?.firstOrNull()
            ?.pricingPhases?.pricingPhaseList?.firstOrNull()
            ?.formattedPrice ?: "$4.99"
    }

    fun destroy() {
        billingClient?.endConnection()
        billingClient = null
    }
}
