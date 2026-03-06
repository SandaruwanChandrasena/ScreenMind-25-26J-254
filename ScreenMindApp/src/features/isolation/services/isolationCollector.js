import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";

// ── New imports ───────────────────────────────────────────────────────────────
import { collectWifiDiversity }       from "./wifiDiversityCollector";
import { computeRhythmIrregularity }  from "./rhythmCalculator";

const {
  IsolationMetricsBridge,
  BehaviourMetrics,
  CommunicationStats,
  ServiceStarter,
  UsageStatsBridge,
} = NativeModules;

// ─── BLE singleton ────────────────────────────────────────────────────────────
let _ble = null;
function getBle() {
  if (!_ble) {
    try { _ble = new BleManager(); } catch (e) { console.warn("BLE init failed:", e); }
  }
  return _ble;
}

// ─── Prefs ────────────────────────────────────────────────────────────────────
const KEY_PREFS = "isolation_prefs_v1";

export async function getPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFS);
    return raw
      ? JSON.parse(raw)
      : { gps: true, calls: false, sms: false, usage: true, bluetooth: true, wifi: false };
  } catch {
    return { gps: true, calls: false, sms: false, usage: true, bluetooth: true, wifi: false };
  }
}

export async function setPrefs(prefs) {
  await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(prefs));
}

// ─── Individual collectors ────────────────────────────────────────────────────

async function collectGpsFeatures() {
  if (Platform.OS !== "android" || !IsolationMetricsBridge) return {};
  try {
    const f = await IsolationMetricsBridge.getGpsFeaturesToday();
    return {
      dailyDistanceMeters: f.dailyDistanceMeters ?? 0,
      timeAtHomePct:        f.timeAtHomePct        ?? 0,
      locationEntropy:      f.locationEntropy       ?? 0,
      transitions:          f.transitions           ?? 0,
      radiusOfGyration:     f.radiusOfGyration      ?? 0,
    };
  } catch (e) {
    console.warn("GPS features error:", e);
    return {};
  }
}

async function collectUnlockCount() {
  if (Platform.OS !== "android" || !IsolationMetricsBridge) return 0;
  try {
    return (await IsolationMetricsBridge.getUnlockCountToday()) ?? 0;
  } catch (e) {
    console.warn("Unlock count error:", e);
    return 0;
  }
}

async function collectBehaviourMetrics() {
  if (Platform.OS !== "android" || !BehaviourMetrics) return {};
  try {
    const hasAccess = await BehaviourMetrics.hasUsageAccess();
    if (!hasAccess) return {};
    const s = await BehaviourMetrics.getTodayBehaviourStats();
    return {
      nightUsageMinutes:        s.nightUsageMinutes          ?? 0,
      totalScreenTimeMinutes:   s.totalScreenTimeMinutesToday ?? 0,
      socialMinutes:            s.socialMinutesToday          ?? 0,
      socialPct:                s.socialPercentToday          ?? 0,
      unlockCountFromBehaviour: s.unlockCountToday            ?? null,
    };
  } catch (e) {
    console.warn("BehaviourMetrics error:", e);
    return {};
  }
}

async function collectCommunicationStats() {
  if (Platform.OS !== "android" || !CommunicationStats) return {};
  try {
    const s = await CommunicationStats.getCommunicationStats();
    if (!s) return {};
    return {
      callsPerDay:            s.callsPerDay            ?? 0,
      avgCallDurationSeconds: s.avgCallDurationSeconds  ?? 0,
      uniqueContacts:         s.uniqueContacts          ?? 0,
      smsPerDay:              s.smsCountPerDay          ?? 0,
      silenceHours:           s.interactionSilenceHours ?? 0,
    };
  } catch (e) {
    console.warn("CommunicationStats error:", e);
    return {};
  }
}

async function collectBluetoothCount(seconds = 8) {
  const ble = getBle();
  if (!ble) return 0;
  return new Promise((resolve) => {
    const seen = new Set();
    const sub = ble.onStateChange((state) => {
      if (state !== "PoweredOn") return;
      ble.startDeviceScan(null, { allowDuplicates: false }, (err, device) => {
        if (device?.id) seen.add(device.id);
      });
      setTimeout(() => {
        try { ble.stopDeviceScan(); } catch {}
        sub.remove();
        resolve(seen.size);
      }, seconds * 1000);
    }, true);
  });
}

export async function scanBluetoothCountOnce(seconds = 8) {
  return collectBluetoothCount(seconds);
}

