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

// ── Safely get native module with null check ──
const SettingsAccess = NativeModules?.SettingsAccess || null;

// ── Helper to check if native module is available ──
const isSettingsAccessAvailable = () => SettingsAccess !== null;

export const settingsAccess = {

  // ── Usage stats access (native bridge) ──
  hasUsageStatsAccess: async () => {
    if (!isSettingsAccessAvailable()) {
      console.warn("⚠️ SettingsAccess native module not available");
      return false;
    }
    try {
      return await SettingsAccess.hasUsageStatsAccess();
    } catch (e) {
      console.error("Usage stats access error:", e.message);
      return false;
    }
  },

  // ── DND access (native bridge) ──
  hasDndAccess: async () => {
    if (!isSettingsAccessAvailable()) {
      console.warn("⚠️ SettingsAccess native module not available");
      return false;
    }
    try {
      return await SettingsAccess.hasDndAccess();
    } catch (e) {
      console.error("DND access error:", e.message);
      return false;
    }
  },

  // ── Open usage access settings ──
  openUsageAccessSettings: () => {
    if (!isSettingsAccessAvailable()) {
      console.warn("⚠️ Cannot open settings: SettingsAccess module not available");
      return;
    }
    try {
      SettingsAccess.openUsageAccessSettings();
    } catch (e) {
      console.error("Open usage access settings error:", e.message);
    }
  },

  // ── Open DND settings ──
  openDndAccessSettings: () => {
    if (!isSettingsAccessAvailable()) {
      console.warn("⚠️ Cannot open settings: SettingsAccess module not available");
      return;
    }
    try {
      SettingsAccess.openDndAccessSettings();
    } catch (e) {
      console.error("Open DND settings error:", e.message);
    }
  },

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