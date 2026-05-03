// export function computeDisruptionScore(summary) {
//   // summary from getSessionSummary()

//   let score = 0;
//   const durationHours = summary.durationMs / (1000 * 60 * 60);

//   // Example thresholds (adjust based on your study design)
//   if (summary.unlockCount >= 8) score += 2;
//   if (summary.notifCount >= 10) score += 2;
//   if (summary.screenOnCount >= 6) score += 1;
//   if (durationHours < 6) score += 2;

//   // If check-in exists, use it as "label/validation"
//   if (summary.checkIn?.sleep_quality != null) {
//     const q = Number(summary.checkIn.sleep_quality);
//     // If 0–10 scale, treat <=4 as poor. If 1–5 scale, treat <=2 as poor.
//     if (q <= 4) score += 1;
//   }

//   let risk = "Low";
//   if (score >= 6) risk = "High";
//   else if (score >= 3) risk = "Medium";

//   // Explainability (top reasons)
//   const reasons = [];
//   if (summary.unlockCount >= 8) reasons.push("High unlock count during sleep window");
//   if (summary.notifCount >= 10) reasons.push("Many notifications during sleep window");
//   if (durationHours < 6) reasons.push("Estimated sleep duration is low");
//   if (summary.screenOnCount >= 6) reasons.push("Frequent screen on events at night");

//   return { score, risk, reasons: reasons.slice(0, 3) };
// }

// src/features/sleep/services/sleepScoring.js

/**
 * SLEEP DISRUPTION RISK SCORE
 * 
 * Formula:
 * RISK = (W1×LST) + (W2×SI) + (W3×NU) + 
 *        (W4×SMU) + (W5×SR) + (W6×RS)
 * 
 * Where:
 * LST = Late Screen Time Score
 * SI  = Sleep Interruption Score  
 * NU  = Notification Urgency Score
 * SMU = Social Media Usage Score
 * SR  = Snoring Risk Score
 * RS  = Restlessness Score
 */

// Weights (must sum to 1.0)
const WEIGHTS = {
  LST: 0.25,  // Late screen time - most important
  SI:  0.18,  // Sleep interruptions
  NU:  0.12,  // Notification response
  SMU: 0.15,  // Social media usage
  SR:  0.10,  // Snoring
  RS:  0.05,  // Restlessness
  DUR: 0.15,  // Short total sleep duration
};

// Weights when snoring is disabled (redistribute SR weight)
const WEIGHTS_NO_SNORE = {
  LST: 0.27,
  SI:  0.19,
  NU:  0.14,
  SMU: 0.20,
  SR:  0.00,
  RS:  0.05,
  DUR: 0.15,
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/**
 * LST: Late Screen Time Score
 * Based on minutes of screen use after 10PM
 * Max reference: 120 minutes
 */
function calcLST(screenTimeMinsAfter10PM) {
  return clamp((screenTimeMinsAfter10PM / 120) * 100);
}

/**
 * SI: Sleep Interruption Score
 * Based on number of night unlocks
 * Max reference: 10 unlocks
 */
function calcSI(nightUnlocks) {
  return clamp((nightUnlocks / 10) * 100);
}

/**
 * NU: Notification Urgency Score
 * Based on ratio of responded notifications at night
 */
function calcNU(respondedNightNotifs, totalNightNotifs) {
  if (totalNightNotifs === 0) return 0;
  return clamp((respondedNightNotifs / totalNightNotifs) * 100);
}

/**
 * SMU: Social Media Usage Score
 * Based on social media minutes after 10PM
 * Max reference: 90 minutes
 */
function calcSMU(socialMediaMinsAfter10PM) {
  return clamp((socialMediaMinsAfter10PM / 90) * 100);
}

/**
 * SR: Snoring Risk Score
 * Based on snoring duration in minutes
 * Max reference: 60 minutes
 */
function calcSR(snoringDurationMins) {
  return clamp((snoringDurationMins / 60) * 100);
}

/**
 * RS: Restlessness Score
 * Based on % of movement windows classified as restless
 */
function calcRS(restlessnessPercent) {
  return clamp(restlessnessPercent);
}

/**
 * DUR: Short total sleep duration score
 * Higher when the session length is short.
 * Reference: 8 hours should be low risk; 4 hours or less should be high risk.
 */
function calcDUR(durationHours) {
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return 100;
  }

  const shortfallHours = Math.max(0, 8 - durationHours);
  return clamp((shortfallHours / 4) * 100);
}

/**
 * Subjective adjustment from morning check-in
 * Combines sensor data (70%) with user feeling (30%)
 */