export async function getScreenTimeLast24hMs() {
  if (Platform.OS !== "android") return 0;

  try {
    if (BehaviourMetrics?.getTodayBehaviourStats) {
      const stats = await BehaviourMetrics.getTodayBehaviourStats();
      const minutes = stats?.totalScreenTimeMinutesToday ?? 0;
      return Number(minutes) * 60 * 1000;
    }

    if (UsageStatsBridge?.getScreenTimeLast24hMs) {
      const milliseconds = await UsageStatsBridge.getScreenTimeLast24hMs();
      return Number(milliseconds) || 0;
    }

    if (UsageStatsBridge?.getTotalScreenTimeMsToday) {
      const milliseconds = await UsageStatsBridge.getTotalScreenTimeMsToday();
      return Number(milliseconds) || 0;
    }

    if (UsageStatsBridge?.getTotalScreenTimeMinutesToday) {
      const minutes = await UsageStatsBridge.getTotalScreenTimeMinutesToday();
      return Number(minutes) * 60 * 1000;
    }
  } catch (e) {
    console.warn("Screen time collection error:", e);
  }

  return 0;
}

// ─── Master collector ─────────────────────────────────────────────────────────

/**
 * collectRealFeatures()
 *
 * Returns one flat features object ready for computeIsolationRisk().
 * Every field has a safe default of 0 if its data source is unavailable.
 */
export async function collectRealFeatures() {
  const prefs = await getPrefs();

  const features = {
    // Mobility
    dailyDistanceMeters: 0,
    timeAtHomePct:        0,
    locationEntropy:      0,
    transitions:          0,
    radiusOfGyration:     0,
    // Communication
    callsPerDay:            0,
    avgCallDurationSeconds: 0,
    uniqueContacts:         0,
    smsPerDay:              0,
    silenceHours:           0,
    // Behaviour
    nightUsageMinutes:      0,
    totalScreenTimeMinutes: 0,
    socialMinutes:          0,
    socialPct:              0,
    unlocks:                0,
    rhythmIrregularity:     0,  // ← now computed below
    // Proximity
    bluetoothAvgDevices: 0,
    wifiDiversity:       0,     // ← now computed below
  };

  // ── 1) GPS ────────────────────────────────────────────────────────────────
  if (prefs.gps) {
    Object.assign(features, await collectGpsFeatures());
  }

  // ── 2) Unlock count ───────────────────────────────────────────────────────
  const unlockFromBridge = await collectUnlockCount();

  // ── 3) Screen-time / behaviour ────────────────────────────────────────────
  if (prefs.usage) {
    const beh = await collectBehaviourMetrics();
    features.nightUsageMinutes      = beh.nightUsageMinutes      ?? 0;
    features.totalScreenTimeMinutes = beh.totalScreenTimeMinutes ?? 0;
    features.socialMinutes          = beh.socialMinutes          ?? 0;
    features.socialPct              = beh.socialPct              ?? 0;
    features.unlocks =
      unlockFromBridge > 0
        ? unlockFromBridge
        : (beh.unlockCountFromBehaviour ?? 0);

    // ── Rhythm irregularity (now real, from rhythmCalculator) ────────────
    // Uses unlock timestamps stored by recordUnlockEvent() / startRhythmTracking()
    features.rhythmIrregularity = await computeRhythmIrregularity();
  } else {
    features.unlocks = unlockFromBridge;
  }

  // ── 4) Communication ──────────────────────────────────────────────────────
  if (prefs.calls || prefs.sms) {
    const comm = await collectCommunicationStats();
    if (prefs.calls) {
      features.callsPerDay            = comm.callsPerDay            ?? 0;
      features.avgCallDurationSeconds = comm.avgCallDurationSeconds ?? 0;
      features.uniqueContacts         = comm.uniqueContacts          ?? 0;
      features.silenceHours           = comm.silenceHours            ?? 0;
    }
    if (prefs.sms) {
      features.smsPerDay = comm.smsPerDay ?? 0;
      if (!prefs.calls) features.uniqueContacts = comm.uniqueContacts ?? 0;
    }
  }

  // ── 5) Bluetooth ──────────────────────────────────────────────────────────
  if (prefs.bluetooth) {
    features.bluetoothAvgDevices = await collectBluetoothCount(8);
  }

  // ── 6) WiFi diversity (now real entropy from wifiDiversityCollector) ──────
  if (prefs.wifi) {
    features.wifiDiversity = await collectWifiDiversity();
  }

  return features;
}

// ─── Service control ──────────────────────────────────────────────────────────

export function startLocationTracking() {
  if (Platform.OS === "android" && ServiceStarter) {
    ServiceStarter.startLocationService();
  }
}

export function stopLocationTracking() {
  if (Platform.OS === "android" && ServiceStarter) {
    ServiceStarter.stopLocationService();
  }
}

export function openUsageAccessSettings() {
  const m = BehaviourMetrics || UsageStatsBridge;
  if (m?.openUsageAccessSettings) m.openUsageAccessSettings();
}