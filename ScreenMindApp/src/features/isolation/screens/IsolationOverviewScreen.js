/**
 * IsolationOverviewScreen.js
 *
 * Main dashboard for the Social Isolation component.
 *
 * What changed from the original:
 *  • Uses the fixed isolationCollector (collectRealFeatures) which now properly
 *    reads GPS, unlock, behaviour, communication, bluetooth.
 *  • Passes the full scoring result (including reasons, suggestions,
 *    socialItems, withdrawItems) into the saved daily record.
 *  • The saved record is what IsolationWhyScreen and IsolationSuggestionsScreen read.
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { RESULTS } from "../services/permissionHelper";

import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";
import GaugeRing from "../components/GaugeRing";

import { getIsolationPrefs, upsertDailyIsolationRecord } from "../services/isolationStorage";
import { computeIsolationRisk } from "../services/isolationScoring";
import { collectRealFeatures } from "../services/isolationCollector";
import { checkAllPermissions } from "../services/permissionHelper";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMeters(m) {
  const meters = Math.max(0, Math.round(m || 0));
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function formatMinutes(min) {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function safePrefs(p) {
  return {
    gps:       !!p?.gps,
    calls:     !!p?.calls,
    sms:       !!p?.sms,
    usage:     !!p?.usage,
    bluetooth: !!p?.bluetooth,
    wifi:      !!p?.wifi,
  };
}

function computeHasRequiredPermissions(perms, p) {
  const needsGps = p.gps;
  const gpsOk =
    !needsGps ||
    (perms.location === RESULTS.GRANTED && perms.backgroundLocation === RESULTS.GRANTED);
  return gpsOk;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IsolationOverviewScreen({ navigation }) {
  const [loading,        setLoading]        = useState(true);
  const [prefs,          setPrefs]          = useState(null);
  const [features,       setFeatures]       = useState(null);
  const [risk,           setRisk]           = useState({ score: 0, label: "Low", breakdown: {} });
  const [hasPermissions, setHasPermissions] = useState(true);
  const [errorMsg,       setErrorMsg]       = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      // 1) Load prefs
      const storedPrefs = safePrefs(await getIsolationPrefs());
      setPrefs(storedPrefs);

      // 2) Check permissions
      const perms = await checkAllPermissions();
      setHasPermissions(computeHasRequiredPermissions(perms, storedPrefs));

      // 3) Collect real features (this now reads GPS, unlock, behaviour, communication, BT)
      const f = await collectRealFeatures();
      setFeatures(f);

      // 4) Score
      const r = computeIsolationRisk(f, storedPrefs);
      setRisk(r);

      // 5) Save today's record — now includes reasons, suggestions, socialItems, withdrawItems
      await upsertDailyIsolationRecord({
        date:          todayISO(),
        riskScore:     r.score,
        riskLabel:     r.label,
        breakdown:     r.breakdown,
        used:          r.used,
        reasons:       r.reasons,        // ← IsolationWhyScreen reads this
        suggestions:   r.suggestions,    // ← IsolationSuggestionsScreen reads this
        socialItems:   r.socialItems,    // ← IsolationStatsScreen reads this
        withdrawItems: r.withdrawItems,  // ← IsolationStatsScreen reads this
        features:      f,
      });

    } catch (e) {
      console.warn("IsolationOverview error:", e);
      setErrorMsg("Couldn't load some metrics. Enable permissions and try again.");
      setFeatures((prev) => prev ?? {});
      setRisk((prev) => prev ?? { score: 0, label: "Low", breakdown: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build highlight cards
  const highlights = useMemo(() => {
    if (!features || !prefs) return [];
    const list = [];

    if (prefs.gps) {
      list.push({ label: "Daily distance", value: formatMeters(features.dailyDistanceMeters) });
      list.push({ label: "Time at home",   value: `${Math.round(features.timeAtHomePct || 0)}%` });
    } else {
      list.push({ label: "Daily distance", value: "Off" });
      list.push({ label: "Time at home",   value: "Off" });
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

    return list.slice(0, 4);
  }, [features, prefs]);

  // Build summary sentence from risk reasons
  const summary = useMemo(() => {
    if (!risk.reasons?.length) {
      return "Your recent patterns look balanced. Keep maintaining healthy social exposure.";
    }
    const top = risk.reasons.filter((r) => r.risk > 0.3).slice(0, 2);
    if (!top.length) {
      return "No significant risk factors detected this week. Keep it up!";
    }
    return top.map((r) => r.title).join(" + ") + " detected over the last 7 days.";
  }, [risk]);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading social well-being…</Text>
        </View>
      </DashboardBackground>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📍 Social Well-being</Text>
        <Text style={styles.sub}>
          Loneliness risk based on mobility + communication + behaviour.
        </Text>

        {/* Error card */}
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

        {/* Permission warning */}
        {!hasPermissions && (
          <GlassCard
            icon="warning-outline"
            title="Permissions required"
            subtitle="Grant permissions to enable tracking"
            style={{ marginTop: spacing.lg }}
          >
            <Text style={styles.body}>
              Location permission is required for GPS mobility tracking. Go to Privacy to enable it.
            </Text>
            <View style={{ height: spacing.md }} />
            <PrimaryButton
              title="Go to Privacy Settings"
              onPress={() => navigation.navigate("IsolationPrivacy")}
            />
          </GlassCard>
        )}

        {/* Main risk card */}
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

          <View style={{ height: spacing.sm }} />

          <Pressable style={styles.bigBtn} onPress={() => navigation.navigate("IsolationSuggestions")}>
            <Text style={styles.bigBtnText}>See Suggestions</Text>
            <Icon name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </GlassCard>

        {/* Highlights */}
        <Text style={styles.sectionTitle}>Quick highlights</Text>
        <View style={styles.grid}>
          {highlights.map((x) => (
            <View key={x.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{x.label}</Text>
              <Text style={styles.statValue}>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* Breakdown pills */}
        {risk.used?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Score breakdown</Text>
            <View style={styles.breakdownRow}>
              {risk.used.map((pillar) => (
                <View key={pillar} style={styles.breakdownPill}>
                  <Text style={styles.breakdownPillLabel}>{pillar}</Text>
                  <Text style={styles.breakdownPillValue}>
                    {risk.breakdown?.[pillar] ?? 0}/
                    {Math.round(100 / (risk.used.length || 1))}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title:      { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub:        { color: colors.muted, marginTop: 6, lineHeight: 18 },
  body:       { color: colors.faint, lineHeight: 18 },

  bigBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
  },
  bigBtnText: { color: colors.text, fontWeight: "900" },

  sectionTitle: { color: colors.text, fontWeight: "900", marginTop: spacing.lg, fontSize: 16 },

  grid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", marginTop: spacing.md,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 18, padding: spacing.md, marginBottom: spacing.md,
  },
  statLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  statValue: { color: colors.text, fontWeight: "900", fontSize: 18, marginTop: 6 },

  breakdownRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: spacing.sm },
  breakdownPill: {
    flexDirection: "row", gap: 6, alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
  },
  breakdownPillLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  breakdownPillValue: { color: colors.text, fontWeight: "900", fontSize: 12 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  loadingText: { marginTop: spacing.md, color: colors.muted, fontWeight: "700" },
});