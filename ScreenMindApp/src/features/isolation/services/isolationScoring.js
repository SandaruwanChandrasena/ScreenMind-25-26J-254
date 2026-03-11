/**
 * isolationScoring.js
 *
 * Rule-based isolation risk scorer.
 * Input:  features object (from collectRealFeatures)
 *         prefs    object (which data types are enabled)
 * Output: { score, label, breakdown, used, reasons, suggestions }
 *
 * "score"      0–100  (higher = more risk)
 * "label"      "Low" | "Moderate" | "High"
 * "breakdown"  per-pillar raw 0–25 scores  { mobility, comm, beh, prox }
 * "used"       string[]  which pillars were active
 * "reasons"    { title, detail }[]  ranked explanations (for IsolationWhyScreen)
 * "suggestions" { title, detail }[] personalised actions (for IsolationSuggestionsScreen)
 *
 * ── NOTE ───────────────────────────────────────────────────────────────────
 *  This is intentionally kept as pure functions (no side effects, no imports)
 *  so it can later be swapped for a TensorFlow.js LSTM model output.
 *  The scoring thresholds below are informed by StudentLife / AWARE literature.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

/** Returns 0 (no risk) → 1 (full risk) when higher value is worse */
function riskHigherIsWorse(value, good, bad) {
  const t = (value - good) / (bad - good);
  return clamp(t, 0, 1);
}

/** Returns 0 (no risk) → 1 (full risk) when lower value is worse */
function riskLowerIsWorse(value, good, bad) {
  const t = (good - value) / (good - bad);
  return clamp(t, 0, 1);
}

// ─── Pillar scorers  (each returns 0–1) ─────────────────────────────────────

function mobilityRisk(f) {
  const items = [];

  // Daily distance: >3 km = fine, <300 m = very isolated
  items.push({
    key: "distance",
    r: riskLowerIsWorse(f.dailyDistanceMeters ?? 0, 3000, 300),
    label: "Low daily movement",
    detail: "Daily travel distance was significantly below a healthy baseline.",
  });

  // Time at home: <55 % = fine, >85 % = very isolated
  items.push({
    key: "home_time",
    r: riskHigherIsWorse(f.timeAtHomePct ?? 0, 55, 85),
    label: "High time at home",
    detail: "Most of the day was spent at one location without leaving.",
  });

  // Location entropy: >1.2 = fine, <0.3 = very low variety
  items.push({
    key: "entropy",
    r: riskLowerIsWorse(f.locationEntropy ?? 0, 1.2, 0.3),
    label: "Low location variety",
    detail: "Few distinct places were visited, indicating reduced environmental exposure.",
  });

  // Transitions per day: >6 = fine, <1 = no movement
  items.push({
    key: "transitions",
    r: riskLowerIsWorse(f.transitions ?? 0, 6, 1),
    label: "Very few location transitions",
    detail: "Movement between locations was minimal compared to a healthy average.",
  });

  const avg = items.reduce((s, x) => s + x.r, 0) / items.length;
  return { score: avg, items };
}

function communicationRisk(f, prefs) {
  const items = [];

  if (prefs.calls) {
    // Calls per day: >4 = fine, <0.5 = very low
    items.push({
      key: "calls",
      r: riskLowerIsWorse(f.callsPerDay ?? 0, 4, 0.5),
      label: "Reduced call frequency",
      detail: "Number of phone calls per day dropped below a healthy social baseline.",
    });

    // Unique contacts: >6 = fine, ≤1 = very isolated
    items.push({
      key: "contacts",
      r: riskLowerIsWorse(f.uniqueContacts ?? 0, 6, 1),
      label: "Few unique contacts",
      detail: "Social diversity was low — interactions concentrated on very few people.",
    });

    // Silence hours: <8 h = fine, >20 h = almost no contact
    items.push({
      key: "silence",
      r: riskHigherIsWorse(f.silenceHours ?? 0, 8, 20),
      label: "Long communication silence",
      detail: "Many hours passed without any call or message activity.",
    });
  }

  if (prefs.sms) {
    // SMS per day: >10 = fine, <1 = very low
    items.push({
      key: "sms",
      r: riskLowerIsWorse(f.smsPerDay ?? 0, 10, 1),
      label: "Low messaging activity",
      detail: "Text messaging frequency was well below a connected baseline.",
    });
  }

  if (!items.length) return { score: 0, items };
  const avg = items.reduce((s, x) => s + x.r, 0) / items.length;
  return { score: avg, items };
}

