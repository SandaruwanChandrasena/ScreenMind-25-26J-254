package com.screenmindapp.notification;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class NotificationBridgeModule extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;
  private final BroadcastReceiver receiver;

  public NotificationBridgeModule(ReactApplicationContext context) {
    super(context);
    reactContext = context;

    Log.d("NotificationBridge", "Module constructor called");

    receiver =
      new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
          try {
            String pkg = i.getStringExtra("packageName");
            String title = i.getStringExtra("title");
            long ts = i.getLongExtra("ts", System.currentTimeMillis());

            Log.d("NotificationBridge", "Received broadcast: " + pkg + " - " + title);

            reactContext
              .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
              .emit("SCREENMIND_NOTIFICATION", new NotificationEvent(pkg, title, ts).toMap());
            
            Log.d("NotificationBridge", "Emitted to React Native");
          } catch (Exception e) {
            Log.e("NotificationBridge", "Error in broadcast receiver", e);
          }
        }
      };

    IntentFilter f = new IntentFilter("SCREENMIND_NOTIFICATION");
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      // Explicitly mark as not exported to satisfy Android 13+ receiver requirements
      reactContext.registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED);
      Log.d("NotificationBridge", "Receiver registered (RECEIVER_NOT_EXPORTED)");
    } else {
      reactContext.registerReceiver(receiver, f);
      Log.d("NotificationBridge", "Receiver registered");
    }
  }

  @Override
  public String getName() {
    return "NotificationBridge";
  }

  // Add a test method to verify module is loaded
  @ReactMethod
  public void testModule() {
    Log.d("NotificationBridge", "testModule() called - Module is working!");
  }
}
