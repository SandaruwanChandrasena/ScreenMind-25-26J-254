// android/app/src/main/java/com/screenmindapp/sleep/
// SleepSensorModule.kt

package com.screenmindapp.sleep

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.sqrt

class SleepSensorModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SleepSensorModule"

    private val sensorManager: SensorManager by lazy {
        reactContext.getSystemService(Context.SENSOR_SERVICE)
                as SensorManager
    }

    // Get one accelerometer reading
    @ReactMethod
    fun getAccelerometerReading(promise: Promise) {
        try {
            val sensor = sensorManager.getDefaultSensor(
                Sensor.TYPE_ACCELEROMETER
            )

            if (sensor == null) {
                // Return zero values if no sensor
                val result = Arguments.createMap()
                result.putDouble("x", 0.0)
                result.putDouble("y", 0.0)
                result.putDouble("z", 9.8) // gravity default
                result.putDouble("ts",
                    System.currentTimeMillis().toDouble())
                result.putBoolean("available", false)
                promise.resolve(result)
                return
            }

            val listener = object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent) {
                    // Unregister immediately after first reading
                    sensorManager.unregisterListener(this)

                    val x = event.values[0].toDouble()
                    val y = event.values[1].toDouble()
                    val z = event.values[2].toDouble()

                    // Calculate movement (remove gravity ~9.8)
                    val magnitude = sqrt(x * x + y * y + z * z)
                    val movement = Math.abs(magnitude - 9.8)

                    val result = Arguments.createMap()
                    result.putDouble("x", x)
                    result.putDouble("y", y)
                    result.putDouble("z", z)
                    result.putDouble("magnitude", magnitude)
                    result.putDouble("movement", movement)
                    result.putDouble("ts",
                        System.currentTimeMillis().toDouble())
                    result.putBoolean("available", true)

                    promise.resolve(result)
                }

                override fun onAccuracyChanged(
                    sensor: Sensor, accuracy: Int) {}
            }

            sensorManager.registerListener(
                listener,
                sensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )

        } catch (e: Exception) {
            promise.reject("ACCEL_ERROR", e.message)
        }
    }

    // Get one ambient light reading
    @ReactMethod
    fun getLightReading(promise: Promise) {
        try {
            val sensor = sensorManager.getDefaultSensor(
                Sensor.TYPE_LIGHT
            )

            if (sensor == null) {
                // Return -1 if no light sensor on device
                promise.resolve(-1.0)
                return
            }

            val listener = object : SensorEventListener {
                override fun onSensorChanged(event: SensorEvent) {
                    sensorManager.unregisterListener(this)
                    // event.values[0] = lux value
                    promise.resolve(event.values[0].toDouble())
                }

                override fun onAccuracyChanged(
                    sensor: Sensor, accuracy: Int) {}
            }

            sensorManager.registerListener(
                listener,
                sensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )

        } catch (e: Exception) {
            // If anything fails, return 0
            promise.resolve(0.0)
        }
    }

    // Check which sensors are available on this device
    @ReactMethod
    fun getAvailableSensors(promise: Promise) {
        try {
            val result = Arguments.createMap()
            result.putBoolean(
                "accelerometer",
                sensorManager.getDefaultSensor(
                    Sensor.TYPE_ACCELEROMETER) != null
            )
            result.putBoolean(
                "light",
                sensorManager.getDefaultSensor(
                    Sensor.TYPE_LIGHT) != null
            )
            result.putBoolean(
                "gyroscope",
                sensorManager.getDefaultSensor(
                    Sensor.TYPE_GYROSCOPE) != null
            )
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SENSOR_CHECK_ERROR", e.message)
        }
    }
}