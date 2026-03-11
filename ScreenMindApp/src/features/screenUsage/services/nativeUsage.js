import { NativeModules, Platform } from "react-native";

const { UsageStatsModule } = NativeModules;

/**
 * Returns [startOfToday (midnight), now] as timestamps.
 * ✅ FIX: use midnight-to-now instead of rolling 24h window.
 */
function getTodayRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end   = now.getTime();
  return { start, end };
}

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
 * ✅ FIX: Uses midnight → now instead of rolling last 24 hours.
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
    // ✅ FIX: today's range = midnight → now
    const { start, end } = getTodayRange();

    const list = await UsageStatsModule.getUsageStats(start, end);

    if (!Array.isArray(list) || list.length === 0) {
      console.warn("[nativeUsage] getTodayTotals: empty result from native");
      return null;
    }

    // ✅ handle both field names from native module
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