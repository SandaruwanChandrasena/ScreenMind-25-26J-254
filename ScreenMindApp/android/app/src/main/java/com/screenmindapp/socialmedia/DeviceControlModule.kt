package com.screenmindapp.socialmedia

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceControlModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceControl"

    @ReactMethod
    fun lockScreen() {
        try {
            val dpm = reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE)
                    as DevicePolicyManager
            val adminComponent = ComponentName(
                reactContext,
                DeviceAdminReceiver::class.java
            )

            if (dpm.isAdminActive(adminComponent)) {
                // ✅ Admin already granted — lock immediately
                dpm.lockNow()
                Log.d("DeviceControl", "🔒 Screen locked successfully")
            } else {
                // ⚠️ Not granted — open Device Admin Apps page in Settings
                Log.w("DeviceControl", "⚠️ Admin not active — opening settings")
                val intent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            }
        } catch (e: Exception) {
            Log.e("DeviceControl", "❌ Lock error: ${e.message}")
        }
    }

    @ReactMethod
    fun requestAdminPermission() {
        try {
            val adminComponent = ComponentName(
                reactContext,
                DeviceAdminReceiver::class.java
            )
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "ScreenMind needs this permission to lock your screen when high emotional risk is detected."
                )
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            Log.d("DeviceControl", "📋 Device Admin permission requested")
        } catch (e: Exception) {
            Log.e("DeviceControl", "❌ Admin request error: ${e.message}")
        }
    }

    @ReactMethod
    fun silencePhone() {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE)
                    as AudioManager
            audioManager.ringerMode = AudioManager.RINGER_MODE_SILENT
            Log.d("DeviceControl", "🔕 Phone silenced successfully")
        } catch (e: Exception) {
            Log.e("DeviceControl", "❌ Silence error: ${e.message}")
        }
    }
}