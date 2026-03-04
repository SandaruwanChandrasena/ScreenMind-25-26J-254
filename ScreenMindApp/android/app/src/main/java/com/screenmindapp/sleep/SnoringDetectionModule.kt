package com.screenmindapp.sleep

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.sqrt
import kotlin.math.abs

class SnoringDetectionModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SnoringDetectionModule"

    // ── Audio config ──────────────────────────────────
    private val SAMPLE_RATE = 16000       // 16kHz is enough
    private val CHANNEL = AudioFormat.CHANNEL_IN_MONO
    private val ENCODING = AudioFormat.ENCODING_PCM_16BIT

    // ── Analysis timing ───────────────────────────────
    // Analyze every 2 seconds
    private val WINDOW_MS = 2000L

    // ── Amplitude thresholds ──────────────────────────
    // Tune these after real testing on your device
    // Silence: below 300
    // Normal breathing: 300 - 800  
    // Snoring: above 1200
    // Loud snoring: above 2500
    private val SILENCE_THRESHOLD = 300.0
    private val SNORE_LOW_THRESHOLD = 1200.0
    private val SNORE_HIGH_THRESHOLD = 2500.0

    // ── State ─────────────────────────────────────────
    private var isRecording = false
    private var audioRecord: AudioRecord? = null
    private var recordingThread: Thread? = null
    private var isSnoringActive = false
    private var consecutiveSnoreWindows = 0
    private var consecutiveSilentWindows = 0

    // Require 2 consecutive snore windows before flagging
    // Prevents false positives from single loud sounds
    private val SNORE_CONFIRM_COUNT = 2
    private val SILENCE_CONFIRM_COUNT = 3

    // ─────────────────────────────────────────────────
    // START detection
    // ─────────────────────────────────────────────────
    @ReactMethod
    fun startDetection(promise: Promise) {
        try {
            if (isRecording) {
                promise.resolve(true)
                return
            }

            val bufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, CHANNEL, ENCODING
            )

            if (bufferSize == AudioRecord.ERROR ||
                bufferSize == AudioRecord.ERROR_BAD_VALUE) {
                promise.reject(
                    "BUFFER_ERROR",
                    "Cannot get valid buffer size"
                )
                return
            }

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL,
                ENCODING,
                bufferSize * 4  // larger buffer = more stable
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject(
                    "INIT_ERROR",
                    "AudioRecord failed to initialize. " +
                    "Check microphone permission."
                )
                return
            }

            audioRecord?.startRecording()
            isRecording = true
            isSnoringActive = false
            consecutiveSnoreWindows = 0
            consecutiveSilentWindows = 0

            // Start analysis on background thread
            recordingThread = Thread {
                analyzeAudioLoop(bufferSize)
            }
            recordingThread?.isDaemon = true
            recordingThread?.start()

            // Notify React Native that detection started
            sendEvent(
                "SNORING_STATUS",
                mapOf(
                    "status" to "STARTED",
                    "ts" to System.currentTimeMillis()
                )
            )

            promise.resolve(true)

        } catch (e: SecurityException) {
            promise.reject(
                "PERMISSION_ERROR",
                "Microphone permission denied: ${e.message}"
            )
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message)
        }
    }

    // ─────────────────────────────────────────────────
    // STOP detection
    // ─────────────────────────────────────────────────
    @ReactMethod
    fun stopDetection(promise: Promise) {
        try {
            isRecording = false

            // If currently snoring when stopped, end the episode
            if (isSnoringActive) {
                isSnoringActive = false
                sendEvent(
                    "SNORING_EVENT",
                    mapOf(
                        "type" to "SNORING_END",
                        "ts" to System.currentTimeMillis(),
                        "amplitude" to 0.0,
                        "reason" to "DETECTION_STOPPED"
                    )
                )
            }

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            recordingThread = null

            sendEvent(
                "SNORING_STATUS",
                mapOf(
                    "status" to "STOPPED",
                    "ts" to System.currentTimeMillis()
                )
            )

            promise.resolve(true)

        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }

    // ─────────────────────────────────────────────────
    // AUDIO ANALYSIS LOOP
    // Runs on background thread
    // ─────────────────────────────────────────────────
    private fun analyzeAudioLoop(bufferSize: Int) {
        val buffer = ShortArray(bufferSize)

        while (isRecording) {
            val read = audioRecord?.read(
                buffer, 0, bufferSize
            ) ?: break

            if (read > 0) {
                val rms = calculateRMS(buffer, read)
                classifyAndEmit(rms)
            }

            // Wait before next analysis window
            try {
                Thread.sleep(WINDOW_MS)
            } catch (e: InterruptedException) {
                break
            }
        }
    }

    // ─────────────────────────────────────────────────
    // CALCULATE RMS (Root Mean Square)
    // This is the amplitude/loudness of the audio
    // ─────────────────────────────────────────────────
    private fun calculateRMS(buffer: ShortArray, length: Int): Double {
        var sumSquares = 0.0
        for (i in 0 until length) {
            val sample = buffer[i].toDouble()
            sumSquares += sample * sample
        }
        return sqrt(sumSquares / length)
    }

    // ─────────────────────────────────────────────────
    // CLASSIFY SOUND AND EMIT EVENT
    // Uses consecutive window counting to avoid 
    // false positives
    // ─────────────────────────────────────────────────
    private fun classifyAndEmit(amplitude: Double) {
        val ts = System.currentTimeMillis()

        // Determine sound category
        val soundType = when {
            amplitude < SILENCE_THRESHOLD -> "SILENCE"
            amplitude < SNORE_LOW_THRESHOLD -> "BREATHING"
            amplitude < SNORE_HIGH_THRESHOLD -> "SNORING"
            else -> "SNORING_LOUD"
        }

        val isSnoreSound = soundType == "SNORING" || 
                           soundType == "SNORING_LOUD"

        if (isSnoreSound) {
            consecutiveSnoreWindows++
            consecutiveSilentWindows = 0

            // Need SNORE_CONFIRM_COUNT windows to confirm
            if (consecutiveSnoreWindows == SNORE_CONFIRM_COUNT 
                && !isSnoringActive) {
                isSnoringActive = true
                sendEvent(
                    "SNORING_EVENT",
                    mapOf(
                        "type" to "SNORING_START",
                        "ts" to ts,
                        "amplitude" to amplitude,
                        "soundType" to soundType,
                        "confidence" to calculateConfidence(amplitude)
                    )
                )
            }

        } else {
            consecutiveSilentWindows++
            consecutiveSnoreWindows = 0

            // Need SILENCE_CONFIRM_COUNT windows to confirm end
            if (consecutiveSilentWindows == SILENCE_CONFIRM_COUNT 
                && isSnoringActive) {
                isSnoringActive = false
                sendEvent(
                    "SNORING_EVENT",
                    mapOf(
                        "type" to "SNORING_END",
                        "ts" to ts,
                        "amplitude" to amplitude,
                        "soundType" to soundType,
                        "confidence" to 1.0
                    )
                )
            }
        }

        // Always emit amplitude update (for real-time UI)
        sendEvent(
            "SNORING_AMPLITUDE",
            mapOf(
                "amplitude" to amplitude,
                "soundType" to soundType,
                "isSnoring" to isSnoringActive,
                "ts" to ts
            )
        )
    }

    // ─────────────────────────────────────────────────
    // CALCULATE CONFIDENCE SCORE
    // ─────────────────────────────────────────────────
    private fun calculateConfidence(amplitude: Double): Double {
        return when {
            amplitude >= SNORE_HIGH_THRESHOLD -> 0.95
            amplitude >= SNORE_LOW_THRESHOLD * 1.5 -> 0.85
            amplitude >= SNORE_LOW_THRESHOLD -> 0.75
            else -> 0.60
        }
    }

    // ─────────────────────────────────────────────────
    // SEND EVENT TO REACT NATIVE
    // ─────────────────────────────────────────────────
    private fun sendEvent(eventName: String, params: Map<String, Any>) {
        val map = Arguments.createMap()
        params.forEach { (key, value) ->
            when (value) {
                is Long   -> map.putDouble(key, value.toDouble())
                is Int    -> map.putInt(key, value)
                is Double -> map.putDouble(key, value)
                is Float  -> map.putDouble(key, value.toDouble())
                is String -> map.putString(key, value)
                is Boolean-> map.putBoolean(key, value)
            }
        }

        reactContext
            .getJSModule(
                DeviceEventManagerModule
                    .RCTDeviceEventEmitter::class.java
            )
            .emit(eventName, map)
    }

    // Required for NativeEventEmitter on RN side
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}