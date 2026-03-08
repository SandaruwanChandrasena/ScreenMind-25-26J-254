/**
 * realUsageAdapter.js
 *
 * Adapts extracted usage features (from extractUsageFeatures.js)
 * into the structured format expected by the ML mental health model.
 *
 * Works for both real device data and mock/emulator data.
 */

// ✅ FIX: top-level import instead of require() inside function
import { extractUsageFeatures } from "./extractUsageFeatures";

/**
 * Adapt real usage features into model-ready input format.
 *
 * @param {Object} features - output from extractUsageFeatures()
 * @returns {Object} model-ready usage data object
 */
export function adaptRealUsageToModel(features = {}) {
  const totalScreenTimeMin  = Number(features?.totalScreenTimeMin  || 0);
  const socialMediaMin      = Number(features?.socialMediaMin      || 0);
  const communicationMin    = Number(features?.communicationMin    || 0);
  const videoMin            = Number(features?.videoMin            || 0);
  const browserMin          = Number(features?.browserMin          || 0);
  const appCount            = Number(features?.appCount            || 0);

  // ✅ FIX: use real unlockCount from features if available, else 0.
  // Previously this was a made-up formula (totalScreenTimeMin / 4)
  // which caused getUnlockCount errors. Add a real native method
  // to get accurate unlock counts in the future.
  const unlockCount = Number(features?.unlockCount ?? 0);

  const avgSessionMin = unlockCount > 0
    ? Math.max(1, Math.round(totalScreenTimeMin / Math.max(unlockCount / 2, 1)))
    : Math.max(1, Math.round(totalScreenTimeMin / 10)); // safe fallback

  const gamingMin = Math.max(0, Math.round(videoMin * 0.3));

  // Night usage: not directly available — can be improved later
  // with Android UsageEvents API to detect late-night sessions
  const nightUsageMin = 0;

  return {
    date:               new Date().toISOString(),
    totalScreenTimeMin,
    nightUsageMin,
    unlockCount,
    avgSessionMin,
    socialMediaMin,
    gamingMin,
    communicationMin,
    videoMin,
    browserMin,
    appCount,
    topApps:            features?.topApps        || [],
    source:             "android-usage-stats",
  };
}

/**
 * Quick helper — goes straight from raw native data to model input.
 * Combines extractUsageFeatures + adaptRealUsageToModel in one step.
 *
 * @param {Array} rawUsageStats - raw array from getUsageStats()
 * @returns {Object} model-ready usage data object
 */
export function rawToModelInput(rawUsageStats = []) {
  const features = extractUsageFeatures(rawUsageStats);
  return adaptRealUsageToModel(features);
}