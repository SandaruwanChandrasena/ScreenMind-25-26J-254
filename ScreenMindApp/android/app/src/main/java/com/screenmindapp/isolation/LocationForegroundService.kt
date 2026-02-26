package com.screenmindapp.isolation

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import org.json.JSONArray
import org.json.JSONObject

class LocationForegroundService : Service() {

  private lateinit var fused: FusedLocationProviderClient
  private lateinit var callback: LocationCallback

  override fun onCreate() {
    super.onCreate()
    fused = LocationServices.getFusedLocationProviderClient(this)

    callback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        for (loc in result.locations) {
          savePoint(loc)
        }
      }
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(1001, buildNotif())
    startLocationUpdates()
    return START_STICKY
  }

  override fun onDestroy() {
    fused.removeLocationUpdates(callback)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun buildNotif(): Notification {
    val channelId = "isolation_location"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, "ScreenMind Tracking", NotificationManager.IMPORTANCE_LOW)
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.createNotificationChannel(channel)
    }
    return NotificationCompat.Builder(this, channelId)
      .setContentTitle("ScreenMind is collecting mobility signals")
      .setContentText("Used only for research, aggregated daily.")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .build()
  }

  private fun startLocationUpdates() {
    val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 5 * 60 * 1000L) // 5 min
      .setMinUpdateDistanceMeters(30f)
      .build()

    fused.requestLocationUpdates(request, callback, mainLooper)
  }

  private fun savePoint(loc: Location) {
    val prefs = getSharedPreferences("isolation_metrics", Context.MODE_PRIVATE)
    val today = DateKey.today()
    val key = "gps_$today"

    val existing = prefs.getString(key, "[]") ?: "[]"
    val arr = JSONArray(existing)

    val obj = JSONObject()
    obj.put("t", System.currentTimeMillis())
    obj.put("lat", loc.latitude)
    obj.put("lng", loc.longitude)

    arr.put(obj)
    prefs.edit().putString(key, arr.toString()).apply()
  }
}