function behaviourRisk(f) {
  const items = [];

  // Night usage: <20 min = fine, >120 min = very disruptive
  items.push({
    key: "night",
    r: riskHigherIsWorse(f.nightUsageMinutes ?? 0, 20, 120),
    label: "High night-time phone usage",
    detail: "Late-night screen time was elevated, disrupting natural daily rhythms.",
  });

  // Unlocks per day: <45 = fine, >110 = compulsive checking
  items.push({
    key: "unlocks",
    r: riskHigherIsWorse(f.unlocks ?? 0, 45, 110),
    label: "Frequent phone checking",
    detail: "The device was unlocked very frequently, a marker of compulsive usage.",
  });

  // Rhythm irregularity: <0.2 = fine, >0.8 = very irregular
  items.push({
    key: "rhythm",
    r: riskHigherIsWorse(f.rhythmIrregularity ?? 0, 0.2, 0.8),
    label: "Irregular daily routine",
    detail: "Daily usage timing was inconsistent, suggesting disrupted circadian patterns.",
  });

  const avg = items.reduce((s, x) => s + x.r, 0) / items.length;
  return { score: avg, items };
}

function proximityRisk(f, prefs) {
  const items = [];

  if (prefs.bluetooth) {
    // Bluetooth avg devices: >8 = socially exposed, <1 = alone
    items.push({
      key: "bluetooth",
      r: riskLowerIsWorse(f.bluetoothAvgDevices ?? 0, 8, 1),
      label: "Low nearby-device exposure",
      detail: "Fewer Bluetooth devices were detected nearby, suggesting limited in-person social exposure.",
    });
  }

  if (prefs.wifi) {
    // WiFi diversity entropy: >1.2 = varied environments, <0.2 = same place always
    items.push({
      key: "wifi",
      r: riskLowerIsWorse(f.wifiDiversity ?? 0, 1.2, 0.2),
      label: "Low environment diversity",
      detail: "The device connected to very few distinct Wi-Fi networks, indicating limited environment change.",
    });
  }

  if (!items.length) return { score: 0, items };
  const avg = items.reduce((s, x) => s + x.r, 0) / items.length;
  return { score: avg, items };
}

// ─── Suggestion generator ────────────────────────────────────────────────────

function buildSuggestions(mobilityR, commR, behR, proxR, prefs) {
  // Collect all sub-items, sorted by raw risk score descending
  const allItems = [
    ...mobilityR.items.map((x) => ({ ...x, pillar: "mobility" })),
    ...(prefs.calls || prefs.sms ? commR.items.map((x) => ({ ...x, pillar: "comm" })) : []),
    ...behR.items.map((x) => ({ ...x, pillar: "beh" })),
    ...(prefs.bluetooth || prefs.wifi ? proxR.items.map((x) => ({ ...x, pillar: "prox" })) : []),
  ].sort((a, b) => b.r - a.r);

  // Map each problematic factor → an actionable suggestion
  const suggestionMap = {
    distance:    { title: "Take a walk outside",           detail: "Even 15–20 minutes of walking significantly improves daily distance and mood." },
    home_time:   { title: "Visit a nearby place",          detail: "A café, park, or library visit reduces the time spent at one location." },
    entropy:     { title: "Explore a new environment",     detail: "Going somewhere new increases location variety, which is linked to lower isolation risk." },
    transitions: { title: "Plan at least 2 outings today", detail: "Multiple location changes per day are associated with healthier social patterns." },
    calls:       { title: "Call a friend or family member",detail: "A 5-minute call counts — frequency matters more than duration for social wellbeing." },
    contacts:    { title: "Reach out to someone new",      detail: "Contact diversity is a strong predictor of social resilience." },
    silence:     { title: "Send a message right now",      detail: "Breaking a long communication silence, even briefly, reduces loneliness risk." },
    sms:         { title: "Text someone you haven't recently",detail: "Messaging variety keeps social connections warm." },
    night:       { title: "Put your phone away after 10 PM",detail: "Reducing night-time screen use improves sleep and daily rhythm." },
    unlocks:     { title: "Try a phone-free hour",         detail: "Frequent checking is linked to anxiety. A structured break helps reset the habit." },
    rhythm:      { title: "Set a consistent bedtime",      detail: "Keeping a regular daily schedule stabilises circadian rhythms." },
    bluetooth:   { title: "Spend time in shared spaces",   detail: "Being around other people — even in a library or gym — increases social exposure." },
    wifi:        { title: "Work or study in a different place", detail: "Changing your environment occasionally improves mood and reduces isolation." },
  };

  // Return top 4 suggestions based on worst factors
  return allItems
    .filter((x) => x.r > 0.25) // only suggest for meaningfully risky factors
    .slice(0, 4)
    .map((x) => suggestionMap[x.key] ?? { title: x.label, detail: x.detail });
}

// ─── Social / Withdraw breakdown (for IsolationStatsScreen) ─────────────────

