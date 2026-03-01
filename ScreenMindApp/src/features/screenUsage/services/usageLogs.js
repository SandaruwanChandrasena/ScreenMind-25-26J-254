// src/features/screenUsage/services/usageLogs.js

// ✅ Strong correlation version:
// Higher PHQ-9/GAD-7 -> higher total screen time, more night usage, more unlocks,
// longer avg session, more social media minutes, more gaming minutes.

export function generateSimulatedDailyUsage({ phq9Score = 0, gad7Score = 0 } = {}) {
  // distress index 0..1
  const d = distressIndex(phq9Score, gad7Score);

  // total screen time (min/day): low ~90-240, high ~420-720
  const baseScreen = randInt(90, 240);
  const extraScreen = Math.round(d * randInt(330, 520));
  const totalScreenTimeMin = clamp(baseScreen + extraScreen, 60, 720);

  // unlock count: low ~20-60, high ~120-190
  const baseUnlocks = randInt(20, 60);
  const extraUnlocks = Math.round(d * randInt(90, 140));
  const unlockCount = clamp(baseUnlocks + extraUnlocks, 10, 200);

  // night usage: low ~0-20, high ~120-240 (but never > 60% of total)
  const baseNight = randInt(0, 20);
  const extraNight = Math.round(d * randInt(140, 240));
  const nightCap = Math.min(240, Math.floor(totalScreenTimeMin * 0.6));
  const nightUsageMin = clamp(baseNight + extraNight, 0, nightCap);

  // avg session: higher distress tends to longer sessions (doom scrolling)
  // also keep it realistic
  const avgFromTotals = Math.round(totalScreenTimeMin / Math.max(unlockCount, 1));
  const avgBoost = Math.round(d * randInt(5, 15));
  const avgSessionMin = clamp(avgFromTotals + avgBoost, 1, 60);

  // social media: increases with distress
  const socialBase = Math.floor(totalScreenTimeMin * rand(0.15, 0.35));
  const socialExtra = Math.floor(totalScreenTimeMin * d * rand(0.15, 0.25));
  const socialMediaMin = clamp(socialBase + socialExtra, 0, Math.floor(totalScreenTimeMin * 0.7));

  // gaming: small/medium increase with distress (optional)
  const gamingBase = Math.floor(totalScreenTimeMin * rand(0.05, 0.18));
  const gamingExtra = Math.floor(totalScreenTimeMin * d * rand(0.05, 0.12));
  const gamingMin = clamp(gamingBase + gamingExtra, 0, Math.floor(totalScreenTimeMin * 0.5));

  return {
    date: new Date().toISOString(),
    // ✅ same field names as your original file
    totalScreenTimeMin,
    nightUsageMin,
    unlockCount,
    avgSessionMin,
    socialMediaMin,
    gamingMin,

    // ✅ optional debug fields (helpful for research panel)
    distressIndex: Number(d.toFixed(2)),
    inputScores: { phq9Score, gad7Score },
    source: "distress-weighted-simulation",
  };
}

export function computeUsageRisk(log) {
  // normalize to 0..1
  const screenTimeScore = clamp01(log.totalScreenTimeMin / 600); // 10h => 1
  const nightScore = clamp01(log.nightUsageMin / 180); // 3h => 1
  const unlockScore = clamp01(log.unlockCount / 120);
  const sessionScore = clamp01(log.avgSessionMin / 30);

  // weighted usage risk
  const usageRisk =
    0.40 * screenTimeScore +
    0.30 * nightScore +
    0.20 * unlockScore +
    0.10 * sessionScore;

  return {
    usageRisk, // 0..1
    breakdown: {
      screenTimeScore,
      nightScore,
      unlockScore,
      sessionScore,
    },
  };
}

/* ---------------- helpers ---------------- */

function distressIndex(phq9Score = 0, gad7Score = 0) {
  const phqN = clamp(phq9Score / 27, 0, 1);
  const gadN = clamp(gad7Score / 21, 0, 1);

  // Strong weighting
  return clamp(0.6 * phqN + 0.4 * gadN, 0, 1);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}