package com.screenmindapp.isolation

import android.content.Intent
import com.facebook.react.bridge.*

class ServiceStarterModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "ServiceStarter"

  @ReactMethod
  fun startLocationService() {
    val intent = Intent(ctx, LocationForegroundService::class.java)
    ctx.startForegroundService(intent)
  }

  @ReactMethod
  fun stopLocationService() {
    val intent = Intent(ctx, LocationForegroundService::class.java)
    ctx.stopService(intent)
  }
}
