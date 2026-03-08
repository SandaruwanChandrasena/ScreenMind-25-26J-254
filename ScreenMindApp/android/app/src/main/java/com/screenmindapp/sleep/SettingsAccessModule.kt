package com.screenmindapp.sleep

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

/**
 * Native module for checking and opening Android permission settings.
 * Used by SleepHomeScreen to verify Usage Stats, Notification Listener, and DND access.
 */
class SettingsAccessModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "SettingsAccess"

  /**
   * Check if app has Usage Stats permission (PACKAGE_USAGE_STATS)
   */
  @ReactMethod
  fun hasUsageStatsAccess(promise: Promise) {
    try {
      val hasAccess = checkUsageStatsAccess()
      promise.resolve(hasAccess)
    } catch (e: Exception) {
      promise.reject("USAGE_STATS_ERROR", "Error checking usage stats access: ${e.message}")
    }
  }

  /**
   * Check if app has Do Not Disturb (DND) access (ACCESS_NOTIFICATION_POLICY)
   */
  @ReactMethod
  fun hasDndAccess(promise: Promise) {
    try {
      val hasAccess = checkDndAccess()
      promise.resolve(hasAccess)
    } catch (e: Exception) {
      promise.reject("DND_ERROR", "Error checking DND access: ${e.message}")
    }
  }

  /**
   * Open Android Settings for Usage Stats (Usage Access)
   */
  @ReactMethod
  fun openUsageAccessSettings() {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  /**
   * Open Android Settings for Do Not Disturb access
   */
  @ReactMethod
  fun openDndAccessSettings() {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  // ─────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────

  /**
   * Check if PACKAGE_USAGE_STATS permission is granted
   * Uses AppOpsManager to verify the actual permission state
   */
  private fun checkUsageStatsAccess(): Boolean {
    return try {
      val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          reactContext.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          reactContext.packageName
        )
      }
      mode == AppOpsManager.MODE_ALLOWED
    } catch (e: Exception) {
      false
    }
  }

  /**
   * Check if ACCESS_NOTIFICATION_POLICY permission is granted (DND access)
   */
  private fun checkDndAccess(): Boolean {
    return try {
      val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE)
        as android.app.NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        notificationManager.isNotificationPolicyAccessGranted
      } else {
        false
      }
    } catch (e: Exception) {
      false
    }
  }
}
