package com.screenmindapp.sleep

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SleepForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "sleep_tracking_channel"
        const val NOTIF_ID = 1001
        const val ACTION_START = "START_SLEEP_TRACKING"
        const val ACTION_STOP  = "STOP_SLEEP_TRACKING"

        fun start(context: Context) {
            val intent = Intent(context, SleepForegroundService::class.java)
                .apply { action = ACTION_START }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, SleepForegroundService::class.java)
                .apply { action = ACTION_STOP }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                startForeground(NOTIF_ID, buildNotification())
            }
            ACTION_STOP -> {
                stopForeground(true)
                stopSelf()
            }
        }
        // START_STICKY = Android will restart this service if killed
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        val pendingIntent = packageManager
            .getLaunchIntentForPackage(packageName)
            ?.let {
                PendingIntent.getActivity(
                    this, 0, it,
                    PendingIntent.FLAG_IMMUTABLE
                )
            }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ScreenMind Sleep Tracking")
            .setContentText("Monitoring sleep patterns in the background")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sleep Tracking",
                NotificationManager.IMPORTANCE_LOW  // silent
            ).apply {
                description = "Keeps sleep sensor tracking active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}