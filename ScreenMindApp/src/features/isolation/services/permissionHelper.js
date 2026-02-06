import { Platform, PermissionsAndroid, Linking, Alert } from "react-native";
import { request, check, PERMISSIONS, RESULTS } from "react-native-permissions";

// Define all permissions needed for isolation detection
export const ISOLATION_PERMISSIONS = {
  LOCATION: Platform.select({
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
  }),
  BACKGROUND_LOCATION: Platform.select({
    android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
    ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
  }),
  BLUETOOTH_SCAN: Platform.select({
    android: PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
    ios: PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
  }),
  BLUETOOTH_CONNECT: Platform.select({
    android: PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
  }),
  CALL_LOG: Platform.select({
    android: PERMISSIONS.ANDROID.READ_CALL_LOG,
  }),
  SMS: Platform.select({
    android: PERMISSIONS.ANDROID.READ_SMS,
  }),
  NOTIFICATIONS: Platform.select({
    android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
    ios: PERMISSIONS.IOS.NOTIFICATIONS,
  }),
};

/**
 * Check permission status
 */
export async function checkPermission(permission) {
  if (!permission) return RESULTS.UNAVAILABLE;
  try {
    const result = await check(permission);
    return result;
  } catch (error) {
    console.warn("Permission check error:", error);
    return RESULTS.UNAVAILABLE;
  }
}

/**
 * Request a single permission
 */
export async function requestPermission(permission) {
  if (!permission) return RESULTS.UNAVAILABLE;
  
  try {
    const result = await request(permission);
    return result;
  } catch (error) {
    console.warn("Permission request error:", error);
    return RESULTS.BLOCKED;
  }
}

/**
 * Request location permission (foreground)
 */
export async function requestLocationPermission() {
  const permission = ISOLATION_PERMISSIONS.LOCATION;
  const status = await checkPermission(permission);
  
  if (status === RESULTS.GRANTED) {
    return true;
  }
  
  const result = await requestPermission(permission);
  return result === RESULTS.GRANTED;
}

/**
 * Request background location permission (must be called after foreground is granted)
 */
export async function requestBackgroundLocationPermission() {
  // First check if foreground is granted
  const foregroundStatus = await checkPermission(ISOLATION_PERMISSIONS.LOCATION);
  
  if (foregroundStatus !== RESULTS.GRANTED) {
    Alert.alert(
      "Location Required",
      "Please grant foreground location permission first.",
      [{ text: "OK" }]
    );
    return false;
  }
  
  const permission = ISOLATION_PERMISSIONS.BACKGROUND_LOCATION;
  const status = await checkPermission(permission);
  
  if (status === RESULTS.GRANTED) {
    return true;
  }
  
  // On Android 11+, show explanation
  if (Platform.OS === "android") {
    Alert.alert(
      "Background Location",
      "To detect social isolation patterns, we need to track your movement in the background. This helps identify changes in mobility that may indicate loneliness risk.\n\nPlease select 'Allow all the time' on the next screen.",
      [{ text: "Continue", onPress: async () => {
        await requestPermission(permission);
      }}]
    );
  }
  
  const result = await requestPermission(permission);
  return result === RESULTS.GRANTED;
}

/**
 * Request Bluetooth permissions (Android 12+)
 */
export async function requestBluetoothPermissions() {
  if (Platform.OS !== "android") return true;
  
  const scanPerm = ISOLATION_PERMISSIONS.BLUETOOTH_SCAN;
  const connectPerm = ISOLATION_PERMISSIONS.BLUETOOTH_CONNECT;
  
  try {
    const scanResult = await requestPermission(scanPerm);
    // We don't need CONNECT for passive scanning, but request it anyway
    if (connectPerm) {
      await requestPermission(connectPerm);
    }
    
    return scanResult === RESULTS.GRANTED;
  } catch (error) {
    console.warn("Bluetooth permission error:", error);
    return false;
  }
}

/**
 * Request call log permission (optional)
 */
