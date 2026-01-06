package com.screenmindapp.notification;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class NotificationEvent {
  public String packageName;
  public String title;
  public long ts;

  public NotificationEvent(String packageName, String title, long ts) {
    this.packageName = packageName;
    this.title = title;
    this.ts = ts;
  }

  public WritableMap toMap() {
    WritableMap m = Arguments.createMap();
    m.putString("packageName", packageName);
    m.putString("title", title);
    m.putDouble("ts", (double) ts);
    return m;
  }
}
