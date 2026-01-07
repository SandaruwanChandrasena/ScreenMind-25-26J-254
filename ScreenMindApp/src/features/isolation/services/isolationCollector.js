import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";

const { UsageStatsBridge, ServiceStarter, IsolationMetricsBridge } = NativeModules;
let ble = null;

function getBleManager() {
  if (!ble && BleManager) {
    try {
      ble = new BleManager();
    } catch (error) {
      console.warn("Failed to initialize BleManager:", error);
    }
  }
  return ble;
}

const KEY_PREFS = "isolation_prefs";

export async function getPrefs() {
  const raw = await AsyncStorage.getItem(KEY_PREFS);
  return raw ? JSON.parse(raw) : {
    gps: true, calls: false, sms: false, usage: true, bluetooth: true, wifi: false
  };
}

export async function setPrefs(prefs) {
  await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(prefs));
}

// ---------- Usage Access ----------
export function openUsageAccessSettings() {
  if (Platform.OS === "android") UsageStatsBridge?.openUsageAccessSettings();
}

export async function getScreenTimeLast24hMs() {
  if (Platform.OS !== "android") return 0;
  return await UsageStatsBridge.getScreenTimeLast24h();
}

// ---------- Bluetooth scan (counts only) ----------
export async function scanBluetoothCountOnce(seconds = 8) {
  const bleManager = getBleManager();
  if (!bleManager) {
    console.warn("BleManager not available, skipping scan");
    return 0;
  }
  
  return new Promise((resolve) => {
    const seen = new Set();
    const sub = bleManager.onStateChange((state) => {
      if (state !== "PoweredOn") return;
      bleManager.startDeviceScan(null, { allowDuplicates: false }, (err, device) => {
        if (device?.id) seen.add(device.id);
      });

      setTimeout(() => {
        bleManager.stopDeviceScan();
        sub.remove();
        resolve(seen.size);
      }, seconds * 1000);
    }, true);
  });
}

// ---------- WiFi Diversity ----------
// Note: React Native doesn't have built-in WiFi scanning for privacy reasons
// You'll need a native module or use react-native-wifi-reborn for Android
export async function getWifiDiversity() {
  // Placeholder: will need native implementation
  // Returns entropy value 0-2 (0=always same network, higher=more diversity)
  return 0;
}

// ---------- Generate Dummy Features (for testing) ----------
export function generateDummyFeatures() {
  return {
    // Mobility (GPS-based)
    dailyDistanceMeters: Math.random() * 5000 + 500, // 500m - 5.5km
    timeAtHomePct: Math.random() * 40 + 50, // 50-90%
    locationEntropy: Math.random() * 1.5, // 0-1.5
    transitions: Math.floor(Math.random() * 12), // 0-12 transitions
    radiusOfGyration: Math.random() * 3000 + 200, // 200m - 3.2km
    daysNotLeaving: Math.floor(Math.random() * 3), // 0-3 days

    // Communication metadata
    callsPerDay: Math.random() * 8, // 0-8 calls
    uniqueContacts: Math.floor(Math.random() * 10) + 1, // 1-10 contacts
    avgCallDuration: Math.random() * 300 + 30, // 30-330 seconds
    smsPerDay: Math.random() * 15, // 0-15 SMS
    silenceHours: Math.random() * 15 + 4, // 4-19 hours of no calls

    // Phone behavior
    nightUsageMinutes: Math.random() * 120, // 0-120 minutes
    unlocks: Math.floor(Math.random() * 80) + 20, // 20-100 unlocks
    rhythmIrregularity: Math.random() * 0.6 + 0.2, // 0.2-0.8

    // Proximity & environment
    bluetoothAvgDevices: Math.floor(Math.random() * 12), // 0-12 devices
    wifiDiversity: Math.random() * 1.5, // 0-1.5 entropy
  };
}

// ---------- Collect Real Features ----------
export async function collectRealFeatures() {
  const prefs = await getPrefs();
  const features = {
    dailyDistanceMeters: 0,
    timeAtHomePct: 0,
    locationEntropy: 0,
    transitions: 0,
    radiusOfGyration: 0,
    daysNotLeaving: 0,
    callsPerDay: 0,
    uniqueContacts: 0,
    avgCallDuration: 0,
    smsPerDay: 0,
    silenceHours: 0,
    nightUsageMinutes: 0,
    unlocks: 0,
    rhythmIrregularity: 0,
    bluetoothAvgDevices: 0,
    wifiDiversity: 0,
  };

  try {
    // Collect GPS features if enabled (Android only)
    if (prefs.gps && Platform.OS === "android" && IsolationMetricsBridge) {
      try {
        const gpsFeatures = await IsolationMetricsBridge.getGpsFeaturesToday();
        features.dailyDistanceMeters = gpsFeatures.dailyDistanceMeters || 0;
        features.timeAtHomePct = gpsFeatures.timeAtHomePct || 0;
        features.locationEntropy = gpsFeatures.locationEntropy || 0;
        features.transitions = gpsFeatures.transitions || 0;
        features.radiusOfGyration = gpsFeatures.radiusOfGyration || 0;
      } catch (err) {
        console.warn("GPS features error:", err);
      }
    }

    // Collect unlock count if enabled (Android only)
    if (prefs.usage && Platform.OS === "android" && IsolationMetricsBridge) {
      try {
        features.unlocks = await IsolationMetricsBridge.getUnlockCountToday();
      } catch (err) {
        console.warn("Unlock count error:", err);
      }
    }

    // Collect usage data if enabled
    if (prefs.usage && Platform.OS === "android") {
      const screenTimeMs = await getScreenTimeLast24hMs();
      // Estimate night usage (11pm-7am) as roughly 25% of total (placeholder)
      features.nightUsageMinutes = Math.round((screenTimeMs / 60000) * 0.25);
    }

    // Collect bluetooth data if enabled
    if (prefs.bluetooth) {
      features.bluetoothAvgDevices = await scanBluetoothCountOnce(8);
    }

    // Collect WiFi data if enabled  
    if (prefs.wifi) {
      features.wifiDiversity = await getWifiDiversity();
    }

    // Communication features require permissions
    // TODO: Add call log and SMS reading (with proper permissions)

  } catch (error) {
    console.warn("Error collecting features:", error);
  }

  return features;
}

// ---------- Service Control ----------
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