export async function requestCallLogPermission() {
  if (Platform.OS !== "android") return false;
  
  const permission = ISOLATION_PERMISSIONS.CALL_LOG;
  const result = await requestPermission(permission);
  return result === RESULTS.GRANTED;
}

/**
 * Request SMS permission (optional)
 */
export async function requestSMSPermission() {
  if (Platform.OS !== "android") return false;
  
  const permission = ISOLATION_PERMISSIONS.SMS;
  const result = await requestPermission(permission);
  return result === RESULTS.GRANTED;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  const permission = ISOLATION_PERMISSIONS.NOTIFICATIONS;
  if (!permission) return true; // Not needed on this platform
  
  const result = await requestPermission(permission);
  return result === RESULTS.GRANTED;
}

/**
 * Request all essential permissions for isolation detection
 */
export async function requestAllEssentialPermissions() {
  const results = {
    location: false,
    backgroundLocation: false,
    bluetooth: false,
    notifications: false,
  };
  
  // 1. Location (foreground)
  results.location = await requestLocationPermission();
  
  // 2. Background location (if foreground granted)
  if (results.location) {
    results.backgroundLocation = await requestBackgroundLocationPermission();
  }
  
  // 3. Bluetooth
  results.bluetooth = await requestBluetoothPermissions();
  
  // 4. Notifications
  results.notifications = await requestNotificationPermission();
  
  return results;
}

/**
 * Check all permission statuses
 */
export async function checkAllPermissions() {
  const statuses = {
    location: RESULTS.DENIED,
    backgroundLocation: RESULTS.DENIED,
    bluetooth: RESULTS.DENIED,
    callLog: RESULTS.DENIED,
    sms: RESULTS.DENIED,
    notifications: RESULTS.DENIED,
  };
  
  if (ISOLATION_PERMISSIONS.LOCATION) {
    statuses.location = await checkPermission(ISOLATION_PERMISSIONS.LOCATION);
  }
  
  if (ISOLATION_PERMISSIONS.BACKGROUND_LOCATION) {
    statuses.backgroundLocation = await checkPermission(ISOLATION_PERMISSIONS.BACKGROUND_LOCATION);
  }
  
  if (ISOLATION_PERMISSIONS.BLUETOOTH_SCAN) {
    statuses.bluetooth = await checkPermission(ISOLATION_PERMISSIONS.BLUETOOTH_SCAN);
  }
  
  if (ISOLATION_PERMISSIONS.CALL_LOG) {
    statuses.callLog = await checkPermission(ISOLATION_PERMISSIONS.CALL_LOG);
  }
  
  if (ISOLATION_PERMISSIONS.SMS) {
    statuses.sms = await checkPermission(ISOLATION_PERMISSIONS.SMS);
  }
  
  if (ISOLATION_PERMISSIONS.NOTIFICATIONS) {
    statuses.notifications = await checkPermission(ISOLATION_PERMISSIONS.NOTIFICATIONS);
  }
  
  return statuses;
}

/**
 * Open app settings
 */
export function openAppSettings() {
  Linking.openSettings();
}

/**
 * Show rationale for permissions
 */
export function showPermissionRationale(permissionType) {
  const rationales = {
    location: {
      title: "Location Permission",
      message: "We use your location data to analyze mobility patterns that may indicate social isolation. All data is stored locally and aggregated for privacy.",
    },
    bluetooth: {
      title: "Bluetooth Permission", 
      message: "We scan nearby Bluetooth devices (without identifying them) to estimate social proximity and face-to-face interactions.",
    },
    callLog: {
      title: "Call Log Permission",
      message: "We analyze call frequency and duration (not content) to measure social connectivity. This is optional and can be disabled anytime.",
    },
    usage: {
      title: "Usage Access",
      message: "We need to analyze your app usage patterns to detect behaviors associated with social isolation. No app content is accessed.",
    },
  };
  
  const rationale = rationales[permissionType];
  if (rationale) {
    Alert.alert(rationale.title, rationale.message, [{ text: "OK" }]);
  }
}
