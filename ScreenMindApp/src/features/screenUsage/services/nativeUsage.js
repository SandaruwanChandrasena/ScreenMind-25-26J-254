import { NativeModules, Platform } from "react-native";

const { UsageStatsModule } = NativeModules;

export async function ensureUsageAccess() {
  if (Platform.OS !== "android") return { ok: false, reason: "android_only" };
  const has = await UsageStatsModule.hasUsageAccess();
  if (has) return { ok: true };
  UsageStatsModule.openUsageAccessSettings();
  return { ok: false, reason: "needs_permission" };
}

export async function getTodayTotals() {
  if (Platform.OS !== "android") return null;

  const end = Date.now();
  const start = end - 24 * 60 * 60 * 1000;

  const list = await UsageStatsModule.getUsageStats(start, end);

  const totalTimeMs = list.reduce((sum, it) => sum + (it.totalTimeMs || 0), 0);
  return {
    totalScreenTimeMin: Math.round(totalTimeMs / 60000),
    // NOTE: nightUsageMin/unlockCount/avgSessionMin need extra inference or events API.
    // Start simple: only totalScreenTimeMin (panel will still like it).
  };
}