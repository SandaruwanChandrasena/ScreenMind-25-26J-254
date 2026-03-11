// src/features/screenUsage/services/usageLogs.js

// ✅ 1) Generate ONE day (distress-correlated)
export function generateSimulatedDailyUsage({ phq9Score = 0, gad7Score = 0, date = null } = {}) {
  const d = distressIndex(phq9Score, gad7Score);

  const baseScreen = randInt(90, 240);
  const extraScreen = Math.round(d * randInt(330, 520));
  const totalScreenTimeMin = clamp(baseScreen + extraScreen, 60, 720);

  const baseUnlocks = randInt(20, 60);
  const extraUnlocks = Math.round(d * randInt(90, 140));
  const unlockCount = clamp(baseUnlocks + extraUnlocks, 10, 200);

  const baseNight = randInt(0, 20);
  const extraNight = Math.round(d * randInt(140, 240));
  const nightCap = Math.min(240, Math.floor(totalScreenTimeMin * 0.6));
  const nightUsageMin = clamp(baseNight + extraNight, 0, nightCap);

  const avgFromTotals = Math.round(totalScreenTimeMin / Math.max(unlockCount, 1));
  const avgBoost = Math.round(d * randInt(5, 15));
  const avgSessionMin = clamp(avgFromTotals + avgBoost, 1, 60);

  const socialBase = Math.floor(totalScreenTimeMin * rand(0.15, 0.35));
  const socialExtra = Math.floor(totalScreenTimeMin * d * rand(0.15, 0.25));
  const socialMediaMin = clamp(socialBase + socialExtra, 0, Math.floor(totalScreenTimeMin * 0.7));

  const gamingBase = Math.floor(totalScreenTimeMin * rand(0.05, 0.18));
  const gamingExtra = Math.floor(totalScreenTimeMin * d * rand(0.05, 0.12));
  const gamingMin = clamp(gamingBase + gamingExtra, 0, Math.floor(totalScreenTimeMin * 0.5));

  return {
    date: date || new Date().toISOString(),
    totalScreenTimeMin,
    nightUsageMin,
    unlockCount,
    avgSessionMin,
    socialMediaMin,
    gamingMin,
    distressIndex: Number(d.toFixed(2)),
    inputScores: { phq9Score, gad7Score },
    source: "distress-weighted-simulation",
  };
}

// ✅ 2) Generate a 7-day window (NEWEST first)
// usageWindow[0] = today, usageWindow[6] = 6 days ago
export function generateSimulatedUsageWindow(days = 7, { phq9Score = 0, gad7Score = 0 } = {}) {
  const out = [];
  const now = Date.now();

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();
    out.push(generateSimulatedDailyUsage({ phq9Score, gad7Score, date: dayDate }));
  }
  return out; // ✅ newest -> oldest
}

// ✅ 3) Usage risk (0..1)
export function computeUsageRisk(log) {
  const screenTimeScore = clamp01((log.totalScreenTimeMin ?? 0) / 600); // 10h => 1
  const nightScore = clamp01((log.nightUsageMin ?? 0) / 180); // 3h => 1
  const unlockScore = clamp01((log.unlockCount ?? 0) / 120);
  const sessionScore = clamp01((log.avgSessionMin ?? 0) / 30);

  const usageRisk = 0.4 * screenTimeScore + 0.3 * nightScore + 0.2 * unlockScore + 0.1 * sessionScore;

  return {
    usageRisk: clamp01(usageRisk),
    breakdown: { screenTimeScore, nightScore, unlockScore, sessionScore },
  };
}

// ✅ 4) BPRI score (0..100) based on 7-day PATTERNS (not just 1 day)
export function computeBPRI(usageWindow = []) {
  if (!Array.isArray(usageWindow) || usageWindow.length < 3) {
    return { score: 0, label: "—", features: { consistency: 0, nightDrift: 0, checkingFreq: 0 } };
  }

  // We’ll use 3 pattern signals:
  // A) consistency: how stable your daily screen time is (high variance = higher risk)
  // B) night drift: whether night usage increases towards recent days
  // C) checking frequency: average unlocks

  const totals = usageWindow.map((d) => d.totalScreenTimeMin ?? 0);
  const nights = usageWindow.map((d) => d.nightUsageMin ?? 0);
  const unlocks = usageWindow.map((d) => d.unlockCount ?? 0);

  const meanTotal = avg(totals);
  const sdTotal = std(totals, meanTotal);

  // Consistency risk: more variation => higher risk (normalize)
  // If sdTotal >= 120 mins => strong instability
  const consistency = clamp01(sdTotal / 120);

  // Night drift: compare first half vs second half (newer days are earlier indexes because newest-first)
  // We want: if night usage is higher in recent days => higher risk
  const half = Math.floor(nights.length / 2);
  const recentAvgNight = avg(nights.slice(0, half)); // newest half
  const olderAvgNight = avg(nights.slice(half)); // older half
  const nightDriftRaw = recentAvgNight - olderAvgNight; // positive = worse
  const nightDrift = clamp01((nightDriftRaw + 60) / 120); // map roughly -60..+60 to 0..1

  // Checking frequency: normalize avg unlocks
  const checkingFreq = clamp01(avg(unlocks) / 140);

  // Weighted BPRI (0..100)
  const bpri01 = clamp01(0.4 * checkingFreq + 0.35 * nightDrift + 0.25 * consistency);
  const score = Math.round(bpri01 * 100);

  return {
    score,
    label: score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low",
    features: {
      consistency: Number(consistency.toFixed(3)),
      nightDrift: Number(nightDrift.toFixed(3)),
      checkingFreq: Number(checkingFreq.toFixed(3)),
    },
  };
}

/* ---------------- helpers ---------------- */

function distressIndex(phq9Score = 0, gad7Score = 0) {
  const phqN = clamp(phq9Score / 27, 0, 1);
  const gadN = clamp(gad7Score / 21, 0, 1);
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
  return clamp(Number(v || 0), 0, 1);
}
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function std(arr, mean) {
  if (!arr.length) return 0;
  const v = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
  return Math.sqrt(v);
}