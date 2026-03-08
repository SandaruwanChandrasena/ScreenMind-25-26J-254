/**
 * realUsageAdapter.js
 *
 * Adapts extracted usage features (from extractUsageFeatures.js)
 * into the structured format expected by the ML mental health model.
 *
 * Works for both real device data and mock/emulator data.
 */

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

  // Derived approximations for fields not directly available via UsageStats API
  const unlockCount   = Math.max(10, Math.round(totalScreenTimeMin / 4));
  const avgSessionMin = Math.max(
    1,
    Math.round(totalScreenTimeMin / Math.max(unlockCount / 2, 1))
  );
  const gamingMin     = Math.max(0, Math.round(videoMin * 0.3));

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
  const { extractUsageFeatures } = require("./extractUsageFeatures");
  const features = extractUsageFeatures(rawUsageStats);
  return adaptRealUsageToModel(features);
}