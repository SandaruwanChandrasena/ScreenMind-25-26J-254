package com.screenmindapp.screenUsage

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.*

class UsageStatsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UsageStatsModule"

  @ReactMethod
  fun openUsageSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
    reactApplicationContext.startActivity(intent)
  }

  @ReactMethod
  fun getUsageStats(promise: Promise) {
    try {
      val usageStatsManager =
        reactApplicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

      val endTime = System.currentTimeMillis()
      val startTime = endTime - (24 * 60 * 60 * 1000) // last 24 hours

      val stats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
      )

      val resultArray = Arguments.createArray()

      stats?.forEach { s ->
        val obj = Arguments.createMap()
        obj.putString("packageName", s.packageName)
        obj.putDouble("totalTimeInForeground", s.totalTimeInForeground.toDouble())
        obj.putDouble("lastTimeUsed", s.lastTimeUsed.toDouble())
        resultArray.pushMap(obj)
      }

      promise.resolve(resultArray)
    } catch (e: Exception) {
      promise.reject("USAGE_STATS_ERROR", e.message, e)
    }
  }
}