function buildSocialWithdrawBreakdown(mobilityR, commR, behR, proxR, prefs) {
  // "Withdraw" = factors contributing to isolation risk (sorted by risk score)
  const withdrawItems = [
    ...mobilityR.items,
    ...(prefs.calls || prefs.sms ? commR.items : []),
    ...behR.items,
    ...(prefs.bluetooth || prefs.wifi ? proxR.items : []),
  ]
    .filter((x) => x.r > 0.1)
    .sort((a, b) => b.r - a.r)
    .slice(0, 5)
    .map((x) => ({
      label: x.label.toLowerCase().replace("low ", "").replace("high ", "").replace("few ", ""),
      pct:   Math.round(x.r * 100),
    }));

  // "Social" = inverse — what the user IS doing (r close to 0 = doing well)
  const socialItems = [
    ...mobilityR.items,
    ...(prefs.calls || prefs.sms ? commR.items : []),
    ...behR.items,
  ]
    .filter((x) => x.r < 0.4)
    .sort((a, b) => a.r - b.r)
    .slice(0, 5)
    .map((x) => ({
      label: x.key === "distance"    ? "walking / movement"
           : x.key === "calls"       ? "phone calls"
           : x.key === "contacts"    ? "social contacts"
           : x.key === "sms"         ? "messaging"
           : x.key === "entropy"     ? "location variety"
           : x.key === "transitions" ? "outings"
           : x.label.toLowerCase(),
      pct: Math.round((1 - x.r) * 100),
    }));

  return { socialItems, withdrawItems };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * computeIsolationRisk(features, prefs)
 *
 * @param {object} features  - from collectRealFeatures()
 * @param {object} prefs     - from getPrefs()
 * @returns {{
 *   score: number,
 *   label: string,
 *   breakdown: { mobility: number, comm: number, beh: number, prox: number },
 *   used: string[],
 *   reasons: { title: string, detail: string }[],
 *   suggestions: { title: string, detail: string }[],
 *   socialItems:   { label: string, pct: number }[],
 *   withdrawItems: { label: string, pct: number }[],
 * }}
 */
export function computeIsolationRisk(features, prefs) {
  // ── Pillar scores (0–1) ────────────────────────────────────────────────────
  const mobilityR = prefs.gps    ? mobilityRisk(features)                  : { score: 0, items: [] };
  const commR     = (prefs.calls || prefs.sms) ? communicationRisk(features, prefs) : { score: 0, items: [] };
  const behR      = prefs.usage  ? behaviourRisk(features)                 : { score: 0, items: [] };
  const proxR     = (prefs.bluetooth || prefs.wifi) ? proximityRisk(features, prefs) : { score: 0, items: [] };

  // ── Active pillars ─────────────────────────────────────────────────────────
  const used = [];
  if (prefs.gps)                         used.push("mobility");
  if (prefs.calls || prefs.sms)          used.push("communication");
  if (prefs.usage)                       used.push("behaviour");
  if (prefs.bluetooth || prefs.wifi)     used.push("proximity");

  // ── Weighted total (each active pillar contributes equally up to 25 pts) ──
  const activePillars = used.length || 1; // avoid /0
  const maxPerPillar  = 100 / activePillars;

  const mobilityScore = (prefs.gps                       ? mobilityR.score : 0) * maxPerPillar;
  const commScore     = (prefs.calls || prefs.sms        ? commR.score     : 0) * maxPerPillar;
  const behScore      = (prefs.usage                     ? behR.score      : 0) * maxPerPillar;
  const proxScore     = (prefs.bluetooth || prefs.wifi   ? proxR.score     : 0) * maxPerPillar;

  const total = mobilityScore + commScore + behScore + proxScore;
  const score = Math.round(clamp(total, 0, 100));
  const label = score < 34 ? "Low" : score < 67 ? "Moderate" : "High";

  // ── Top reasons (IsolationWhyScreen) ───────────────────────────────────────
  const allItems = [
    ...mobilityR.items,
    ...commR.items,
    ...behR.items,
    ...proxR.items,
  ].sort((a, b) => b.r - a.r);

  const reasons = allItems.slice(0, 6).map((x) => ({
    title:  x.label,
    detail: x.detail,
    risk:   x.r,
  }));

  // ── Personalised suggestions (IsolationSuggestionsScreen) ──────────────────
  const suggestions = buildSuggestions(mobilityR, commR, behR, proxR, prefs);

  // ── Social / Withdraw breakdown (IsolationStatsScreen) ─────────────────────
  const { socialItems, withdrawItems } = buildSocialWithdrawBreakdown(
    mobilityR, commR, behR, proxR, prefs
  );

  return {
    score,
    label,
    breakdown: {
      mobility: Math.round(mobilityScore),
      comm:     Math.round(commScore),
      beh:      Math.round(behScore),
      prox:     Math.round(proxScore),
    },
    used,
    reasons,
    suggestions,
    socialItems,
    withdrawItems,
  };
}