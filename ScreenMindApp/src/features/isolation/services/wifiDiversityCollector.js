/**
 * src/features/isolation/services/wifiDiversityCollector.js
 * * Scans surrounding Wi-Fi networks and calculates "Diversity" (Entropy).
 * High diversity means the user is visiting public places; low diversity means isolation.
 */

import { NativeModules, Platform } from "react-native";

const { WifiMetricsBridge } = NativeModules;

export async function collectWifiDiversity() {
  if (Platform.OS !== 'android' || !WifiMetricsBridge) {
    return 0;
  }

  try {
    // The native module returns the raw count of unique nearby networks
    const networkCount = await WifiMetricsBridge.getWifiNetworkCount();

    // Convert network count to a "diversity score" (Entropy approximation)
    // Example: 0 networks = 0.0 diversity. 10 networks = ~1.04 diversity.
    let diversityScore = 0;
    if (networkCount > 0) {
        diversityScore = Math.log10(networkCount + 1); 
    }

    return diversityScore;
  } catch (error) {
    console.warn("Error collecting Wi-Fi diversity:", error);
    return 0;
  }
}