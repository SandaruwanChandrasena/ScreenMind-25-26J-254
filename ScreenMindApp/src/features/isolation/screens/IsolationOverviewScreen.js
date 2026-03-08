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

import {
  getIsolationPrefs,
  upsertDailyIsolationRecord,
  getDailyIsolationHistory,
} from "../services/isolationStorage";
import { collectRealFeatures } from "../services/isolationCollector";
import { checkAllPermissions } from "../services/permissionHelper";

// ── NEW: import the API caller (falls back to local scorer if backend is down)
import { fetchIsolationRiskWithFallback } from "../services/isolationApi";

// ─── Config ───────────────────────────────────────────────────────────────────

// Your device's local IP where the backend runs.
// Change this to match your computer's IP on the same WiFi network.
// Windows: run `ipconfig`  |  Mac/Linux: run `ifconfig`
// Example: 'http://192.168.1.45:8000/api/v1'
const USER_ID = "user_001"; // replace with real auth user ID when available

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

/**
 * Build a list of the last 7 days of feature records from storage.
 * Each element = the `features` field from a daily record.
 * If fewer than 7 days exist, we pad with copies of the earliest record.
 */
function buildFeatureWindow(history, todayFeatures) {
  // history is newest-first, we need oldest-first for the LSTM window
  const sorted = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((r) => r.features)               // only records that have features saved
    .slice(-6);                               // take last 6 saved days

  // Add today's freshly collected features as the final (7th) day
  const window = [...sorted.map((r) => r.features), todayFeatures];

  // Pad to at least 7 if we don't have enough history yet
  while (window.length < 7) {
    window.unshift(window[0]);               // repeat earliest day at the front
  }

  return window.slice(-7);                   // always return exactly 7
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IsolationOverviewScreen({ navigation }) {
  const [loading,        setLoading]        = useState(true);
  const [prefs,          setPrefs]          = useState(null);
  const [features,       setFeatures]       = useState(null);
  const [risk,           setRisk]           = useState({ score: 0, label: "Low", breakdown: {}, used: [] });
  const [hasPermissions, setHasPermissions] = useState(true);
  const [errorMsg,       setErrorMsg]       = useState("");
  const [usingBackend,   setUsingBackend]   = useState(false);   // shows which source was used

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

      // 3) Collect today's fresh features from phone sensors
      const todayFeatures = await collectRealFeatures();
      setFeatures(todayFeatures);

      // 4) Load history and build 7-day window for the ML model
      const history     = await getDailyIsolationHistory();
      const featureWindow = buildFeatureWindow(history, todayFeatures);

      // 5) Call the ML backend (falls back to local scorer automatically)
      const result = await fetchIsolationRiskWithFallback(
        USER_ID,
        featureWindow,
        storedPrefs
      );

      // 6) Detect whether backend ML or local scorer was used
      //    The local scorer sets message starting with "(Local"
      const usedBackend = !result.message?.startsWith("(Local");
      setUsingBackend(usedBackend);

      // 7) Normalise result into the same shape the rest of the UI expects
      //    (backend returns slightly different field names from local scorer)
      const normalisedRisk = {
        score:        result.score,
        label:        result.label,
        breakdown:    normaliseBreakdown(result.breakdown),
        used:         result.used_pillars ?? result.used ?? [],
        reasons:      result.reasons      ?? [],
        suggestions:  result.suggestions  ?? [],
        socialItems:  result.socialItems  ?? [],
        withdrawItems:result.withdrawItems?? [],
      };
      setRisk(normalisedRisk);

      // 8) Save full record so Why/Suggestions/Stats screens can read it
      await upsertDailyIsolationRecord({
        date:          todayISO(),
        riskScore:     normalisedRisk.score,
        riskLabel:     normalisedRisk.label,
        breakdown:     normalisedRisk.breakdown,
        used:          normalisedRisk.used,
        reasons:       normalisedRisk.reasons,
        suggestions:   normalisedRisk.suggestions,
        socialItems:   normalisedRisk.socialItems,
        withdrawItems: normalisedRisk.withdrawItems,
        features:      todayFeatures,
        source:        usedBackend ? "ml_backend" : "local_scorer",
      });

    } catch (e) {
      console.warn("IsolationOverview error:", e);
      setErrorMsg("Couldn't load some metrics. Enable permissions and try again.");
      setFeatures((prev) => prev ?? {});
      setRisk((prev) => prev ?? { score: 0, label: "Low", breakdown: {}, used: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build highlight cards from raw features
  const highlights = useMemo(() => {
    if (!features || !prefs) return [];
    const list = [];

    if (prefs.gps) {
      list.push({ label: "Daily distance", value: formatMeters(features.dailyDistanceMeters) });
    } else {
      list.push({ label: "Daily distance", value: "Off" });
    }

    if (prefs.calls || prefs.sms) {
      list.push({ label: "Connections", value: `${Math.round(features.uniqueContacts || 0)}` });
    } else {
      list.push({ label: "Connections", value: "Off" });
    }

    if (prefs.usage) {
      list.push({ label: "Night usage", value: formatMinutes(features.nightUsageMinutes) });
    } else {
      list.push({ label: "Night usage", value: "Off" });
    }

    return list.slice(0, 4);
  }, [features, prefs]);

  // Build summary sentence
  const summary = useMemo(() => {
    if (!risk.reasons?.length) {
      return "Your recent patterns look balanced. Keep maintaining healthy social exposure.";
    }
    const top = risk.reasons.filter((r) => r.risk > 0.3).slice(0, 2);
    if (!top.length) return "No significant risk factors detected this week. Keep it up!";
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

        {/* Backend/local indicator badge */}
        <View style={[styles.sourceBadge, { backgroundColor: usingBackend ? "rgba(46,204,113,0.15)" : "rgba(243,156,18,0.15)" }]}>
          <Icon
            name={usingBackend ? "cloud-done-outline" : "phone-portrait-outline"}
            size={13}
            color={usingBackend ? "#2ecc71" : "#f39c12"}
          />
          <Text style={[styles.sourceBadgeText, { color: usingBackend ? "#2ecc71" : "#f39c12" }]}>
            {usingBackend ? "AI model (backend)" : "Local estimate"}
          </Text>
        </View>

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The backend returns breakdown as { mobility, communication, behaviour, proximity }
 * The local scorer returns            { mobility, comm, beh, prox }
 * Normalise to a consistent shape for the UI.
 */
function normaliseBreakdown(bd) {
  if (!bd) return {};
  return {
    mobility:      bd.mobility      ?? bd.mobility      ?? 0,
    communication: bd.communication ?? bd.comm          ?? 0,
    behaviour:     bd.behaviour     ?? bd.beh           ?? 0,
    proximity:     bd.proximity     ?? bd.prox          ?? 0,
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title:      { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub:        { color: colors.muted, marginTop: 6, lineHeight: 18 },
  body:       { color: colors.faint, lineHeight: 18 },

  sourceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, marginTop: spacing.sm,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },

  bigBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
  },
  bigBtnText: { color: colors.text, fontWeight: "900" },

  sectionTitle: { color: colors.text, fontWeight: "900", marginTop: spacing.lg, fontSize: 16 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  statCard: {
    width: "31.5%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
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