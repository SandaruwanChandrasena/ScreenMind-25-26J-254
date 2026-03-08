export function adaptRealUsageToModel(features = {}) {
  const totalScreenTimeMin = Number(features?.totalScreenTimeMin || 0);
  const socialMediaMin = Number(features?.socialMediaMin || 0);

  // simple approximations for your existing model structure
  const communicationMin = Number(features?.communicationMin || 0);
  const videoMin = Number(features?.videoMin || 0);

  const nightUsageMin = 0; // you can improve later
  const unlockCount = Math.max(10, Math.round(totalScreenTimeMin / 4));
  const avgSessionMin = Math.max(1, Math.round(totalScreenTimeMin / Math.max(unlockCount / 2, 1)));
  const gamingMin = Math.max(0, Math.round(videoMin * 0.3));

  return {
    date: new Date().toISOString(),
    totalScreenTimeMin,
    nightUsageMin,
    unlockCount,
    avgSessionMin,
    socialMediaMin,
    gamingMin,
    communicationMin,
    videoMin,
    source: "android-usage-stats",
  };
}