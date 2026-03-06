package com.screenmindapp.socialmedia

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.app.NotificationCompat

class OverlayService : Service() {

    companion object {
        const val ACTION_SHOW      = "SHOW_OVERLAY"
        const val ACTION_HIDE      = "HIDE_OVERLAY"
        const val EXTRA_RISK_SCORE = "risk_score"
        const val CHANNEL_ID       = "screenmind_overlay"
        const val NOTIF_ID         = 1001
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View?            = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification())
        Log.d("OverlayService", "✅ Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                val score = intent.getDoubleExtra(EXTRA_RISK_SCORE, 0.0)
                showOverlay(score)
            }
            ACTION_HIDE -> {
                hideOverlay()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        hideOverlay()
        super.onDestroy()
    }

    // ─────────────────────────────────────────────────────────────
    // Show native overlay — no buttons, tap card opens app
    // ─────────────────────────────────────────────────────────────
    private fun showOverlay(riskScore: Double) {
        if (overlayView != null) hideOverlay()

        val scorePercent = (riskScore * 100).toInt()

        // ── Full screen dark background ───────────────────────────
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#CC050A28")) // 80% dark blue
            setPadding(56, 0, 56, 0)
        }

        // ── Card — entire card is tappable ────────────────────────
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            setPadding(56, 64, 56, 64)
            isClickable = true
            isFocusable = true
            background  = GradientDrawable().apply {
                setColor(Color.parseColor("#0D1545"))
                cornerRadius = 64f
                setStroke(3, Color.parseColor("#1E3A7A"))
            }
            // ✅ Tap → close native overlay → open app → RN overlay shows
            setOnClickListener { openApp() }
        }

        // ── Icon ──────────────────────────────────────────────────
        val iconRing = LinearLayout(this).apply {
            gravity    = Gravity.CENTER
            setPadding(32, 32, 32, 32)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#1A0000"))
                setStroke(2, Color.parseColor("#EF4444"))
            }
        }
        val icon = TextView(this).apply {
            text     = "⚠️"
            textSize = 40f
            gravity  = Gravity.CENTER
        }
        iconRing.addView(icon)

        // ── Title ─────────────────────────────────────────────────
        val title = TextView(this).apply {
            text      = "Emotional Alert"
            textSize  = 22f
            setTextColor(Color.WHITE)
            gravity   = Gravity.CENTER
            typeface  = Typeface.DEFAULT_BOLD
            setPadding(0, 28, 0, 8)
        }

        // ── Subtitle ──────────────────────────────────────────────
        val subtitle = TextView(this).apply {
            text      = "High Negative Exposure Detected"
            textSize  = 13f
            setTextColor(Color.parseColor("#EF4444"))
            gravity   = Gravity.CENTER
            typeface  = Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, 32)
        }

        // ── Score ─────────────────────────────────────────────────
        val scoreLabel = TextView(this).apply {
            text      = "Risk Score: $scorePercent%"
            textSize  = 12f
            setTextColor(Color.parseColor("#9CA3AF"))
            gravity   = Gravity.CENTER
            setPadding(0, 0, 0, 10)
        }

        // ── Progress bar ──────────────────────────────────────────
        val progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max      = 100
            progress = scorePercent
            progressDrawable?.setColorFilter(
                Color.parseColor("#EF4444"),
                android.graphics.PorterDuff.Mode.SRC_IN
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 16
            ).apply { setMargins(0, 0, 0, 36) }
        }

        // ── Message ───────────────────────────────────────────────
        val message = TextView(this).apply {
            text      = "You've been receiving many negative\nmessages recently.\n\nIt's okay to step away. 💙"
            textSize  = 14f
            setTextColor(Color.parseColor("#CBD5E1"))
            gravity   = Gravity.CENTER
            setLineSpacing(0f, 1.4f)
            setPadding(0, 0, 0, 40)
        }

        // ── Tap hint ──────────────────────────────────────────────
        val tapHint = TextView(this).apply {
            text      = "👆  Tap to open ScreenMind"
            textSize  = 12f
            setTextColor(Color.parseColor("#00B4FF"))
            gravity   = Gravity.CENTER
            typeface  = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#0A1530"))
                cornerRadius = 32f
                setStroke(1, Color.parseColor("#1E3A7A"))
            }
            setPadding(40, 22, 40, 22)
        }

        // ── Assemble ──────────────────────────────────────────────
        card.addView(iconRing)
        card.addView(title)
        card.addView(subtitle)
        card.addView(scoreLabel)
        card.addView(progressBar)
        card.addView(message)
        card.addView(tapHint)

        root.addView(card, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        // ── Draw over everything ──────────────────────────────────
        val windowType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE

        val windowParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            windowType,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP or Gravity.START }

        overlayView = root
        windowManager?.addView(root, windowParams)
        Log.d("OverlayService", "🚨 Overlay shown — score: $scorePercent%")
    }

    // ─────────────────────────────────────────────────────────────
    // Tap handler — dismiss native overlay, open app
    // App.js reads AsyncStorage and shows the RN overlay
    // ─────────────────────────────────────────────────────────────
    private fun openApp() {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(launchIntent)
            Log.d("OverlayService", "📱 App opened — RN overlay will show")

            // Remove native overlay — RN overlay in App.js takes over
            hideOverlay()
            stopSelf()
        } catch (e: Exception) {
            Log.e("OverlayService", "❌ Open app error: ${e.message}")
        }
    }

    private fun hideOverlay() {
        overlayView?.let {
            try { windowManager?.removeView(it) }
            catch (e: Exception) { Log.e("OverlayService", "Remove error: ${e.message}") }
        }
        overlayView = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "ScreenMind Overlay", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "ScreenMind emotional alert overlay" }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ScreenMind Alert")
            .setContentText("High emotional risk detected — tap to view")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}