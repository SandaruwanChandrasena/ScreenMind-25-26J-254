export function computeDisruptionScore(summary) {
  // summary from getSessionSummary()

  let score = 0;
  const durationHours = summary.durationMs / (1000 * 60 * 60);

  // Example thresholds (adjust based on your study design)
  if (summary.unlockCount >= 8) score += 2;
  if (summary.notifCount >= 10) score += 2;
  if (summary.screenOnCount >= 6) score += 1;
  if (durationHours < 6) score += 2;

  // If check-in exists, use it as "label/validation"
  if (summary.checkIn?.sleep_quality != null) {
    const q = Number(summary.checkIn.sleep_quality);
    // If 0–10 scale, treat <=4 as poor. If 1–5 scale, treat <=2 as poor.
    if (q <= 4) score += 1;
  }

  let risk = "Low";
  if (score >= 6) risk = "High";
  else if (score >= 3) risk = "Medium";

  // Explainability (top reasons)
  const reasons = [];
  if (summary.unlockCount >= 8) reasons.push("High unlock count during sleep window");
  if (summary.notifCount >= 10) reasons.push("Many notifications during sleep window");
  if (durationHours < 6) reasons.push("Estimated sleep duration is low");
  if (summary.screenOnCount >= 6) reasons.push("Frequent screen on events at night");

  return { score, risk, reasons: reasons.slice(0, 3) };
}
