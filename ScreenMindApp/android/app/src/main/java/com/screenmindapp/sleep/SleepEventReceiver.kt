package com.screenmindapp.sleep

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.BatteryManager

class SleepEventReceiver(
    private val reactContext: com.facebook.react.bridge.ReactApplicationContext
) : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val module = SleepEventModule.instance ?: return
        val ts = System.currentTimeMillis()

        when (intent.action) {
            Intent.ACTION_USER_PRESENT -> {
                module.sendEvent("SLEEP_UNLOCK", mapOf("ts" to ts))
            }
            Intent.ACTION_SCREEN_ON -> {
                module.sendEvent("SLEEP_SCREEN_ON", mapOf("ts" to ts))
            }
            Intent.ACTION_SCREEN_OFF -> {
                module.sendEvent("SLEEP_SCREEN_OFF", mapOf("ts" to ts))
            }
            Intent.ACTION_POWER_CONNECTED -> {
                // Get battery level at charge start
                val batteryLevel = getBatteryLevel(context)
                module.sendEvent("SLEEP_CHARGING_START", mapOf(
                    "ts" to ts,
                    "batteryLevel" to batteryLevel,
                    "isLikelyBedtime" to isLikelyBedtime()
                ))
            }
            Intent.ACTION_POWER_DISCONNECTED -> {
                val batteryLevel = getBatteryLevel(context)
                module.sendEvent("SLEEP_CHARGING_STOP", mapOf(
                    "ts" to ts,
                    "batteryLevel" to batteryLevel,
                    "isLikelyWakeTime" to isLikelyWakeTime()
                ))
            }
        }
    }

    private fun getBatteryLevel(context: Context): Int {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }

    private fun isLikelyBedtime(): Boolean {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return hour >= 21 || hour < 2  // 9PM - 2AM
    }

    private fun isLikelyWakeTime(): Boolean {
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        return hour in 5..10  // 5AM - 10AM
    }
}