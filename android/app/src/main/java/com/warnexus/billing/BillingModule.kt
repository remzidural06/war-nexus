package com.warnexus.billing

import android.app.Activity
import com.android.billingclient.api.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BillingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), PurchasesUpdatedListener {

    private var billingClient: BillingClient? = null
    private var productDetailsList: List<ProductDetails> = emptyList()

    override fun getName(): String = "BillingModule"

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun initConnection(promise: Promise) {
        billingClient = BillingClient.newBuilder(reactApplicationContext)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    promise.resolve(true)
                } else {
                    promise.reject("BILLING_ERROR", "Connection failed: ${billingResult.debugMessage}")
                }
            }

            override fun onBillingServiceDisconnected() {
                // Will retry on next call
            }
        })
    }

    @ReactMethod
    fun getProducts(skuList: ReadableArray, promise: Promise) {
        val productList = mutableListOf<QueryProductDetailsParams.Product>()
        for (i in 0 until skuList.size()) {
            productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(skuList.getString(i) ?: "")
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            )
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                this.productDetailsList = productDetailsList
                val result = Arguments.createArray()
                for (product in productDetailsList) {
                    val map = Arguments.createMap()
                    map.putString("productId", product.productId)
                    val offer = product.oneTimePurchaseOfferDetails
                    map.putString("price", offer?.formattedPrice ?: "?")
                    map.putString("priceAmountMicros", (offer?.priceAmountMicros ?: 0).toString())
                    map.putString("currency", offer?.priceCurrencyCode ?: "TRY")
                    result.pushMap(map)
                }
                promise.resolve(result)
            } else {
                promise.reject("PRODUCT_ERROR", "Failed to get products: ${billingResult.debugMessage}")
            }
        }
    }

    @ReactMethod
    fun purchase(productId: String, promise: Promise) {
        val activity: Activity? = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity")
            return
        }

        val productDetails = productDetailsList.find { it.productId == productId }
        if (productDetails == null) {
            promise.reject("PRODUCT_NOT_FOUND", "Product $productId not found. Call getProducts first.")
            return
        }

        val productDetailsParamsList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .build()
        )

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build()

        val result = billingClient?.launchBillingFlow(activity, billingFlowParams)
        if (result?.responseCode == BillingClient.BillingResponseCode.OK) {
            promise.resolve(true)
        } else {
            promise.reject("PURCHASE_ERROR", "Failed to launch billing flow: ${result?.debugMessage}")
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handlePurchase(purchase)
            }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            val params = Arguments.createMap()
            params.putString("error", "USER_CANCELED")
            sendEvent("onPurchaseError", params)
        } else {
            val params = Arguments.createMap()
            params.putString("error", billingResult.debugMessage ?: "Unknown error")
            sendEvent("onPurchaseError", params)
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        // Consume the purchase (consumable product — gold)
        val consumeParams = ConsumeParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        billingClient?.consumeAsync(consumeParams) { billingResult, _ ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                // Send success event to JS
                val params = Arguments.createMap()
                params.putString("productId", purchase.products.firstOrNull() ?: "")
                params.putString("purchaseToken", purchase.purchaseToken)
                params.putString("transactionId", purchase.orderId ?: "")
                sendEvent("onPurchaseSuccess", params)
            }
        }
    }

    @ReactMethod
    fun endConnection(promise: Promise) {
        billingClient?.endConnection()
        billingClient = null
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) { /* Required for RN event emitter */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* Required for RN event emitter */ }
}
