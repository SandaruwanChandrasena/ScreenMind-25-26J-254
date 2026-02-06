package com.screenmindapp.isolation

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.Settings
import android.provider.Telephony
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import java.util.Calendar
import java.util.concurrent.TimeUnit

class CommunicationStatsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CommunicationStats"

  // ---- Public API ----

  @ReactMethod
  fun hasCallLogPermission(promise: Promise) {
    val granted = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.READ_CALL_LOG
    ) == PackageManager.PERMISSION_GRANTED
    promise.resolve(granted)
  }

  @ReactMethod
  fun hasSmsPermission(promise: Promise) {
    val granted = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.READ_SMS
    ) == PackageManager.PERMISSION_GRANTED
    promise.resolve(granted)
  }

  /**
   * Returns today's communication summary:
   * - callsPerDay: Float (avg over last 7 days)
   * - avgCallDurationSeconds: Int
   * - uniqueContacts: Int (last 7 days)
   * - smsCountPerDay: Float (avg over last 7 days)
   * - interactionSilenceHours: Float (time since last call/SMS)
   */
  @ReactMethod
  fun getCommunicationStats(promise: Promise) {
    try {
      val hasCallPerm = ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.READ_CALL_LOG
      ) == PackageManager.PERMISSION_GRANTED

      val hasSmsPerm = ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.READ_SMS
      ) == PackageManager.PERMISSION_GRANTED

      // Get 7-day stats
      val now = System.currentTimeMillis()
      val sevenDaysAgo = now - TimeUnit.DAYS.toMillis(7)

      var totalCalls = 0
      var totalCallDuration = 0L
      var uniqueNumbers = mutableSetOf<String>()
      var lastCallTime = 0L

      // Query Call Log
      if (hasCallPerm) {
        val callStats = queryCallLog(sevenDaysAgo, now)
        totalCalls = callStats.totalCalls
        totalCallDuration = callStats.totalDuration
        uniqueNumbers.addAll(callStats.uniqueNumbers)
        lastCallTime = callStats.lastCallTime
      }

      // Query SMS
      var totalSms = 0
      var lastSmsTime = 0L
      if (hasSmsPerm) {
        val smsStats = querySms(sevenDaysAgo, now)
        totalSms = smsStats.totalSms
        uniqueNumbers.addAll(smsStats.uniqueNumbers)
        lastSmsTime = smsStats.lastSmsTime
      }

      // Calculate averages
      val callsPerDay = totalCalls / 7.0f
      val smsPerDay = totalSms / 7.0f
      val avgCallDuration = if (totalCalls > 0) (totalCallDuration / totalCalls).toInt() else 0

      // Calculate interaction silence
      val lastInteraction = maxOf(lastCallTime, lastSmsTime)
      val silenceHours = if (lastInteraction > 0) {
        (now - lastInteraction).toFloat() / (1000f * 60f * 60f)
      } else {
        0f
      }

      val map: WritableMap = Arguments.createMap().apply {
        putDouble("callsPerDay", callsPerDay.toDouble())
        putInt("avgCallDurationSeconds", avgCallDuration)
        putInt("uniqueContacts", uniqueNumbers.size)
        putDouble("smsCountPerDay", smsPerDay.toDouble())
        putDouble("interactionSilenceHours", silenceHours.toDouble())
      }

      promise.resolve(map)

    } catch (e: Exception) {
      promise.reject("ERR_COMMUNICATION_STATS", e.message, e)
    }
  }

  // ---- Private helpers ----

  private data class CallStats(
    val totalCalls: Int,
    val totalDuration: Long,
    val uniqueNumbers: Set<String>,
    val lastCallTime: Long
  )

  private data class SmsStats(
    val totalSms: Int,
    val uniqueNumbers: Set<String>,
    val lastSmsTime: Long
  )

  private fun queryCallLog(startTime: Long, endTime: Long): CallStats {
    var cursor: Cursor? = null
    try {
      val projection = arrayOf(
        CallLog.Calls.NUMBER,
        CallLog.Calls.DURATION,
        CallLog.Calls.DATE,
        CallLog.Calls.TYPE
      )

      val selection = "${CallLog.Calls.DATE} >= ? AND ${CallLog.Calls.DATE} <= ?"
      val selectionArgs = arrayOf(startTime.toString(), endTime.toString())

      cursor = reactContext.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        selection,
        selectionArgs,
        "${CallLog.Calls.DATE} DESC"
      )

      var totalCalls = 0
      var totalDuration = 0L
      val uniqueNumbers = mutableSetOf<String>()
      var lastCallTime = 0L

      cursor?.use {
        val numberIndex = it.getColumnIndex(CallLog.Calls.NUMBER)
        val durationIndex = it.getColumnIndex(CallLog.Calls.DURATION)
        val dateIndex = it.getColumnIndex(CallLog.Calls.DATE)
        val typeIndex = it.getColumnIndex(CallLog.Calls.TYPE)

        while (it.moveToNext()) {
          val number = it.getString(numberIndex) ?: ""
          val duration = it.getLong(durationIndex)
          val date = it.getLong(dateIndex)
          val type = it.getInt(typeIndex)

          // Count outgoing and incoming calls
          if (type == CallLog.Calls.OUTGOING_TYPE || type == CallLog.Calls.INCOMING_TYPE) {
            totalCalls++
            totalDuration += duration
            if (number.isNotBlank()) {
              uniqueNumbers.add(number)
            }
            if (date > lastCallTime) {
              lastCallTime = date
            }
          }
        }
      }

      return CallStats(totalCalls, totalDuration, uniqueNumbers, lastCallTime)

    } catch (e: Exception) {
      return CallStats(0, 0, emptySet(), 0)
    } finally {
      cursor?.close()
    }
  }

  private fun querySms(startTime: Long, endTime: Long): SmsStats {
    var cursor: Cursor? = null
    try {
      val uri = Telephony.Sms.CONTENT_URI
      val projection = arrayOf(
        Telephony.Sms.ADDRESS,
        Telephony.Sms.DATE,
        Telephony.Sms.TYPE
      )

      val selection = "${Telephony.Sms.DATE} >= ? AND ${Telephony.Sms.DATE} <= ?"
      val selectionArgs = arrayOf(startTime.toString(), endTime.toString())

      cursor = reactContext.contentResolver.query(
        uri,
        projection,
        selection,
        selectionArgs,
        "${Telephony.Sms.DATE} DESC"
      )

      var totalSms = 0
      val uniqueNumbers = mutableSetOf<String>()
      var lastSmsTime = 0L

      cursor?.use {
        val addressIndex = it.getColumnIndex(Telephony.Sms.ADDRESS)
        val dateIndex = it.getColumnIndex(Telephony.Sms.DATE)

        while (it.moveToNext()) {
          val address = it.getString(addressIndex) ?: ""
          val date = it.getLong(dateIndex)

          totalSms++
          if (address.isNotBlank()) {
            uniqueNumbers.add(address)
          }
          if (date > lastSmsTime) {
            lastSmsTime = date
          }
        }
      }

      return SmsStats(totalSms, uniqueNumbers, lastSmsTime)

    } catch (e: Exception) {
      return SmsStats(0, emptySet(), 0)
    } finally {
      cursor?.close()
    }
  }
}
