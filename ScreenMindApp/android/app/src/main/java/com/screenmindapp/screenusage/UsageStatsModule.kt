package com.screenmindapp.screenUsage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.*

class UsageStatsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UsageStatsModule"

  // ─────────────────────────────────────────────
  // Open Usage Access settings screen
  // ─────────────────────────────────────────────
  @ReactMethod
  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
    reactApplicationContext.startActivity(intent)
  }

  @ReactMethod
  fun openUsageSettings() {
    openUsageAccessSettings()
  }

  // ─────────────────────────────────────────────
  // Check if Usage Access permission is granted
  // ─────────────────────────────────────────────
  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    try {
      val appOps = reactApplicationContext
        .getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager

      val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        reactApplicationContext.packageName
      )

      promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  // ─────────────────────────────────────────────
  // Helper: get start of today (midnight) in ms
  // ─────────────────────────────────────────────
  private fun getStartOfDay(): Long {
    return java.util.Calendar.getInstance().apply {
      timeInMillis = System.currentTimeMillis()
      set(java.util.Calendar.HOUR_OF_DAY, 0)
      set(java.util.Calendar.MINUTE, 0)
      set(java.util.Calendar.SECOND, 0)
      set(java.util.Calendar.MILLISECOND, 0)
    }.timeInMillis
  }

  // ─────────────────────────────────────────────
  // Get usage stats for a given time range
  //
  // ✅ FIX: replaced queryUsageStats(INTERVAL_DAILY) with queryEvents()
  //
  // WHY: INTERVAL_DAILY uses Android's internal bucket boundaries, not
  // your requested start/end times. This causes it to include data from
  // yesterday or return wrong totals — exactly what Digital Wellbeing
  // does NOT do. queryEvents() processes raw ACTIVITY_RESUMED /
  // ACTIVITY_PAUSED events and sums only foreground time within your
  // exact requested window, matching Digital Wellbeing's calculation.
  //
  // JS calls: UsageStatsModule.getUsageStats(startMs, endMs)
  // ─────────────────────────────────────────────
  @ReactMethod
  fun getUsageStats(startTime: Double, endTime: Double, promise: Promise) {
    try {
      val usageStatsManager =
        reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val start = startTime.toLong()
      val end   = endTime.toLong()

      // Map of packageName → total foreground ms
      val foregroundTimeMap = HashMap<String, Long>()
      // Map of packageName → last RESUME timestamp (for open sessions)
      val resumeTimeMap     = HashMap<String, Long>()

      val usageEvents = usageStatsManager.queryEvents(start, end)
      val event       = UsageEvents.Event()

      while (usageEvents.hasNextEvent()) {
        usageEvents.getNextEvent(event)

        val pkg       = event.packageName ?: continue
        val timestamp = event.timeStamp

        when (event.eventType) {
          UsageEvents.Event.ACTIVITY_RESUMED -> {
            // Record when this app came to foreground
            resumeTimeMap[pkg] = timestamp
          }

          UsageEvents.Event.ACTIVITY_PAUSED,
          UsageEvents.Event.ACTIVITY_STOPPED -> {
            // Calculate session duration if we saw the resume
            val resumeTime = resumeTimeMap.remove(pkg)
            if (resumeTime != null && timestamp > resumeTime) {
              val duration = timestamp - resumeTime
              foregroundTimeMap[pkg] = (foregroundTimeMap[pkg] ?: 0L) + duration
            }
          }
        }
      }

      // Close any sessions still open at query end (app still in foreground)
      for ((pkg, resumeTime) in resumeTimeMap) {
        if (end > resumeTime) {
          val duration = end - resumeTime
          foregroundTimeMap[pkg] = (foregroundTimeMap[pkg] ?: 0L) + duration
        }
      }

      // Build result array
      val resultArray = Arguments.createArray()
      for ((pkg, totalMs) in foregroundTimeMap) {
        if (totalMs > 0) {
          val obj = Arguments.createMap()
          obj.putString("packageName", pkg)
          obj.putDouble("totalTimeInForeground", totalMs.toDouble())
          resultArray.pushMap(obj)
        }
      }

      promise.resolve(resultArray)

    } catch (e: Exception) {
      promise.reject("USAGE_STATS_ERROR", e.message, e)
    }
  }

  // ─────────────────────────────────────────────
  // Get number of device unlocks today
  // Counts KEYGUARD_HIDDEN events since midnight
  // JS calls: UsageStatsModule.getUnlockCount()
  // ─────────────────────────────────────────────
  @ReactMethod
  fun getUnlockCount(promise: Promise) {
    try {
      val usageStatsManager =
        reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val now        = System.currentTimeMillis()
      val startOfDay = getStartOfDay()

      val usageEvents = usageStatsManager.queryEvents(startOfDay, now)
      val event       = UsageEvents.Event()
      var unlockCount = 0

      while (usageEvents.hasNextEvent()) {
        usageEvents.getNextEvent(event)
        if (event.eventType == UsageEvents.Event.KEYGUARD_HIDDEN) {
          unlockCount++
        }
      }

      promise.resolve(unlockCount)
    } catch (e: Exception) {
      promise.resolve(0)
    }
  }
}