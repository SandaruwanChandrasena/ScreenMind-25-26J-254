import { Platform } from "react-native";
import RNAndroidNotificationListener from "react-native-android-notification-listener";

/**
 * ✅ Opens Android settings so user can enable Notification Access.
 */
export async function openNotificationAccessSettings() {
  if (Platform.OS !== "android") return;
  RNAndroidNotificationListener.requestPermission();
}

/**
 * ✅ Check if Notification Access permission is currently enabled
 */
export async function isNotificationAccessEnabled() {
  if (Platform.OS !== "android") return false;
  try {
    const status = await RNAndroidNotificationListener.getPermissionStatus();
    // 'authorized' means the user turned the switch ON in Android settings
    return status === 'authorized';
  } catch (e) {
    console.error("Permission check error:", e);
    return false;
  }
}