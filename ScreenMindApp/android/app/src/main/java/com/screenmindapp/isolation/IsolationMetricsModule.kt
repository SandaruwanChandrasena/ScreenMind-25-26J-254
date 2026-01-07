package com.screenmindapp.isolation

import android.content.Context
import android.location.Location
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.*

class IsolationMetricsModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "IsolationMetricsBridge"

  @ReactMethod
  fun getGpsFeaturesToday(promise: Promise) {
    try {
      val prefs = ctx.getSharedPreferences("isolation_metrics", Context.MODE_PRIVATE)
      val today = DateKey.today()
      val key = "gps_$today"
      
      val jsonStr = prefs.getString(key, "[]") ?: "[]"
      val points = JSONArray(jsonStr)
      
      if (points.length() == 0) {
        // No GPS data today
        promise.resolve(createEmptyFeatures())
        return
      }

      // Extract features from GPS points
      val features = computeGpsFeatures(points)
      promise.resolve(features)
      
    } catch (e: Exception) {
      promise.reject("GPS_ERR", e)
    }
  }

  @ReactMethod
  fun getUnlockCountToday(promise: Promise) {
    try {
      val prefs = ctx.getSharedPreferences("isolation_metrics", Context.MODE_PRIVATE)
      val today = DateKey.today()
      val key = "unlock_$today"
      val count = prefs.getInt(key, 0)
      promise.resolve(count)
    } catch (e: Exception) {
      promise.reject("UNLOCK_ERR", e)
    }
  }

  private fun createEmptyFeatures(): WritableMap {
    val map = Arguments.createMap()
    map.putDouble("dailyDistanceMeters", 0.0)
    map.putDouble("timeAtHomePct", 0.0)
    map.putDouble("locationEntropy", 0.0)
    map.putInt("transitions", 0)
    map.putDouble("radiusOfGyration", 0.0)
    return map
  }

  private fun computeGpsFeatures(points: JSONArray): WritableMap {
    val locs = mutableListOf<LocPoint>()
    
    for (i in 0 until points.length()) {
      val obj = points.getJSONObject(i)
      locs.add(LocPoint(
        obj.getLong("t"),
        obj.getDouble("lat"),
        obj.getDouble("lng")
      ))
    }

    // Sort by timestamp
    locs.sortBy { it.timestamp }

    // Compute features
    val distance = computeTotalDistance(locs)
    val timeAtHome = computeTimeAtHome(locs)
    val entropy = computeLocationEntropy(locs)
    val transitions = computeTransitions(locs)
    val rog = computeRadiusOfGyration(locs)

    val map = Arguments.createMap()
    map.putDouble("dailyDistanceMeters", distance)
    map.putDouble("timeAtHomePct", timeAtHome)
    map.putDouble("locationEntropy", entropy)
    map.putInt("transitions", transitions)
    map.putDouble("radiusOfGyration", rog)
    
    return map
  }

  private fun computeTotalDistance(locs: List<LocPoint>): Double {
    var total = 0.0
    for (i in 1 until locs.size) {
      total += haversine(locs[i-1], locs[i])
    }
    return total
  }

  private fun computeTimeAtHome(locs: List<LocPoint>): Double {
    if (locs.isEmpty()) return 0.0
    
    // Define "home" as the most frequent location (simplified)
    // Or first location of the day (better: use clustering)
    val home = locs.first()
    val homeRadius = 100.0 // 100 meters
    
    var timeAtHome = 0L
    for (i in 1 until locs.size) {
      val dist = haversine(home, locs[i])
      if (dist <= homeRadius) {
        timeAtHome += (locs[i].timestamp - locs[i-1].timestamp)
      }
    }
    
    val totalTime = locs.last().timestamp - locs.first().timestamp
    if (totalTime == 0L) return 0.0
    
    return (timeAtHome.toDouble() / totalTime.toDouble()) * 100.0
  }

  private fun computeLocationEntropy(locs: List<LocPoint>): Double {
    if (locs.size < 2) return 0.0
    
    // Discretize locations into 100m grid cells
    val cells = locs.groupBy { 
      val gridLat = (it.lat * 1000).toInt()
      val gridLng = (it.lng * 1000).toInt()
      "$gridLat,$gridLng"
    }
    
    // Compute entropy
    val total = locs.size.toDouble()
    var entropy = 0.0
    
    for ((_, cellLocs) in cells) {
      val p = cellLocs.size / total
      if (p > 0) {
        entropy -= p * ln(p)
      }
    }
    
    return entropy
  }

  private fun computeTransitions(locs: List<LocPoint>): Int {
    if (locs.size < 2) return 0
    
    var transitions = 0
    val threshold = 50.0 // 50 meters to count as transition
    
    for (i in 1 until locs.size) {
      val dist = haversine(locs[i-1], locs[i])
      if (dist >= threshold) {
        transitions++
      }
    }
    
    return transitions
  }

  private fun computeRadiusOfGyration(locs: List<LocPoint>): Double {
    if (locs.isEmpty()) return 0.0
    
    // Find centroid
    val centerLat = locs.map { it.lat }.average()
    val centerLng = locs.map { it.lng }.average()
    val center = LocPoint(0, centerLat, centerLng)
    
    // Compute RoG
    val sumSqDist = locs.sumOf { 
      val d = haversine(center, it)
      d * d
    }
    
    return sqrt(sumSqDist / locs.size)
  }

  private fun haversine(a: LocPoint, b: LocPoint): Double {
    val R = 6371000.0 // Earth radius in meters
    val dLat = Math.toRadians(b.lat - a.lat)
    val dLng = Math.toRadians(b.lng - a.lng)
    
    val lat1 = Math.toRadians(a.lat)
    val lat2 = Math.toRadians(b.lat)
    
    val x = sin(dLat / 2) * sin(dLat / 2) +
            sin(dLng / 2) * sin(dLng / 2) * cos(lat1) * cos(lat2)
    val c = 2 * atan2(sqrt(x), sqrt(1 - x))
    
    return R * c
  }

  data class LocPoint(val timestamp: Long, val lat: Double, val lng: Double)
}
