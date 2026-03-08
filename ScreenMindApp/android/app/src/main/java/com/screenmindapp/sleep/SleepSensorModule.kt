package com.screenmindapp.sleep

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.sqrt
import kotlin.math.abs


class SleepSensorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SleepSensorModule"

    private val sensorManager: SensorManager by lazy {
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    // Background thread for sensor work
    private var sensorThread: HandlerThread? = null
    private var sensorHandler: Handler? = null

    // Continuous polling state
    private var isPolling = false
    private val ACCEL_INTERVAL_MS = 30_000L   // 30 seconds
    private val LIGHT_INTERVAL_MS = 300_000L  // 5 minutes

    // ─────────────────────────────────────────────────
    // ONE-SHOT readings (used by JS setInterval — keep for compat)
    // ─────────────────────────────────────────────────

    @ReactMethod
    fun getAccelerometerReading(promise: Promise) {
        try {
            val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            if (sensor == null) {
                val result = Arguments.createMap().apply {
                    putDouble("x", 0.0); putDouble("y", 0.0)
                    putDouble("z", 9.8); putBoolean("available", false)
                }
                promise.resolve(result); return
            }

            // Use a HandlerThread so this works when main thread is paused
            val ht = HandlerThread("AccelRead").also { it.start() }
            val handler = Handler(ht.looper)
            var resolved = false

            val listener = object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent) {
                    if (resolved) return
                    resolved = true
                    sensorManager.unregisterListener(this)

                    val x = event.values[0].toDouble()
                    val y = event.values[1].toDouble()
                    val z = event.values[2].toDouble()
                    val magnitude = sqrt(x * x + y * y + z * z)
                    val movement = abs(magnitude - 9.8)

                    val result = Arguments.createMap().apply {
                        putDouble("x", x); putDouble("y", y); putDouble("z", z)
                        putDouble("magnitude", magnitude)
                        putDouble("movement", movement)
                        putDouble("ts", System.currentTimeMillis().toDouble())
                        putBoolean("available", true)
                    }
                    promise.resolve(result)
                    ht.quit()
                }
                override fun onAccuracyChanged(s: Sensor, a: Int) {}
            }

            sensorManager.registerListener(
                listener, sensor,
                SensorManager.SENSOR_DELAY_NORMAL, handler
            )

            // Timeout after 3 seconds
            handler.postDelayed({
                if (!resolved) {
                    resolved = true
                    sensorManager.unregisterListener(listener)
                    val result = Arguments.createMap().apply {
                        putDouble("x", 0.0); putDouble("y", 0.0)
                        putDouble("z", 9.8); putBoolean("available", false)
                    }
                    promise.resolve(result)
                    ht.quit()
                }
            }, 3000)

        } catch (e: Exception) {
            promise.reject("ACCEL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getLightReading(promise: Promise) {
        try {
            val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
            if (sensor == null) {
                promise.resolve(-1.0); return
            }

            val ht = HandlerThread("LightRead").also { it.start() }
            val handler = Handler(ht.looper)
            var resolved = false

            val listener = object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent) {
                    if (resolved) return
                    resolved = true
                    sensorManager.unregisterListener(this)
                    promise.resolve(event.values[0].toDouble())
                    ht.quit()
                }
                override fun onAccuracyChanged(s: Sensor, a: Int) {}
            }

            // IMPORTANT: registerListener with handler — works in background!
            sensorManager.registerListener(
                listener, sensor,
                SensorManager.SENSOR_DELAY_NORMAL, handler
            )

            // Timeout after 3 seconds
            handler.postDelayed({
                if (!resolved) {
                    resolved = true
                    sensorManager.unregisterListener(listener)
                    promise.resolve(0.0)
                    ht.quit()
                }
            }, 3000)

        } catch (e: Exception) {
            promise.resolve(0.0)
        }
    }

    // ─────────────────────────────────────────────────
    // CONTINUOUS POLLING — survives screen lock
    // Call startContinuousPolling() when session begins
    // ─────────────────────────────────────────────────

    @ReactMethod
    fun startContinuousPolling(promise: Promise) {
        try {
            if (isPolling) { promise.resolve(true); return }

            sensorThread = HandlerThread("SleepSensorThread").also { it.start() }
            sensorHandler = Handler(sensorThread!!.looper)
            isPolling = true

            scheduleAccelPoll()
            scheduleLightPoll()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POLL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopContinuousPolling(promise: Promise) {
        try {
            isPolling = false
            sensorHandler?.removeCallbacksAndMessages(null)
            sensorThread?.quit()
            sensorThread = null
            sensorHandler = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POLL_STOP_ERROR", e.message)
        }
    }

    private fun scheduleAccelPoll() {
        if (!isPolling) return
        sensorHandler?.post { doAccelReading() }
        sensorHandler?.postDelayed({ scheduleAccelPoll() }, ACCEL_INTERVAL_MS)
    }

    private fun scheduleLightPoll() {
        if (!isPolling) return
        sensorHandler?.post { doLightReading() }
        sensorHandler?.postDelayed({ scheduleLightPoll() }, LIGHT_INTERVAL_MS)
    }

    private fun doAccelReading() {
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return
        var done = false

        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (done) return
                done = true
                sensorManager.unregisterListener(this)

                val x = event.values[0].toDouble()
                val y = event.values[1].toDouble()
                val z = event.values[2].toDouble()
                val magnitude = sqrt(x * x + y * y + z * z)
                val movement = abs(magnitude - 9.8)

                val classification = when {
                    movement < 0.02 -> "STILL"
                    movement < 0.08 -> "LIGHT"
                    movement < 0.30 -> "RESTLESS"
                    else -> "ACTIVE"
                }

                sendEvent("SLEEP_SENSOR_ACCEL", mapOf(
                    "x" to x, "y" to y, "z" to z,
                    "movement" to movement,
                    "classification" to classification,
                    "ts" to System.currentTimeMillis()
                ))
            }
            override fun onAccuracyChanged(s: Sensor, a: Int) {}
        }

        sensorManager.registerListener(
            listener, sensor,
            SensorManager.SENSOR_DELAY_NORMAL, sensorHandler
        )

        // Unregister after 2 seconds
        sensorHandler?.postDelayed({
            if (!done) { done = true; sensorManager.unregisterListener(listener) }
        }, 2000)
    }

    private fun doLightReading() {
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
        if (sensor == null) {
            // No light sensor — emit -1 so JS knows
            sendEvent("SLEEP_SENSOR_LIGHT", mapOf(
                "lux" to -1.0,
                "lightCategory" to "UNAVAILABLE",
                "ts" to System.currentTimeMillis()
            ))
            return
        }

        var done = false

        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (done) return
                done = true
                sensorManager.unregisterListener(this)

                val lux = event.values[0].toDouble()
                val category = when {
                    lux < 5   -> "DARK"
                    lux < 20  -> "DIM"
                    lux < 50  -> "MODERATE"
                    else      -> "BRIGHT"
                }

                sendEvent("SLEEP_SENSOR_LIGHT", mapOf(
                    "lux" to lux,
                    "lightCategory" to category,
                    "ts" to System.currentTimeMillis()
                ))
            }
            override fun onAccuracyChanged(s: Sensor, a: Int) {}
        }

        sensorManager.registerListener(
            listener, sensor,
            SensorManager.SENSOR_DELAY_NORMAL, sensorHandler
        )

        sensorHandler?.postDelayed({
            if (!done) { done = true; sensorManager.unregisterListener(listener) }
        }, 2000)
    }

    private fun sendEvent(eventName: String, params: Map<String, Any>) {
        val map = Arguments.createMap()
        params.forEach { (k, v) ->
            when (v) {
                is Long    -> map.putDouble(k, v.toDouble())
                is Int     -> map.putInt(k, v)
                is Double  -> map.putDouble(k, v)
                is Float   -> map.putDouble(k, v.toDouble())
                is String  -> map.putString(k, v)
                is Boolean -> map.putBoolean(k, v)
            }
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, map)
    }

    @ReactMethod
    fun getAvailableSensors(promise: Promise) {
        try {
            val result = Arguments.createMap()
            result.putBoolean("accelerometer",
                sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null)
            result.putBoolean("light",
                sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT) != null)
            result.putBoolean("gyroscope",
                sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SENSOR_CHECK_ERROR", e.message)
        }
    }

    // Add inside SleepEventModule class:

    @ReactMethod
    fun sendLocalNotification(title: String, message: String) {
        val notificationManager = reactContext
            .getSystemService(Context.NOTIFICATION_SERVICE) 
            as android.app.NotificationManager

        // Create channel (Android 8+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                "sleep_warnings",
                "Sleep Warnings",
                android.app.NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val pendingIntent = android.app.PendingIntent.getActivity(
            reactContext, 0,
            reactContext.packageManager.getLaunchIntentForPackage(
                reactContext.packageName
            ),
            android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val notification = androidx.core.app.NotificationCompat
            .Builder(reactContext, "sleep_warnings")
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(2001, notification)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}