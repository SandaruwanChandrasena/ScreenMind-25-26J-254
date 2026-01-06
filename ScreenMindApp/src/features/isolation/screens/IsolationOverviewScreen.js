import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

// ✅ NEW: storage + scoring + collector
import { getIsolationPrefs, upsertDailyIsolationRecord } from "../services/isolationStorage";
import { computeIsolationRisk } from "../services/isolationScoring";
import { generateDummyFeatures } from "../services/isolationCollector";

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
  // Simple, explainable summary (panel-friendly)
  const reasons = [];

  if ((features.dailyDistanceMeters ?? 0) < 800) reasons.push("low movement");
  if ((features.timeAtHomePct ?? 0) > 75) reasons.push("high time at home");
  if ((features.uniqueContacts ?? 999) <= 2) reasons.push("fewer unique contacts");
  if ((features.nightUsageMinutes ?? 0) > 90) reasons.push("high night usage");
  if ((features.bluetoothAvgDevices ?? 999) <= 2) reasons.push("low nearby-device exposure");

  if (!reasons.length) return "Your recent patterns look balanced. Keep maintaining healthy social exposure.";

  // Keep it short like your mock UI
  return `${reasons.slice(0, 2).join(" + ")} detected over the last 7 days.`;
}

// ---------------------------------------------------------

export default function IsolationOverviewScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(null);
  const [features, setFeatures] = useState(null);
  const [risk, setRisk] = useState({ score: 0, label: "Low", breakdown: {} });

  useEffect(() => {
    (async () => {
      try {
        // 1) Load consent toggles
        const p = await getIsolationPrefs();
        setPrefs(p);

        // 2) Collect features (dummy for now)
        // ✅ EDIT LATER (IMPORTANT): Replace this with real sensor feature extraction
        const f = generateDummyFeatures();

        // 3) Compute risk score
        const r = computeIsolationRisk(f, p);

        // 4) Save today record (used by Stats/Trends screens)
        const record = {
          date: todayISO(),
          features: f,
          riskScore: r.score,
          riskLabel: r.label,
          breakdown: r.breakdown,
        };
        await upsertDailyIsolationRecord(record);

        // 5) Update UI state
        setFeatures(f);
        setRisk(r);
      } catch (e) {
        console.log("IsolationOverview init error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build highlight cards based on features + prefs
  const highlights = useMemo(() => {
    if (!features || !prefs) return [];

    const list = [];

    if (prefs.gps) {
      list.push({ label: "Daily distance", value: formatMeters(features.dailyDistanceMeters) });
      list.push({ label: "Time at home", value: `${Math.round(features.timeAtHomePct || 0)}%` });
    }

    if (prefs.calls) {
      list.push({ label: "Unique contacts", value: `${Math.round(features.uniqueContacts || 0)}` });
    }

    if (prefs.usage) {
      list.push({ label: "Night usage", value: formatMinutes(features.nightUsageMinutes) });
    }

    if (prefs.wifi) {
      // You store wifiDiversity as entropy number → show Low/Medium/High
      const w = features.wifiDiversity ?? 0;
      const wifiLabel = w < 0.4 ? "Low" : w < 0.9 ? "Medium" : "High";
      list.push({ label: "WiFi diversity", value: wifiLabel });
    } else {
      // show "WiFi diversity" even if disabled (optional)
      list.push({ label: "WiFi diversity", value: "Off" });
    }

    // Ensure grid looks nice (4 cards)
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

        <GlassCard
          icon="alert-circle-outline"
          title={`Risk: ${risk.label}`}
          subtitle={`${risk.score}/100 • Last 7 days`}
          style={{ marginTop: spacing.lg }}
        >
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
  },
  statLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  statValue: { color: colors.text, fontWeight: "900", fontSize: 18, marginTop: 6 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  loadingText: { marginTop: spacing.md, color: colors.muted, fontWeight: "700" },
});
