// SleepEventReceiver.kt
package com.screenmindapp.sleep

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import com.facebook.react.bridge.ReactApplicationContext

class SleepEventReceiver(
    private val reactContext: ReactApplicationContext
) : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val module = SleepEventModule.instance ?: return
        
        when (intent.action) {
            Intent.ACTION_USER_PRESENT -> {
                // Phone unlocked
                module.sendEvent("SLEEP_UNLOCK", 
                  mapOf("ts" to System.currentTimeMillis()))
            }
            Intent.ACTION_SCREEN_ON -> {
                // Screen turned on
                module.sendEvent("SLEEP_SCREEN_ON", 
                  mapOf("ts" to System.currentTimeMillis()))
            }
            Intent.ACTION_SCREEN_OFF -> {
                // Screen turned off
                module.sendEvent("SLEEP_SCREEN_OFF", 
                  mapOf("ts" to System.currentTimeMillis()))
            }
            Intent.ACTION_POWER_CONNECTED -> {
                // Phone plugged in to charge
                module.sendEvent("SLEEP_CHARGING_START", 
                  mapOf("ts" to System.currentTimeMillis()))
            }
            Intent.ACTION_POWER_DISCONNECTED -> {
                // Phone unplugged
                module.sendEvent("SLEEP_CHARGING_STOP", 
                  mapOf("ts" to System.currentTimeMillis()))
            }
        }
    }
}