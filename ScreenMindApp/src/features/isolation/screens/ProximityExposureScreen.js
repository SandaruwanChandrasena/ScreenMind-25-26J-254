import React, { useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  Pressable, NativeModules, PermissionsAndroid, Platform 
} from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

// Import your existing Bluetooth scanner
import { scanBluetoothCountOnce } from "../services/isolationCollector";

const { WifiMetricsBridge } = NativeModules;

export default function ProximityExposureScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // 1. Request Runtime Permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn("Permission Request Error:", err);
        return false;
      }
    }
    return true;
  };

  const loadProximityData = async () => {
    setLoading(true);
    setError(false);
    setPermissionError(false);

    try {
      // Step 1: Ask user for permission popup
      const hasPermission = await requestPermissions();
      
      if (!hasPermission) {
        setPermissionError(true);
        setLoading(false);
        return;
      }

      // Step 2: Scan for real Bluetooth devices nearby (takes ~8 seconds)
      // NOTE: This will fail on an Emulator. Must test on a physical device.
      const bluetoothCount = await scanBluetoothCountOnce(8);

      // Step 3: Scan for real Wi-Fi networks nearby
      let wifiCount = 0;
      if (WifiMetricsBridge) {
        wifiCount = await WifiMetricsBridge.getWifiNetworkCount();
      }

      // Step 4: Calculate dynamic labels based on the raw numbers
      const getLabel = (count) => {
        if (count <= 2) return "Low";
        if (count <= 6) return "Moderate";
        return "High";
      };

      const environmentVariety = wifiCount > 4 ? "High (Multiple Locations)" : "Low (Static Location)";

      setData([
        { k: "Bluetooth proximity", v: `${getLabel(bluetoothCount)} (${bluetoothCount} devices)` },
        { k: "WiFi diversity", v: `${getLabel(wifiCount)} (${wifiCount} networks)` },
        { k: "Environment variety", v: environmentVariety },
      ]);
    } catch (err) {
      console.log("Proximity scan error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProximityData();
  }, []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📡 Proximity & Environment</Text>
        <Text style={styles.sub}>Real-time scan proxies for face-to-face exposure and environment variety.</Text>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.helper}>Scanning surroundings (this takes ~8 seconds)...</Text>
            <Text style={styles.note}>Note: This feature requires a physical phone. It will fail on an emulator.</Text>
          </View>
        )}

        {permissionError && !loading && (
          <Text style={styles.warn}>
            Permission Denied. Please allow Location and Bluetooth access in your phone settings to scan.
          </Text>
        )}

        {error && !loading && !permissionError && (
          <Text style={styles.warn}>
            Unable to scan surroundings. Are you running this on an Emulator? Please connect a real Android device.
          </Text>
        )}

        {!loading && data && !error && (
          <GlassCard icon="wifi-outline" title="Live Exposure Signals" subtitle="No identity stored • privacy-safe" style={{ marginTop: spacing.lg }}>
            {data.map((x, i) => (
              <View key={x.k} style={[styles.row, i !== 0 && styles.borderTop]}>
                <Text style={styles.k}>{x.k}</Text>
                <Text style={styles.v}>{x.v}</Text>
              </View>
            ))}

            <View style={{ height: spacing.md }} />
            <Pressable onPress={loadProximityData} style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.refreshText}>Rescan Environment</Text>
            </Pressable>
          </GlassCard>
        )}

        <View style={{ height: spacing.lg }} />
        <Text style={styles.note}>
          We store only aggregated counts/entropy. No MAC addresses or Wi-Fi names are stored.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  loadingContainer: { marginTop: spacing.xl, alignItems: "center", paddingHorizontal: 20 },
  helper: { color: colors.muted, marginTop: 10, fontWeight: "800", textAlign: "center" },
  warn: { color: "#ffb4b4", marginTop: 20, fontWeight: "900", lineHeight: 22, textAlign: "center", paddingHorizontal: 10 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  k: { color: colors.muted, fontWeight: "800", flex: 1 },
  v: { color: colors.text, fontWeight: "900", textAlign: "right" },

  refreshBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: { color: colors.text, fontWeight: "900" },

  note: { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16, textAlign: "center" },
});