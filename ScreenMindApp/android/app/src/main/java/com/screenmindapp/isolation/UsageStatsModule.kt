package com.screenmindapp.isolation

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.*

class UsageStatsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "UsageStatsBridge"

  @ReactMethod
  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun getScreenTimeLast24h(promise: Promise) {
    try {
      val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val end = System.currentTimeMillis()
      val start = end - 24L * 60L * 60L * 1000L

      val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
      var totalMs = 0L
      for (s in stats) totalMs += s.totalTimeInForeground

      promise.resolve(totalMs)
    } catch (e: Exception) {
      promise.reject("USAGE_ERR", e)
    }
  }
}
