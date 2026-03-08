/**
 * isolationStorage.js
 *
 * Persists daily isolation records to AsyncStorage.
 *
 * Each record shape:
 * {
 *   date:           "2025-08-15"          (YYYY-MM-DD, used as key)
 *   riskScore:      67                    (0-100)
 *   riskLabel:      "Moderate"            ("Low" | "Moderate" | "High")
 *   breakdown:      { mobility, comm, beh, prox }
 *   used:           ["mobility","behaviour"]
 *   reasons:        [{ title, detail, risk }]     ← from scoring engine
 *   suggestions:    [{ title, detail }]           ← from scoring engine
 *   socialItems:    [{ label, pct }]              ← for StatsScreen
 *   withdrawItems:  [{ label, pct }]              ← for StatsScreen
 *   features:       { dailyDistanceMeters, ... }  ← raw collected features
 *   updatedAt:      1700000000000                 (unix ms)
 * }
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFS = "isolation_prefs_v1";
const KEY_DAILY = "isolation_daily_v1";

// ─── Prefs ────────────────────────────────────────────────────────────────────

export async function getIsolationPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFS);
    return raw
      ? JSON.parse(raw)
      : { gps: true, calls: true, sms: false, usage: true, bluetooth: false, wifi: false };
  } catch {
    return { gps: true, calls: true, sms: false, usage: true, bluetooth: false, wifi: false };
  }
}

export async function saveIsolationPrefs(prefs) {
  await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(prefs));
}

// ─── Daily history ────────────────────────────────────────────────────────────

/** Returns array of records, newest first */
export async function getDailyIsolationHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY_DAILY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("getDailyIsolationHistory error:", e);
    return [];
  }
}

/**
 * Insert or update today's record.
 *
 * Accepts the full result object from computeIsolationRisk() merged with features:
 * {
 *   date, riskScore, riskLabel, breakdown, used,
 *   reasons, suggestions, socialItems, withdrawItems,
 *   features
 * }
 */
export async function upsertDailyIsolationRecord(record) {
  try {
    const history = await getDailyIsolationHistory();

    const entry = {
      ...record,
      updatedAt: Date.now(),
    };

    const idx = history.findIndex((r) => r.date === record.date);
    if (idx >= 0) {
      // Merge: keep existing fields, update with new ones
      history[idx] = { ...history[idx], ...entry };
    } else {
      history.unshift(entry); // newest-first
    }

    // Keep max 365 days
    const trimmed = history.slice(0, 365);
    await AsyncStorage.setItem(KEY_DAILY, JSON.stringify(trimmed));
    return trimmed;
  } catch (e) {
    console.warn("upsertDailyIsolationRecord error:", e);
    return [];
  }
}

export async function clearIsolationHistory() {
  await AsyncStorage.removeItem(KEY_DAILY);
}