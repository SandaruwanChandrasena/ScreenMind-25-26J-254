package com.screenmindapp.isolation

import android.content.Context
import android.net.wifi.WifiManager
import com.facebook.react.bridge.*

class WifiMetricsModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "WifiMetricsBridge"

    @ReactMethod
    fun getWifiNetworkCount(promise: Promise) {
        try {
            val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            // Gets the most recent list of available Wi-Fi networks
            val scanResults = wifiManager.scanResults
            
            // Count unique network names (SSIDs)
            val uniqueNetworks = scanResults.map { it.SSID }.filter { it.isNotEmpty() }.distinct()
            
            promise.resolve(uniqueNetworks.size)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Missing Location or WiFi permissions", e)
        } catch (e: Exception) {
            promise.reject("WIFI_ERROR", e.message, e)
        }
    }
}