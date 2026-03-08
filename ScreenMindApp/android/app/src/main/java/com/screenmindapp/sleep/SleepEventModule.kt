// SleepEventModule.kt
package com.screenmindapp.sleep

import android.content.IntentFilter
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SleepEventModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        var instance: SleepEventModule? = null
    }

    private var receiver: SleepEventReceiver? = null

    override fun getName() = "SleepEventModule"

    init {
        instance = this
    }

    @ReactMethod
    fun startListening() {
        if (receiver != null) return

        receiver = SleepEventReceiver(reactContext)
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_USER_PRESENT)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_POWER_CONNECTED)
            addAction(Intent.ACTION_POWER_DISCONNECTED)
        }
        reactContext.registerReceiver(receiver, filter)
        sendEvent("SLEEP_LISTENING_STARTED", 
          mapOf("ts" to System.currentTimeMillis()))
    }

    @ReactMethod
    fun stopListening() {
        receiver?.let {
            reactContext.unregisterReceiver(it)
            receiver = null
        }
    }

    @ReactMethod
    fun sendLocalNotification(title: String, message: String) {
        val notificationManager = reactContext
            .getSystemService(android.content.Context.NOTIFICATION_SERVICE)
                as android.app.NotificationManager

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                "sleep_warnings",
                "Sleep Warnings",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val pendingIntent = android.app.PendingIntent.getActivity(
            reactContext,
            0,
            reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName),
            android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val notification = androidx.core.app.NotificationCompat
            .Builder(reactContext, "sleep_warnings")
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(2001, notification)
    }

    fun sendEvent(eventName: String, params: Map<String, Any>) {
        val map = Arguments.createMap()
        params.forEach { (k, v) ->
            when (v) {
                is Long -> map.putDouble(k, v.toDouble())
                is Int -> map.putInt(k, v)
                is String -> map.putString(k, v)
                is Boolean -> map.putBoolean(k, v)
            }
        }
        reactContext
            .getJSModule(
              DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
            )
            .emit(eventName, map)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}