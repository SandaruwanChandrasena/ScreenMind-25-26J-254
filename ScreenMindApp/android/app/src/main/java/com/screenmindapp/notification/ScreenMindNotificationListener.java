package com.screenmindapp.notification;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

public class ScreenMindNotificationListener extends NotificationListenerService {

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    try {
      String packageName = sbn.getPackageName();
      long ts = System.currentTimeMillis();

      String title = "";
      Bundle extras = sbn.getNotification().extras;
      if (extras != null) {
        CharSequence t = extras.getCharSequence("android.title");
        if (t != null) title = t.toString();
      }

      Log.d("ScreenMindNotif", "Notification received: " + packageName + " - " + title);

      // Broadcast to React Native - make it explicit
      Intent i = new Intent("SCREENMIND_NOTIFICATION");
      i.setPackage("com.screenmindapp"); // Explicit target
      i.putExtra("packageName", packageName);
      i.putExtra("title", title);
      i.putExtra("ts", ts);

      sendBroadcast(i);
      Log.d("ScreenMindNotif", "Broadcast sent successfully");
    } catch (Exception e) {
      Log.e("ScreenMindNotif", "Error processing notification", e);
    }
  }
}
