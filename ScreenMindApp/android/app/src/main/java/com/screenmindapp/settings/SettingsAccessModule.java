package com.screenmindapp.settings;

import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SettingsAccessModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext reactContext;

  public SettingsAccessModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "SettingsAccess";
  }

  @ReactMethod
  public void hasUsageStatsAccess(Promise promise) {
    try {
      Context context = reactContext;
      AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
      int mode;

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        mode = appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.getPackageName()
        );
      } else {
        mode = appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.getPackageName()
        );
      }

      promise.resolve(mode == AppOpsManager.MODE_ALLOWED);
    } catch (Exception e) {
      promise.reject("USAGE_ACCESS_ERROR", e);
    }
  }

  @ReactMethod
  public void hasNotificationListenerAccess(Promise promise) {
    try {
      String pkgName = reactContext.getPackageName();
      final String flat = Settings.Secure.getString(
        reactContext.getContentResolver(),
        "enabled_notification_listeners"
      );

      boolean enabled = false;
      if (!TextUtils.isEmpty(flat)) {
        String[] names = flat.split(":");
        for (String name : names) {
          if (name != null && name.contains(pkgName)) {
            enabled = true;
            break;
          }
        }
      }
      promise.resolve(enabled);
    } catch (Exception e) {
      promise.reject("NOTIF_ACCESS_ERROR", e);
    }
  }

  @ReactMethod
  public void hasDndAccess(Promise promise) {
    try {
      NotificationManager nm = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
      boolean granted = nm != null && nm.isNotificationPolicyAccessGranted();
      promise.resolve(granted);
    } catch (Exception e) {
      promise.reject("DND_ACCESS_ERROR", e);
    }
  }

  @ReactMethod
  public void openUsageAccessSettings() {
    Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    reactContext.startActivity(intent);
  }

  @ReactMethod
  public void openNotificationAccessSettings() {
    Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    reactContext.startActivity(intent);
  }

  @ReactMethod
  public void openDndAccessSettings() {
    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    reactContext.startActivity(intent);
  }
}
