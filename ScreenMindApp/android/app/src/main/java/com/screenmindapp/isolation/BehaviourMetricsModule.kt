package com.screenmindapp.isolation

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

import java.util.Calendar

class BehaviourMetricsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BehaviourMetrics"

  // ---- Public API (JS can call) ----

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    promise.resolve(checkUsageAccess())
  }

  @ReactMethod
  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  /**
   * Returns:
   * - unlockCountToday
   * - totalScreenTimeMinutesToday
   * - nightUsageMinutes (00:00-05:00)
   * - socialMinutesToday
   * - socialPercentToday (0..100)
   */
  @ReactMethod
  fun getTodayBehaviourStats(promise: Promise) {
    try {
      if (!checkUsageAccess()) {
        promise.reject("NO_USAGE_ACCESS", "Usage Access permission not granted")
        return
      }

      val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val now = System.currentTimeMillis()
      val startOfDay = startOfTodayMillis()
      val startNight = startOfNightMillis()      // today 00:00
      val endNight = endOfNightMillis()          // today 05:00

      val totalToday = computeForegroundTime(usm, startOfDay, now)
      val night = computeForegroundTime(usm, startNight, minOf(endNight, now))

      val unlockCount = computeUnlockCount(usm, startOfDay, now)

      val socialPackages = setOf(
        "com.whatsapp",
        "com.instagram.android",
        "com.facebook.katana",
        "com.facebook.orca",
        "org.telegram.messenger",
        "com.snapchat.android",
        "com.twitter.android",
        "com.linkedin.android",
        "com.google.android.youtube",
        "com.zhiliaoapp.musically"
      )

      val socialMs = totalToday.perPackageMs
        .filter { socialPackages.contains(it.key) }
        .values.sum()

      val totalMs = totalToday.totalMs
      val totalMinutes = (totalMs / 60000).toInt()
      val socialMinutes = (socialMs / 60000).toInt()
      val nightMinutes = (night.totalMs / 60000).toInt()

      val socialPercent =
        if (totalMs <= 0) 0 else ((socialMs.toDouble() / totalMs.toDouble()) * 100.0).toInt()

      val map: WritableMap = Arguments.createMap().apply {
        putInt("unlockCountToday", unlockCount)
        putInt("totalScreenTimeMinutesToday", totalMinutes)
        putInt("nightUsageMinutes", nightMinutes)
        putInt("socialMinutesToday", socialMinutes)
        putInt("socialPercentToday", socialPercent)
      }

      promise.resolve(map)

    } catch (e: Exception) {
      promise.reject("ERR_BEHAVIOUR_STATS", e.message, e)
    }
  }

  // ---- Helpers ----

  private fun checkUsageAccess(): Boolean {
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
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private data class ForegroundResult(
    val totalMs: Long,
    val perPackageMs: Map<String, Long>
  )

  /**
   * Foreground time in [from..to] using ACTIVITY_RESUMED/PAUSED events.
   * This is the standard way to estimate "screen time".
   */
  private fun computeForegroundTime(
    usm: UsageStatsManager,
    from: Long,
    to: Long
  ): ForegroundResult {

    val usageEvents: UsageEvents = usm.queryEvents(from, to)
    val event = UsageEvents.Event()

    var currentPkg: String? = null
    var lastResumeTs: Long = 0

    var totalMs = 0L
    val perPkg = mutableMapOf<String, Long>()

    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)

      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          // close previous session (if any)
          if (currentPkg != null && lastResumeTs > 0) {
            val delta = (event.timeStamp - lastResumeTs).coerceAtLeast(0)
            totalMs += delta
            perPkg[currentPkg!!] = (perPkg[currentPkg!!] ?: 0L) + delta
          }
          currentPkg = event.packageName
          lastResumeTs = event.timeStamp
        }

        UsageEvents.Event.ACTIVITY_PAUSED -> {
          if (currentPkg != null && lastResumeTs > 0 && event.packageName == currentPkg) {
            val delta = (event.timeStamp - lastResumeTs).coerceAtLeast(0)
            totalMs += delta
            perPkg[currentPkg!!] = (perPkg[currentPkg!!] ?: 0L) + delta
            currentPkg = null
            lastResumeTs = 0
          }
        }
      }
    }

    // close last open session at end time
    if (currentPkg != null && lastResumeTs > 0) {
      val delta = (to - lastResumeTs).coerceAtLeast(0)
      totalMs += delta
      perPkg[currentPkg!!] = (perPkg[currentPkg!!] ?: 0L) + delta
    }

    return ForegroundResult(totalMs, perPkg)
  }

  /**
   * Unlock count approximation:
   * Count SCREEN_INTERACTIVE events (screen turned on / user interacted).
   * Works well as "unlock-ish" metric.
   */
  private fun computeUnlockCount(usm: UsageStatsManager, from: Long, to: Long): Int {
    val usageEvents = usm.queryEvents(from, to)
    val event = UsageEvents.Event()
    var count = 0

    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.SCREEN_INTERACTIVE) {
        count++
      }
    }
    return count
  }

  private fun startOfTodayMillis(): Long {
    val cal = Calendar.getInstance()
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }

  private fun startOfNightMillis(): Long {
    // today 00:00
    return startOfTodayMillis()
  }

  private fun endOfNightMillis(): Long {
    val cal = Calendar.getInstance()
    cal.set(Calendar.HOUR_OF_DAY, 5)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }
}
