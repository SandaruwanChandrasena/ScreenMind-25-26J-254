import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

// ✅ your native bridge
import { settingsAccess } from "../services/settingsAccess";

export default function DataPermissionsScreen() {
  // Runtime permissions (Android popup can request these)
  const [micStatus, setMicStatus] = useState("Checking…");
  const [activityStatus, setActivityStatus] = useState("Checking…");

  // Special access (Android Settings screens)
  const [special, setSpecial] = useState({
    usage: null, // true/false/null
    notif: null,
    dnd: null,
    loading: true,
    error: null,
  });

  const mapResult = (r) => {
    if (r === RESULTS.GRANTED) return "Granted";
    if (r === RESULTS.DENIED) return "Required";
    if (r === RESULTS.BLOCKED) return "Blocked";
    if (r === RESULTS.LIMITED) return "Limited";
    return "Required";
  };

  const refreshRuntimePermissions = useCallback(async () => {
    try {
      if (Platform.OS !== "android") return;

      const mic = await check(PERMISSIONS.ANDROID.RECORD_AUDIO);
      setMicStatus(mapResult(mic));

      const act = await check(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
      setActivityStatus(mapResult(act));
    } catch (e) {
      console.log("refreshRuntimePermissions error:", e);
    }
  }, []);

  const refreshSpecialAccess = useCallback(async () => {
    if (Platform.OS !== "android") return;

    try {
      // Defensive: avoid crash if native module not linked
      if (
        !settingsAccess ||
        typeof settingsAccess.hasUsageStatsAccess !== "function" ||
        typeof settingsAccess.hasNotificationListenerAccess !== "function" ||
        typeof settingsAccess.hasDndAccess !== "function"
      ) {
        setSpecial({
          usage: null,
          notif: null,
          dnd: null,
          loading: false,
          error: "settingsAccess native module not available. Check linking/build.",
        });
        return;
      }

      setSpecial((p) => ({ ...p, loading: true, error: null }));

      const usage = await settingsAccess.hasUsageStatsAccess();
      const notif = await settingsAccess.hasNotificationListenerAccess();
      const dnd = await settingsAccess.hasDndAccess();

      setSpecial({
        usage: !!usage,
        notif: !!notif,
        dnd: !!dnd,
        loading: false,
        error: null,
      });
    } catch (e) {
      console.log("refreshSpecialAccess error:", e);
      setSpecial({
        usage: null,
        notif: null,
        dnd: null,
        loading: false,
        error: String(e?.message || e),
      });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshRuntimePermissions();
    await refreshSpecialAccess();
  }, [refreshRuntimePermissions, refreshSpecialAccess]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function requestMic() {
    try {
      const r = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
      setMicStatus(mapResult(r));

      if (r === RESULTS.BLOCKED) {
        Alert.alert(
          "Microphone blocked",
          "Enable Microphone permission from App Settings.",
          [
            { text: "Cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function requestActivity() {
    try {
      const r = await request(PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION);
      setActivityStatus(mapResult(r));

      if (r === RESULTS.BLOCKED) {
        Alert.alert(
          "Activity Recognition blocked",
          "Enable it from App Settings.",
          [
            { text: "Cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (e) {
      console.log(e);
    }
  }

  // ✅ UPDATED: Prefer native intents (more device-compatible)
  async function openUsageAccessSettings() {
    try {
      if (settingsAccess?.openUsageAccessSettings) {
        await settingsAccess.openUsageAccessSettings();
        Alert.alert("Tip", "After enabling, come back and press Re-check.");
        return;
      }
      // fallback
      await Linking.openURL("android.settings.USAGE_ACCESS_SETTINGS");
      Alert.alert("Tip", "After enabling, come back and press Re-check.");
    } catch {
      Alert.alert(
        "Not supported",
        "Could not open Usage Access settings on this device.\n\nOpen manually:\nSettings → Apps → Special access → Usage access"
      );
    }
  }

  // ✅ UPDATED: Prefer native intents
  async function openNotificationAccessSettings() {
    try {
      if (settingsAccess?.openNotificationAccessSettings) {
        await settingsAccess.openNotificationAccessSettings();
        Alert.alert("Tip", "After enabling, come back and press Re-check.");
        return;
      }
      // fallback
      await Linking.openURL("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
      Alert.alert("Tip", "After enabling, come back and press Re-check.");
    } catch {
      Alert.alert(
        "Not supported",
        "Could not open Notification Access settings on this device.\n\nOpen manually:\nSettings → Apps → Special access → Notification access"
      );
    }
  }

  // ✅ UPDATED: This fixes your DND “Not supported”
  async function openDndAccessSettings() {
    try {
      if (settingsAccess?.openDndAccessSettings) {
        await settingsAccess.openDndAccessSettings();
        Alert.alert("Tip", "After enabling, come back and press Re-check.");
        return;
      }
      // fallback
      await Linking.openURL("android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS");
      Alert.alert("Tip", "After enabling, come back and press Re-check.");
    } catch {
      Alert.alert(
        "Not supported",
        "Could not open DND access settings on this device.\n\nOpen manually:\nSettings → Apps → Special access → Do Not Disturb access"
      );
    }
  }

  const specialStatus = (val, optional = false) => {
    if (val === null) return optional ? "Optional" : "Checking…";
    return val ? "Granted" : optional ? "Optional" : "Required";
  };

  const specialEnabled = (val) => val === true;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Data & Permissions</Text>
        <Text style={styles.sub}>
          This screen shows what the app can access. Some items require opening Android Settings.
        </Text>

        <View style={styles.card}>
          <Row
            title="Screen Usage Access (Recommended)"
            desc="Needed for late-night usage, app switching, and phone inactivity duration."
            status={specialStatus(special.usage, false)}
            enabled={specialEnabled(special.usage)}
            onToggle={openUsageAccessSettings}
            onAction={openUsageAccessSettings}
            actionLabel="Open Settings"
          />
          <Divider />

          <Row
            title="Notification Access (Recommended)"
            desc="Needed to count notifications after bedtime and during sleep window."
            status={specialStatus(special.notif, false)}
            enabled={specialEnabled(special.notif)}
            onToggle={openNotificationAccessSettings}
            onAction={openNotificationAccessSettings}
            actionLabel="Open Settings"
          />
          <Divider />

          <Row
            title="Do Not Disturb Access (Optional)"
            desc="Lets the app detect whether DND is enabled at night (sleep hygiene signal)."
            status={specialStatus(special.dnd, true)}
            enabled={specialEnabled(special.dnd)}
            onToggle={openDndAccessSettings}
            onAction={openDndAccessSettings}
            actionLabel="Open Settings"
          />
          <Divider />

          <Row
            title="Microphone (Optional)"
            desc="Needed only if you enable Snoring Detection."
            status={micStatus}
            enabled={micStatus === "Granted"}
            onToggle={requestMic}
            onAction={() => {
              if (micStatus === "Blocked") Linking.openSettings();
              else requestMic();
            }}
            actionLabel={micStatus === "Granted" ? "Re-check" : "Request"}
          />
          <Divider />

          <Row
            title="Motion Signals (Optional)"
            desc="Activity Recognition improves disruption estimation using movement patterns."
            status={activityStatus}
            enabled={activityStatus === "Granted"}
            onToggle={requestActivity}
            onAction={() => {
              if (activityStatus === "Blocked") Linking.openSettings();
              else requestActivity();
            }}
            actionLabel={activityStatus === "Granted" ? "Re-check" : "Request"}
          />
        </View>

        <View style={{ height: spacing.lg }} />

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Debug / Status</Text>

          {special.loading ? (
            <Text style={styles.noteText}>Checking special access…</Text>
          ) : special.error ? (
            <Text style={[styles.noteText, { color: colors.danger }]}>{special.error}</Text>
          ) : (
            <Text style={styles.noteText}>
              Usage: {special.usage ? "Granted" : "Denied"} • Notifications:{" "}
              {special.notif ? "Granted" : "Denied"} • DND:{" "}
              {special.dnd ? "Granted" : "Denied"}
            </Text>
          )}

          <View style={{ height: 12 }} />

          <Pressable onPress={refreshAll} style={styles.recheckBtn}>
            <Text style={styles.recheckText}>Re-check (runtime + special access)</Text>
          </Pressable>

          <View style={{ height: 10 }} />
          <Text style={styles.smallHint}>
            After enabling settings, return here and press Re-check to update the detected status.
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({ title, desc, status, enabled, onToggle, onAction, actionLabel }) {
  const pillStyle =
    status === "Granted"
      ? styles.pillGood
      : status === "Blocked"
      ? styles.pillBad
      : status === "Required"
      ? styles.pillBad
      : styles.pillWarn;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{title}</Text>
          <View style={[styles.pill, pillStyle]}>
            <Text style={styles.pillText}>{status}</Text>
          </View>
        </View>

        <Text style={styles.rowDesc}>{desc}</Text>

        <Pressable onPress={onAction} style={{ marginTop: 10 }}>
          <Text style={styles.link}>{actionLabel}</Text>
        </Pressable>
      </View>

      <Pressable onPress={onToggle} style={[styles.toggle, enabled && styles.toggleOn]}>
        <Text style={styles.toggleText}>{enabled ? "ON" : "OFF"}</Text>
      </Pressable>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },

  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowTitle: { color: colors.text, fontWeight: "900", fontSize: 14, flex: 1 },
  rowDesc: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },
  link: { color: colors.primary2, fontWeight: "900" },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillGood: { backgroundColor: "rgba(34,197,94,0.18)" },
  pillWarn: { backgroundColor: "rgba(245,158,11,0.14)" },
  pillBad: { backgroundColor: "rgba(239,68,68,0.16)" },
  pillText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  toggle: {
    width: 64,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: "rgba(34,197,94,0.22)" },
  toggleText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },

  note: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.lg,
  },
  noteTitle: { color: colors.text, fontWeight: "900" },
  noteText: { color: colors.muted, marginTop: 8, lineHeight: 18, fontSize: 12 },
  smallHint: { color: colors.faint, fontSize: 11, lineHeight: 16 },

  recheckBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  recheckText: { color: colors.text, fontWeight: "900" },
});
