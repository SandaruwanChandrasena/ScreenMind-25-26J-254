import { NativeModules } from "react-native";

const { UsageStatsModule } = NativeModules;

/**
 * Get app usage statistics from Android
 * Returns: [{ packageName, totalTime }]
 */
export async function getUsageStats() {
  try {
    const result = await UsageStatsModule.getUsageStats();
    return result;
  } catch (error) {
    console.error("Usage stats error:", error);
    return [];
  }
}

/**
 * Request Usage Access permission if not granted
 */
export function requestUsagePermission() {
  if (UsageStatsModule.openUsageSettings) {
    UsageStatsModule.openUsageSettings();
  }
}