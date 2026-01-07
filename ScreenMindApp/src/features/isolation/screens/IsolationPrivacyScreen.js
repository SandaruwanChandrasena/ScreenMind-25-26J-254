import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert, Linking } from "react-native";
import { RESULTS } from "react-native-permissions";

import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";
import { 
  checkAllPermissions, 
  requestLocationPermission,
  requestBackgroundLocationPermission,
  requestBluetoothPermissions,
  requestNotificationPermission,
  openAppSettings,
} from "../services/permissionHelper";
import { setPrefs, getPrefs } from "../services/isolationCollector";
import { openUsageAccessSettings, startLocationTracking } from "../services/isolationCollector";

export default function IsolationPrivacyScreen() {
  // Preferences
  const [gps, setGps] = useState(true);
  const [calls, setCalls] = useState(false);
  const [sms, setSms] = useState(false);
  const [usage, setUsage] = useState(true);
  const [bluetooth, setBluetooth] = useState(true);
  const [wifi, setWifi] = useState(false);

  // Permission statuses
  const [permissions, setPermissions] = useState({
    location: RESULTS.DENIED,
    backgroundLocation: RESULTS.DENIED,
    bluetooth: RESULTS.DENIED,
    notifications: RESULTS.DENIED,
  });

  useEffect(() => {
    loadPrefs();
    checkPermissions();
  }, []);

  const loadPrefs = async () => {
    const prefs = await getPrefs();
    setGps(prefs.gps ?? true);
    setCalls(prefs.calls ?? false);
    setSms(prefs.sms ?? false);
    setUsage(prefs.usage ?? true);
    setBluetooth(prefs.bluetooth ?? true);
    setWifi(prefs.wifi ?? false);
  };

  const checkPermissions = async () => {
    const perms = await checkAllPermissions();
    setPermissions(perms);
  };

  const savePreferences = async () => {
    await setPrefs({ gps, calls, sms, usage, bluetooth, wifi });
    Alert.alert("Saved", "Your preferences have been saved.");
  };

  const requestAllPermissions = async () => {
    Alert.alert(
      "Permission Request",
      "ScreenMind needs several permissions to detect social isolation patterns:\n\n• Location (for mobility tracking)\n• Bluetooth (for proximity sensing)\n• Notifications (for transparency)\n• Usage Access (for screen time)\n\nYou'll be asked for each permission.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: async () => {
          // 1. Request location
          const loc = await requestLocationPermission();
          if (loc) {
            Alert.alert("Location Granted", "Now requesting background location...");
            await requestBackgroundLocationPermission();
          }

          // 2. Request Bluetooth
          await requestBluetoothPermissions();

          // 3. Request notifications
          await requestNotificationPermission();

          // 4. Check updated permissions
          await checkPermissions();

          // 5. Prompt for Usage Access
          Alert.alert(
            "Usage Access Required",
            "Please enable Usage Access in the next screen to track screen time.",
            [
              { text: "Later", style: "cancel" },
              { text: "Open Settings", onPress: () => openUsageAccessSettings() }
            ]
          );
        }}
      ]
    );
  };

  const startTracking = async () => {
    // Save preferences first
    await savePreferences();

    // Check if location is granted
    if (permissions.location !== RESULTS.GRANTED || permissions.backgroundLocation !== RESULTS.GRANTED) {
      Alert.alert(
        "Location Permission Needed",
        "Background location permission is required to start tracking.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Grant Permission", onPress: requestAllPermissions }
        ]
      );
      return;
    }

    // Start location service
    startLocationTracking();
    Alert.alert(
      "Tracking Started",
      "Background location tracking is now active. You'll see a notification.",
      [{ text: "OK" }]
    );
  };

  const getPermissionStatus = (status) => {
    switch (status) {
      case RESULTS.GRANTED: return "✅ Granted";
      case RESULTS.DENIED: return "❌ Denied";
      case RESULTS.BLOCKED: return "🚫 Blocked";
      case RESULTS.LIMITED: return "⚠️ Limited";
      default: return "❓ Unknown";
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Privacy & Consent</Text>
        <Text style={styles.sub}>
          You control what data is used. We store aggregated metrics only (no content, no precise location history).
        </Text>

        {/* Permission Status Card */}
        <GlassCard 
          icon="key-outline" 
          title="Permission Status" 
          subtitle="Tap to request permissions" 
          style={{ marginTop: spacing.lg }}
        >
          <Text style={styles.permText}>Location: {getPermissionStatus(permissions.location)}</Text>
          <Text style={styles.permText}>Background Location: {getPermissionStatus(permissions.backgroundLocation)}</Text>
          <Text style={styles.permText}>Bluetooth: {getPermissionStatus(permissions.bluetooth)}</Text>
          <Text style={styles.permText}>Notifications: {getPermissionStatus(permissions.notifications)}</Text>
          
          <View style={{ height: spacing.md }} />
          
          <PrimaryButton 
            title="Request All Permissions" 
            onPress={requestAllPermissions}
          />
          
          <View style={{ height: spacing.sm }} />
          
          <Pressable style={styles.linkBtn} onPress={() => openAppSettings()}>
            <Text style={styles.linkText}>Open App Settings</Text>
          </Pressable>

          <View style={{ height: spacing.sm }} />
          
          <Pressable style={styles.linkBtn} onPress={() => openUsageAccessSettings()}>
            <Text style={styles.linkText}>Open Usage Access Settings</Text>
          </Pressable>
        </GlassCard>

        {/* Data Collection Controls */}
        <GlassCard 
          icon="shield-checkmark-outline" 
          title="Data collection controls" 
          subtitle="Toggle anytime" 
          style={{ marginTop: spacing.lg }}
        >
          <Row label="GPS mobility (distance/entropy)" value={gps} onChange={setGps} />
          <Row label="Call metadata (counts/duration)" value={calls} onChange={setCalls} />
          <Row label="SMS metadata (counts only)" value={sms} onChange={setSms} />
          <Row label="Phone usage (screen/unlocks)" value={usage} onChange={setUsage} />
          <Row label="Bluetooth proximity (counts)" value={bluetooth} onChange={setBluetooth} />
          <Row label="Wi-Fi diversity (entropy)" value={wifi} onChange={setWifi} />
          
          <View style={{ height: spacing.md }} />
          
          <PrimaryButton 
            title="Save Preferences" 
            onPress={savePreferences}
          />
        </GlassCard>

        {/* Start Tracking Button */}
        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton 
            title="Start Background Tracking" 
            onPress={startTracking}
          />
        </View>

        <View style={{ height: spacing.lg }} />

        <GlassCard icon="information-circle-outline" title="What we do NOT collect" subtitle="For user trust">
          <Text style={styles.note}>• No message text or call audio</Text>
          <Text style={styles.note}>• No contact names</Text>
          <Text style={styles.note}>• No storing raw GPS trails</Text>
          <Text style={styles.note}>• No social media private messages</Text>
        </GlassCard>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({ label, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowText: { color: colors.text, fontWeight: "800", flex: 1, paddingRight: 10 },
  note: { color: colors.faint, marginTop: 8, lineHeight: 18 },
  
  permText: { 
    color: colors.text, 
    fontSize: 14, 
    marginTop: 8,
    fontWeight: "600",
  },
  
  linkBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  linkText: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "700",
  },
});
