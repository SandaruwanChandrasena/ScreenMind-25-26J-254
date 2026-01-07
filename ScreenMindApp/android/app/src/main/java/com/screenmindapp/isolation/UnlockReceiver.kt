package com.screenmindapp.isolation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences

class UnlockReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_USER_PRESENT) {
      val prefs: SharedPreferences = context.getSharedPreferences("isolation_metrics", Context.MODE_PRIVATE)
      val today = DateKey.today()
      val key = "unlock_$today"
      val current = prefs.getInt(key, 0)
      prefs.edit().putInt(key, current + 1).apply()
    }
  }
}
