// src/features/isolation/screens/IsolationOverviewScreen.js

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { RESULTS } from "react-native-permissions";

import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";
import GaugeRing from "../components/GaugeRing";

// ✅ Storage + scoring + collector
import { getIsolationPrefs, upsertDailyIsolationRecord } from "../services/isolationStorage";
import { computeIsolationRisk } from "../services/isolationScoring";
import { collectRealFeatures } from "../services/isolationCollector";
import { checkAllPermissions } from "../services/permissionHelper";

// ---------- Helpers ----------
function formatMinutes(min) {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

function formatMeters(m) {
  const meters = Math.max(0, Math.round(m || 0));
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildSummary(features) {
  const reasons = [];
  if ((features.dailyDistanceMeters ?? 0) < 800) reasons.push("low movement");
  if ((features.timeAtHomePct ?? 0) > 75) reasons.push("high time at home");
  if ((features.uniqueContacts ?? 999) <= 2) reasons.push("fewer unique contacts");
  if ((features.nightUsageMinutes ?? 0) > 90) reasons.push("high night usage");
  if ((features.bluetoothAvgDevices ?? 999) <= 2) reasons.push("low nearby-device exposure");

  if (!reasons.length) return "Your recent patterns look balanced. Keep maintaining healthy social exposure.";
  return `${reasons.slice(0, 2).join(" + ")} detected over the last 7 days.`;
}

function safePrefs(p) {
  // If storage returns null/undefined, default all to false (privacy-safe)
  return {
    gps: !!p?.gps,
    calls: !!p?.calls,
    sms: !!p?.sms,
    usage: !!p?.usage,
    bluetooth: !!p?.bluetooth,
    wifi: !!p?.wifi,
  };
}

function computeHasRequiredPermissions(perms, p) {
  // Only require what user enabled in Privacy toggles
  const needsGps = p.gps;
  const gpsOk =
    !needsGps ||
    (perms.location === RESULTS.GRANTED && perms.backgroundLocation === RESULTS.GRANTED);

  // (You can extend this later for calls/sms/bluetooth if your permissionHelper supports them)
  return gpsOk;
}

// ---------------------------------------------------------

export default function IsolationOverviewScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(null);
  const [features, setFeatures] = useState(null);
  const [risk, setRisk] = useState({ score: 0, label: "Low", breakdown: {} });
  const [hasPermissions, setHasPermissions] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      // 1) Load consent toggles first (so we know what permissions to require)
      const storedPrefs = safePrefs(await getIsolationPrefs());
      setPrefs(storedPrefs);

      // 2) Check permissions
      const perms = await checkAllPermissions();
      const ok = computeHasRequiredPermissions(perms, storedPrefs);
      setHasPermissions(ok);

      // 3) Collect features (real phone data)
      // If permissions are not enough, collector may fail -> catch below and show warning card
      const f = await collectRealFeatures();
      setFeatures(f);

      // 4) Compute risk
      const r = computeIsolationRisk(f, storedPrefs);
      setRisk(r);

      // 5) Save today record (for Stats/Trends)
      const record = {
        date: todayISO(),
        features: f,
        riskScore: r.score,
        riskLabel: r.label,
        breakdown: r.breakdown,
      };
      await upsertDailyIsolationRecord(record);
    } catch (e) {
      console.log("IsolationOverview init error:", e);
      setErrorMsg(
        "Couldn’t load some metrics. Please enable Privacy permissions and try again."
      );

      // Keep UI stable even if collection fails
      setFeatures((prev) => prev ?? {});
      setRisk((prev) => prev ?? { score: 0, label: "Low", breakdown: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build highlight cards based on features + prefs
  const highlights = useMemo(() => {
    if (!features || !prefs) return [];

    const list = [];

    if (prefs.gps) {
      list.push({ label: "Daily distance", value: formatMeters(features.dailyDistanceMeters) });
      list.push({ label: "Time at home", value: `${Math.round(features.timeAtHomePct || 0)}%` });
    } else {
      list.push({ label: "Daily distance", value: "Off" });
      list.push({ label: "Time at home", value: "Off" });
    }

    if (prefs.calls || prefs.sms) {
      list.push({ label: "Unique contacts", value: `${Math.round(features.uniqueContacts || 0)}` });
    } else {
      list.push({ label: "Unique contacts", value: "Off" });
    }

    if (prefs.usage) {
      list.push({ label: "Night usage", value: formatMinutes(features.nightUsageMinutes) });
    } else {
      list.push({ label: "Night usage", value: "Off" });
    }

    if (prefs.wifi) {
      const w = features.wifiDiversity ?? 0;
      const wifiLabel = w < 0.4 ? "Low" : w < 0.9 ? "Medium" : "High";
      list.push({ label: "WiFi diversity", value: wifiLabel });
    } else {
      list.push({ label: "WiFi diversity", value: "Off" });
    }

    return list.slice(0, 4);
  }, [features, prefs]);

  const summary = useMemo(() => {
    if (!features) return "";
    return buildSummary(features);
  }, [features]);

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading social well-being…</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📍 Social Well-being</Text>
        <Text style={styles.sub}>Loneliness risk based on mobility + communication + behaviour.</Text>

        {/* If something failed */}
        {!!errorMsg && (
          <GlassCard
            icon="alert-circle-outline"
            title="Limited data"
            subtitle="Some metrics were not available"
            style={{ marginTop: spacing.lg }}
          >
            <Text style={styles.body}>{errorMsg}</Text>

            <View style={{ height: spacing.md }} />
            <Pressable style={styles.bigBtn} onPress={loadData}>
              <Text style={styles.bigBtnText}>Retry</Text>
              <Icon name="refresh" size={18} color={colors.text} />
            </Pressable>
          </GlassCard>
        )}

        {/* Permission Warning (only when required permissions missing) */}
        {!hasPermissions && (
          <GlassCard
            icon="warning-outline"
            title="Permissions required"
            subtitle="Grant permissions to enable tracking"
            style={{ marginTop: spacing.lg }}
          >
            <Text style={styles.body}>
              Some features are turned ON in Privacy, but required permissions are not granted.
              Please open Privacy & Consent and enable the needed permissions.
            </Text>

            <View style={{ height: spacing.md }} />

            <PrimaryButton
              title="Go to Privacy Settings"
              onPress={() => navigation.navigate("IsolationPrivacy")}
            />
          </GlassCard>
        )}

        {/* Main Risk Card */}
        <GlassCard
          icon="alert-circle-outline"
          title={`Risk: ${risk.label}`}
          subtitle={`${risk.score}/100 • Last 7 days`}
          style={{ marginTop: spacing.lg }}
        >
          <GaugeRing score={risk.score} label={risk.label} size={200} />

          <View style={{ height: spacing.md }} />
          <Text style={styles.body}>{summary}</Text>

          <View style={{ height: spacing.md }} />

          <Pressable style={styles.bigBtn} onPress={() => navigation.navigate("IsolationStats")}>
            <Text style={styles.bigBtnText}>Open Stats</Text>
            <Icon name="chevron-forward" size={18} color={colors.text} />
          </Pressable>

          <View style={{ height: spacing.sm }} />

          <Pressable style={styles.bigBtn} onPress={() => navigation.navigate("IsolationWhy")}>
            <Text style={styles.bigBtnText}>Why this risk?</Text>
            <Icon name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </GlassCard>

        <Text style={styles.sectionTitle}>Quick highlights</Text>

        <View style={styles.grid}>
          {highlights.map((x) => (
            <View key={x.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{x.label}</Text>
              <Text style={styles.statValue}>{x.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, lineHeight: 18 },

  body: { color: colors.faint, lineHeight: 18 },

  bigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bigBtnText: { color: colors.text, fontWeight: "900" },

  sectionTitle: { color: colors.text, fontWeight: "900", marginTop: spacing.lg, fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: spacing.md },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  statValue: { color: colors.text, fontWeight: "900", fontSize: 18, marginTop: 6 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  loadingText: { marginTop: spacing.md, color: colors.muted, fontWeight: "700" },
});
