package com.screenmindapp.sleep

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SleepServiceModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SleepServiceModule"

    @ReactMethod
    fun startForegroundService() {
        SleepForegroundService.start(reactContext)
    }

    @ReactMethod
    fun stopForegroundService() {
        SleepForegroundService.stop(reactContext)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}