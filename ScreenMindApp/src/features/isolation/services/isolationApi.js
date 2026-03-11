

const API_BASE_URL = 'http://192.168.8.131:8000/api/v1/isolation';

// ── Main function ──────────────────────────────────────────────────────────

/**
 * fetchIsolationRisk
 *
 * @param {string}   userId        - user identifier
 * @param {object[]} dailyRecords  - array of 7+ daily feature objects
 *                                   (from collectRealFeatures() saved over 7 days)
 * @returns {Promise<{
 *   score: number,
 *   label: string,
 *   probabilities: object,
 *   breakdown: object,
 *   used_pillars: string[],
 *   message: string
 * }>}
 */
export async function fetchIsolationRisk(userId, dailyRecords) {
  const url = `${API_BASE_URL}/c2/isolation-risk`;

  // Map your local feature names → backend schema field names
  const mappedRecords = dailyRecords.map(mapFeaturesToSchema);

  const response = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      user_id:       userId,
      daily_records: mappedRecords,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Isolation API error ${response.status}: ${JSON.stringify(err)}`);
  }

  return response.json();
}


// ── Feature name mapper ────────────────────────────────────────────────────
// Your isolationCollector.js uses camelCase.
// The backend schema uses snake_case.

function mapFeaturesToSchema(features) {
  return {
    // Pillar 1 - Mobility
    daily_distance_m:      features.dailyDistanceMeters     ?? 0,
    time_at_home_pct:      toFraction(features.timeAtHomePct),
    location_entropy:      features.locationEntropy         ?? 0,
    transitions:           features.transitions             ?? 0,
    radius_of_gyration_km: (features.radiusOfGyration ?? 0) / 1000, // metres → km

    // Pillar 2 - Communication
    calls_per_day:         features.callsPerDay             ?? 0,
    avg_call_duration_s:   features.avgCallDurationSeconds  ?? 0,
    unique_contacts:       features.uniqueContacts          ?? 0,
    sms_per_day:           features.smsPerDay               ?? 0,
    silence_hours:         features.silenceHours            ?? 0,

    // Pillar 3 - Behaviour
    night_usage_min:       features.nightUsageMinutes       ?? 0,
    unlocks_per_day:       features.unlocks                 ?? 0,
    total_screen_min:      features.totalScreenTimeMinutes  ?? 0,
    social_app_min:        features.socialMinutes           ?? 0,
    social_pct:            toFraction(features.socialPct),
    rhythm_irregularity:   features.rhythmIrregularity      ?? 0,

    // Pillar 4 - Proximity
    bluetooth_avg_devices: features.bluetoothAvgDevices     ?? 0,
    wifi_diversity:        features.wifiDiversity           ?? 0,
  };
}

function toFraction(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (num > 1) return Math.min(1, num / 100);
  return Math.min(1, num);
}


// ── Fallback: use local rule-based scorer if backend is offline ────────────
export async function fetchIsolationRiskWithFallback(userId, dailyRecords, prefs) {
  try {
    return await fetchIsolationRisk(userId, dailyRecords);
  } catch (err) {
    console.warn('[C2] Backend unavailable, using local scorer:', err.message);
    // Fall back to the local rule-based scorer
    const { computeIsolationRisk } = await import('./isolationScoring');
    const lastFeatures = dailyRecords[dailyRecords.length - 1];
    const local = computeIsolationRisk(lastFeatures, prefs);
    return {
      score:         local.score,
      label:         local.label,
      probabilities: { Low: 0, Moderate: 0, High: 0 },
      breakdown:     local.breakdown,
      used_pillars:  local.used,
      message:       '(Local estimate — backend offline)',
    };
  }
}