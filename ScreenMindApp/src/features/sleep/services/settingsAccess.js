import { NativeModules } from "react-native";

const { SettingsAccess } = NativeModules;

export const settingsAccess = {
  hasUsageStatsAccess: async () => SettingsAccess.hasUsageStatsAccess(),
  hasNotificationListenerAccess: async () => SettingsAccess.hasNotificationListenerAccess(),
  hasDndAccess: async () => SettingsAccess.hasDndAccess(),

  openUsageAccessSettings: () => SettingsAccess.openUsageAccessSettings(),
  openNotificationAccessSettings: () => SettingsAccess.openNotificationAccessSettings(),
  openDndAccessSettings: () => SettingsAccess.openDndAccessSettings(),
};
