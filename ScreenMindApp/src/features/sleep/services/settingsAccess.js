// import { NativeModules } from "react-native";

// const { SettingsAccess } = NativeModules;

// export const settingsAccess = {
//   hasUsageStatsAccess: async () => SettingsAccess.hasUsageStatsAccess(),
//   hasNotificationListenerAccess: async () => SettingsAccess.hasNotificationListenerAccess(),
//   hasDndAccess: async () => SettingsAccess.hasDndAccess(),

//   openUsageAccessSettings: () => SettingsAccess.openUsageAccessSettings(),
//   openNotificationAccessSettings: () => SettingsAccess.openNotificationAccessSettings(),
//   openDndAccessSettings: () => SettingsAccess.openDndAccessSettings(),
// };

// src/features/sleep/services/settingsAccess.js

// src/features/sleep/services/settingsAccess.js

import { NativeModules, Platform } from "react-native";
import RNAndroidNotificationListener
  from "react-native-android-notification-listener";

const { SettingsAccess } = NativeModules;

export const settingsAccess = {

  // ── UNCHANGED (keep exactly as is) ──
  hasUsageStatsAccess: async () =>
    SettingsAccess.hasUsageStatsAccess(),

  hasDndAccess: async () =>
    SettingsAccess.hasDndAccess(),

  openUsageAccessSettings: () =>
    SettingsAccess.openUsageAccessSettings(),

  openDndAccessSettings: () =>
    SettingsAccess.openDndAccessSettings(),

  // ── CHANGED: was using SettingsAccess native bridge ──
  // ── NOW: uses library instead ──
  hasNotificationListenerAccess: async () => {
    if (Platform.OS !== "android") return false;
    try {
      const status = await RNAndroidNotificationListener
        .getPermissionStatus();
      // 'authorized' means user enabled it in Android settings
      return status === "authorized";
    } catch (e) {
      console.log("Notification access check error:", e);
      return false;
    }
  },

  // ── CHANGED: was using SettingsAccess native bridge ──
  // ── NOW: uses library instead ──
  openNotificationAccessSettings: () => {
    if (Platform.OS !== "android") return;
    try {
      RNAndroidNotificationListener.requestPermission();
    } catch (e) {
      console.log("Open notification settings error:", e);
    }
  },
};