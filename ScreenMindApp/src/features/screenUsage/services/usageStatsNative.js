import { NativeModules, Platform } from "react-native";

const { UsageStatsModule } = NativeModules;

export async function ensureUsageAccess() {
  if (Platform.OS !== "android") return { ok: false, reason: "android_only" };
  const has = await UsageStatsModule.hasUsageAccess();
  if (has) return { ok: true };
  UsageStatsModule.openUsageAccessSettings();
  return { ok: false, reason: "needs_permission" };
}

export function requestUsagePermission() {
  if (UsageStatsModule?.openUsageSettings) {
    UsageStatsModule.openUsageSettings();
  }
}

// ✅ No params — matches the Kotlin: fun getUsageStats(promise: Promise)
export async function getUsageStats() {
  if (Platform.OS !== "android") return [];

  try {
    const result = await UsageStatsModule.getUsageStats(); // ✅ no start/end
    return result;
  } catch (error) {
    console.error("Usage stats error:", error);
    return [];
  }
}

export async function getTodayTotals() {
  if (Platform.OS !== "android") return null;

  try {
    const list = await UsageStatsModule.getUsageStats(); // ✅ no start/end
    const totalTimeMs = list.reduce((sum, it) =>
      sum + (it.totalTimeInForeground || 0), 0
    );
    return {
      totalScreenTimeMin: Math.round(totalTimeMs / 60000),
    };
  } catch (error) {
    console.error("getTodayTotals error:", error);
    return null;
  }
}