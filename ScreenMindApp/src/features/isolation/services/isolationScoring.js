function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// Normalize a value into 0..1 risk
function riskHigherIsWorse(value, good, bad) {
  // value <= good => 0 risk
  // value >= bad  => 1 risk
  const t = (value - good) / (bad - good);
  return clamp(t, 0, 1);
}

function riskLowerIsWorse(value, good, bad) {
  // value >= good => 0 risk
  // value <= bad  => 1 risk
  const t = (good - value) / (good - bad);
  return clamp(t, 0, 1);
}

// Main scoring: returns 0..100
export function computeIsolationRisk(features, prefs) {
  const used = [];

  // Mobility subscore (0..25)
  let mobility = 0;
  let mobilityCount = 0;

  if (prefs.gps) {
    mobility += riskLowerIsWorse(features.dailyDistanceMeters ?? 0, 3000, 300); // good 3km, bad 300m
    mobilityCount++;

    mobility += riskHigherIsWorse(features.timeAtHomePct ?? 0, 55, 85); // good 55%, bad 85%
    mobilityCount++;

    mobility += riskLowerIsWorse(features.locationEntropy ?? 0, 1.2, 0.3); // good variety, bad low variety
    mobilityCount++;

    mobility += riskLowerIsWorse(features.transitions ?? 0, 6, 1); // good transitions, bad 0-1
    mobilityCount++;
  }

  mobility = mobilityCount ? (mobility / mobilityCount) * 25 : 0;
  if (mobilityCount) used.push("mobility");

  // Communication subscore (0..25)
  let comm = 0;
  let commCount = 0;

  if (prefs.calls) {
    comm += riskLowerIsWorse(features.callsPerDay ?? 0, 4, 0.5);
    commCount++;

    comm += riskLowerIsWorse(features.uniqueContacts ?? 0, 6, 1);
    commCount++;

    comm += riskHigherIsWorse(features.silenceHours ?? 24, 8, 20);
    commCount++;
  }

  if (prefs.sms) {
    comm += riskLowerIsWorse(features.smsPerDay ?? 0, 10, 1);
    commCount++;
  }

  comm = commCount ? (comm / commCount) * 25 : 0;
  if (commCount) used.push("communication");

  // Behaviour subscore (0..25)
  let beh = 0;
  let behCount = 0;

  if (prefs.usage) {
    beh += riskHigherIsWorse(features.nightUsageMinutes ?? 0, 20, 120);
    behCount++;

    beh += riskHigherIsWorse(features.unlocks ?? 0, 45, 110);
    behCount++;

    beh += riskHigherIsWorse(features.rhythmIrregularity ?? 0, 0.2, 0.8); // 0..1
    behCount++;
  }

  beh = behCount ? (beh / behCount) * 25 : 0;
  if (behCount) used.push("behaviour");

  // Proximity subscore (0..25)
  let prox = 0;
  let proxCount = 0;

  if (prefs.bluetooth) {
    prox += riskLowerIsWorse(features.bluetoothAvgDevices ?? 0, 8, 1);
    proxCount++;
  }

  if (prefs.wifi) {
    prox += riskLowerIsWorse(features.wifiDiversity ?? 0, 1.2, 0.2);
    proxCount++;
  }

  prox = proxCount ? (prox / proxCount) * 25 : 0;
  if (proxCount) used.push("proximity");

  const total = mobility + comm + beh + prox;
  const score = Math.round(clamp(total, 0, 100));

  const label =
    score < 34 ? "Low" : score < 67 ? "Moderate" : "High";

  return { score, label, breakdown: { mobility, comm, beh, prox }, used };
}
