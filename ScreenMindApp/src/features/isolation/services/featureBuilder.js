import { getScreenTimeLast24hMs, scanBluetoothCountOnce, getPrefs } from "./isolationCollectors";
import { computeIsolationRisk } from "./computeIsolationRisk";
import { upsertDailyIsolationRecord } from "./isolationStorage"; // your existing storage

import { NativeModules } from "react-native";

export async function collectAndScoreToday() {
  const prefs = await getPrefs();

  // 1) Load raw GPS points + unlock count from native SharedPreferences (we need a bridge)
  // For now, we’ll do only usage + bluetooth in JS, and you add a native function for gps/unlocks next.

  const screenTimeMs = prefs.usage ? await getScreenTimeLast24hMs() : 0;
  const nightUsageMinutes = estimateNightFromTotal(screenTimeMs); // simple placeholder

  const bluetoothAvgDevices = prefs.bluetooth ? await scanBluetoothCountOnce(8) : 0;

  const features = {
    // ✅ add real values once you bridge GPS + unlocks
    dailyDistanceMeters: 0,
    timeAtHomePct: 0,
    locationEntropy: 0,
    transitions: 0,

    nightUsageMinutes,
    unlocks: 0,
    rhythmIrregularity: 0.3,

    bluetoothAvgDevices,
    wifiDiversity: 0,

    // optional comm:
    callsPerDay: 0,
    uniqueContacts: 0,
    silenceHours: 0,
    smsPerDay: 0,
  };

  const result = computeIsolationRisk(features, prefs);

  await upsertDailyIsolationRecord({
    date: new Date().toISOString().slice(0, 10),
    riskScore: result.score,
    riskLevel: result.label,
    breakdown: result.breakdown,
    used: result.used,
    features,
  });

  return { features, result };
}

function estimateNightFromTotal(ms) {
  // temporary: you will replace with real “night window” calculation later
  const minutes = Math.round(ms / 60000);
  return Math.round(minutes * 0.25); // assume 25% at night (placeholder)
}
