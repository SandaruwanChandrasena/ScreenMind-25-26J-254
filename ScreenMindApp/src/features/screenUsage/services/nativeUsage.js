import { NativeModules, Platform } from "react-native";

const { UsageStatsModule } = NativeModules;

/**
 * Ensure the app has Usage Access permission.
 * If not granted, opens the system settings screen.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
export async function ensureUsageAccess() {
  if (Platform.OS !== "android") {
    return { ok: false, reason: "android_only" };
  }

  if (!UsageStatsModule) {
    console.warn("[nativeUsage] UsageStatsModule not available");
    return { ok: false, reason: "module_unavailable" };
  }

  try {
    const has = await UsageStatsModule.hasUsageAccess();
    if (has) return { ok: true };

    UsageStatsModule.openUsageAccessSettings?.() ||
    UsageStatsModule.openUsageSettings?.();

    return { ok: false, reason: "needs_permission" };
  } catch (error) {
    console.error("[nativeUsage] ensureUsageAccess error:", error);
    return { ok: false, reason: "error" };
  }
}

/**
 * Get today's total screen time and basic usage summary.
 * Uses the last 24 hours as the time range.
 *
 * @returns {{ totalScreenTimeMin: number } | null}
 */
export async function getTodayTotals() {
  if (Platform.OS !== "android") return null;

  if (!UsageStatsModule) {
    console.warn("[nativeUsage] UsageStatsModule not available");
    return null;
  }

  try {
    const end   = Date.now();
    const start = end - 24 * 60 * 60 * 1000;

    const list = await UsageStatsModule.getUsageStats(start, end);

    if (!Array.isArray(list) || list.length === 0) {
      console.warn("[nativeUsage] getTodayTotals: empty result from native");
      return null;
    }

    // ✅ FIX: handle both field names from native module
    const totalTimeMs = list.reduce((sum, it) => {
      const time = it.totalTimeInForeground ?? it.totalTimeMs ?? 0;
      return sum + Number(time);
    }, 0);

    return {
      totalScreenTimeMin: Math.round(totalTimeMs / 60000),
    };

  } catch (error) {
    console.error("[nativeUsage] getTodayTotals error:", error);
    return null;
  }
}