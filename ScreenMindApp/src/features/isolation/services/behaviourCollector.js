import { NativeModules, Platform } from "react-native";
import { upsertTodayBehaviour } from "./behaviourStorage";

const { MetricsBridge, UsageStatsBridge } = NativeModules;

// helper (avoid crash if module missing)
function getModule() {
  return MetricsBridge || UsageStatsBridge || null;
}

/**
 * Call this:
 * - when app opens (foreground)
 * - periodically in background (WorkManager later)
 */
export async function collectAndStoreBehaviour() {
  if (Platform.OS !== "android") return null;

  const m = getModule();
  if (!m) {
    console.log("❌ No native Metrics module found (MetricsBridge/UsageStatsBridge).");
    return null;
  }

  // 👉 These function names MUST match your native module functions.
  // If yours are different, rename here.
  const unlocks = (await safeCall(() => m.getUnlockCountToday?.())) ?? null;
  const nightUsageMinutes = (await safeCall(() => m.getNightUsageMinutesToday?.())) ?? null;

  const screenTimeMinutes =
    (await safeCall(() => m.getTotalScreenTimeMinutesToday?.())) ?? null;

  const socialMinutes =
    (await safeCall(() => m.getSocialAppMinutesToday?.())) ?? null;

  const socialPct =
    screenTimeMinutes && socialMinutes != null && screenTimeMinutes > 0
      ? Math.round((socialMinutes / screenTimeMinutes) * 100)
      : null;

  const saved = await upsertTodayBehaviour({
    unlocks,
    nightUsageMinutes,
    screenTimeMinutes,
    socialMinutes,
    socialPct,
  });

  return saved;
}

async function safeCall(fn) {
  try {
    const v = await fn();
    return v;
  } catch (e) {
    return null;
  }
}
