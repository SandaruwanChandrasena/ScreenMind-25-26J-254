package com.screenmindapp.socialmedia

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OverlayModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "OverlayModule"

    // ── Check if permission is granted ──────────────────────────
    @ReactMethod
    fun hasPermission(callback: com.facebook.react.bridge.Callback) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(reactContext)
        } else true
        callback.invoke(granted)
    }

    // ── Open "Draw over other apps" settings page ───────────────
    @ReactMethod
    fun requestPermission() {
        try {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            Log.d("OverlayModule", "📋 Overlay permission settings opened")
        } catch (e: Exception) {
            Log.e("OverlayModule", "❌ Permission request error: ${e.message}")
        }
    }

    // ── Show overlay with risk score ─────────────────────────────
    @ReactMethod
    fun showOverlay(riskScore: Double) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                !Settings.canDrawOverlays(reactContext)) {
                Log.w("OverlayModule", "⚠️ No overlay permission — opening settings")
                requestPermission()
                return
            }
            val intent = Intent(reactContext, OverlayService::class.java).apply {
                action = OverlayService.ACTION_SHOW
                putExtra(OverlayService.EXTRA_RISK_SCORE, riskScore)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            Log.d("OverlayModule", "🚨 Overlay shown — risk: $riskScore")
        } catch (e: Exception) {
            Log.e("OverlayModule", "❌ Show overlay error: ${e.message}")
        }
    }

    // ── Hide overlay ─────────────────────────────────────────────
    @ReactMethod
    fun hideOverlay() {
        try {
            val intent = Intent(reactContext, OverlayService::class.java).apply {
                action = OverlayService.ACTION_HIDE
            }
            reactContext.startService(intent)
            Log.d("OverlayModule", "✅ Overlay hidden")
        } catch (e: Exception) {
            Log.e("OverlayModule", "❌ Hide overlay error: ${e.message}")
        }
    }
}