function applySubjectiveAdjustment(riskScore, checkIn) {
  if (!checkIn) return riskScore;

  const quality = Number(checkIn.sleep_quality ?? 5);
  const refreshed = Number(checkIn.refreshed ?? 5);

  // Both on 0-10 scale
  const subjectiveScore = ((quality / 10) + (refreshed / 10)) / 2 * 100;
  const subjectivePoor = 100 - subjectiveScore;

  // 70% objective, 30% subjective
  const finalScore = (0.70 * riskScore) + (0.30 * subjectivePoor);
  return clamp(Math.round(finalScore));
}

function applyMinimumDurationFloor(score, durationHours) {
  if (!Number.isFinite(durationHours) || durationHours <= 4) {
    return Math.max(score, 34);
  }

  return score;
}

/**
 * Main scoring function
 * Call this with summary data from getSessionSummary()
 */
export function computeDisruptionScore(summary, options = {}) {
  const {
    snoringEnabled = false,
    snoringDurationMins = 0,
    restlessnessPercent = 0,
    socialMediaMinsAfter10PM = 0,
    respondedNightNotifs = 0,
  } = options;

  const correctedDurationMs = summary.checkIn?.sleep_started_at && summary.checkIn?.wake_time
    ? Math.max(0, Number(summary.checkIn.wake_time) - Number(summary.checkIn.sleep_started_at))
    : (summary.durationMs ?? 0);
  const durationHours = correctedDurationMs / (1000 * 60 * 60);

  // Calculate screen time after 10PM
  // Using screenOnCount as proxy (each screen-on ≈ 8 min average)
  const screenTimeMins = (summary.screenOnCount ?? 0) * 8;

  // Calculate each component score (0-100)
  const LST = calcLST(screenTimeMins);
  const SI  = calcSI(summary.unlockCount ?? 0);
  const NU  = calcNU(
    respondedNightNotifs, 
    summary.notifCount ?? 0
  );
  const SMU = calcSMU(socialMediaMinsAfter10PM);
  const SR  = snoringEnabled ? calcSR(snoringDurationMins) : 0;
  const RS  = calcRS(restlessnessPercent);
  const DUR = calcDUR(durationHours);

  // Select weights based on snoring availability
  const W = snoringEnabled ? WEIGHTS : WEIGHTS_NO_SNORE;

  // Calculate weighted risk score
  let riskScore = 
    (W.LST * LST) +
    (W.SI  * SI)  +
    (W.NU  * NU)  +
    (W.SMU * SMU) +
    (W.SR  * SR)  +
    (W.RS  * RS)  +
    (W.DUR * DUR);

  riskScore = Math.round(clamp(riskScore));

  // Apply morning check-in adjustment if available
  const finalScore = applySubjectiveAdjustment(
    riskScore, 
    summary.checkIn
  );
  const flooredScore = applyMinimumDurationFloor(finalScore, durationHours);

  // Determine risk category
  let risk = "Low";
  if (flooredScore >= 67) risk = "High";
  else if (flooredScore >= 34) risk = "Medium";

  // Build explanation (for dashboard display)
  const reasons = buildReasons({
    LST, SI, NU, SMU, SR, RS, DUR,
    screenTimeMins,
    unlockCount: summary.unlockCount,
    notifCount: summary.notifCount,
    snoringDurationMins,
    durationHours,
  });

  // Component breakdown (for charts)
  const breakdown = {
    "Late Screen Time": Math.round(W.LST * LST),
    "Sleep Interruptions": Math.round(W.SI * SI),
    "Notifications": Math.round(W.NU * NU),
    "Social Media": Math.round(W.SMU * SMU),
    "Snoring": Math.round(W.SR * SR),
    "Restlessness": Math.round(W.RS * RS),
    "Duration": Math.round(W.DUR * DUR),
  };

  return { 
    score: flooredScore, 
    risk, 
    reasons,
    breakdown,
    components: { LST, SI, NU, SMU, SR, RS, DUR },
  };
}

function buildReasons({
    LST, SI, NU, SMU, SR, RS, DUR,
  screenTimeMins, unlockCount, notifCount,
  snoringDurationMins, durationHours,
}) {
  const reasons = [];

  if (LST > 70) reasons.push(
    `High screen use before sleep (${screenTimeMins} min after 10PM)`
  );
  if (SI > 60) reasons.push(
    `Frequent phone unlocks at night (${unlockCount} times)`
  );
  if (NU > 60) reasons.push(
    `Responded to many night notifications (${notifCount})`
  );
  if (SMU > 60) reasons.push(
    "Heavy social media use before sleep"
  );
  if (SR > 50) reasons.push(
    `Snoring detected (${snoringDurationMins} minutes)`
  );
  if (RS > 60) reasons.push(
    "High movement detected during sleep window"
  );
  if (durationHours <= 0) reasons.push(
    "No valid sleep duration recorded"
  );
  else if (durationHours < 4) reasons.push(
    `Short sleep duration (${durationHours.toFixed(1)} hours)`
  );

  return reasons.slice(0, 4);
}