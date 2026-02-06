import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import {
  getLatestCompletedSession,
  getSessionSummary,
  getActiveSleepSession,
} from "../services/sleepRepository";

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SummaryItem({ label, value }) {
  return (
    <View style={styles.sumItem}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

function MiniBarChart({ title, data }) {
  // data: [{id,label,value}] value 0-10
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardHint}>Higher bars = more disruption</Text>

      <View style={{ height: 14 }} />
      <View style={styles.barRow}>
        {data.map((d) => (
          <View key={d.id} style={styles.barItem}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.min(100, (d.value / 10) * 100)}%` }]} />
            </View>
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function FactorRow({ icon, title, value, note, color = "rgba(239,68,68,0.22)" }) {
  return (
    <View style={styles.factorRow}>
      <View style={[styles.factorIcon, { backgroundColor: color }]}>
        <Text style={styles.factorIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.factorTop}>
          <Text style={styles.factorTitle}>{title}</Text>
          <Text style={styles.factorValue}>{value}</Text>
        </View>
        <Text style={styles.factorNote}>{note}</Text>
      </View>
    </View>
  );
}

function msToHrsMins(ms) {
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Rough "sleep quality %" from disruption signals (demo-friendly).
 * Later you can replace with ML model output.
 */
function computeQualityPercent({ durationMs, unlockCount, notifCount }) {
  const hours = durationMs / (1000 * 60 * 60);

  // normalize:
  const durBad = clamp01((7 - hours) / 3);     // <7h worse
  const unlockBad = clamp01(unlockCount / 12); // 12+ unlocks worst
  const notifBad = clamp01(notifCount / 15);   // 15+ notifs worst

  // weights
  const bad = 0.5 * durBad + 0.3 * unlockBad + 0.2 * notifBad;
  const quality = Math.round((1 - clamp01(bad)) * 100);
  return quality;
}

export default function SleepDetailsScreen({ route }) {
  const userId = null; // later firebase uid
  const passedSessionId = route?.params?.sessionId ?? null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [sessionId, setSessionId] = useState(passedSessionId);

  async function loadDetails() {
    setLoading(true);
    try {
      let sid = passedSessionId;

      // If no sessionId passed, use latest completed; if none, try active (optional)
      if (!sid) {
        const latest = await getLatestCompletedSession(userId);
        sid = latest?.id;

        if (!sid) {
          const active = await getActiveSleepSession(userId);
          sid = active?.id ?? null;
        }
      }

      if (!sid) {
        setSummary(null);
        setSessionId(null);
        return;
      }

      const s = await getSessionSummary(sid);
      if (!s) {
        setSummary(null);
        setSessionId(null);
        return;
      }

      setSessionId(sid);
      setSummary(s);
    } catch (e) {
      console.log("SleepDetails load error:", e);
      Alert.alert("Error", "Failed to load sleep details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [passedSessionId]);

  const ui = useMemo(() => {
    if (!summary) return null;

    const durationMs = summary.durationMs ?? 0;
    const hours = durationMs / (1000 * 60 * 60);

    // Demo estimates (replace later with ML + sensor fusion)
    const timeInBed = msToHrsMins(durationMs);
    const timeAsleep = msToHrsMins(Math.max(0, durationMs - summary.unlockCount * 2 * 60000)); // -2min per unlock
    const timeToSleep = `${Math.min(90, 10 + summary.unlockCount * 2)} min`; // heuristic

    const quality = computeQualityPercent({
      durationMs,
      unlockCount: summary.unlockCount,
      notifCount: summary.notifCount,
    });

    // weekly bars = demo. Later load last 7 sessions and compute scores.
    const bars = [
      { id: "0", label: "M", value: 4 },
      { id: "1", label: "T", value: 6 },
      { id: "2", label: "W", value: 5 },
      { id: "3", label: "T", value: 8 },
      { id: "4", label: "F", value: 7 },
      { id: "5", label: "S", value: 3 },
      { id: "6", label: "S", value: 4 },
    ];

    // Factor values from DB
    const lateNightScreenMins = Math.min(180, summary.screenOnCount * 8); // heuristic: 8 min per screen-on
    const unlocksAfter9 = summary.unlockCount;
    const notifCount = summary.notifCount;

    // DND: you don’t store yet, so show “Unknown” until you log it
    const dnd = "Unknown";

    // Insight note based on hours
    const durationNote =
      hours < 6
        ? "Short sleep duration detected. Consider reducing screen time 30–60 minutes before bed."
        : "Sleep duration looks okay. Keeping bedtime consistent can improve quality.";

    return {
      timeInBed,
      timeAsleep,
      timeToSleep,
      quality: `${quality}%`,
      bars,
      lateNightScreenMins,
      unlocksAfter9,
      notifCount,
      dnd,
      durationNote,
    };
  }, [summary]);

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Sleep Details</Text>
        <Text style={styles.sub}>
          Factors & insights from your phone behavior.
          {!!sessionId ? ` (Session #${sessionId})` : ""}
        </Text>

        {loading && (
          <View style={{ paddingVertical: 30 }}>
            <ActivityIndicator />
          </View>
        )}

        {!loading && !summary && (
          <Card>
            <Text style={styles.cardTitle}>No data found</Text>
            <Text style={styles.cardHint}>(Start & Stop a session to generate a report.)</Text>
          </Card>
        )}

        {!loading && !!summary && !!ui && (
          <>
            {/* Summary */}
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={styles.cardTitle}>Last Night Summary</Text>
              <Text style={styles.cardHint}>{ui.durationNote}</Text>

              <View style={{ height: 14 }} />
              <View style={styles.summaryGrid}>
                <SummaryItem label="Time in bed" value={ui.timeInBed} />
                <SummaryItem label="Time asleep" value={ui.timeAsleep} />
                <SummaryItem label="Time to sleep" value={ui.timeToSleep} />
                <SummaryItem label="Quality" value={ui.quality} />
              </View>
            </Card>

            {/* Weekly trend (demo) */}
            <MiniBarChart title="Weekly Disruption Trend" data={ui.bars} />

            <View style={{ height: spacing.md }} />

            {/* Factors */}
            <Card>
              <Text style={styles.cardTitle}>Contributing Factors</Text>
              <Text style={styles.cardHint}>These patterns can affect sleep quality.</Text>

              <View style={{ height: 16 }} />

              <FactorRow
                icon="📱"
                title="Late-night screen time"
                value={`${ui.lateNightScreenMins} min`}
                note="Using the phone close to bedtime increases sleep delay."
                color="rgba(124,58,237,0.22)"
              />

              <View style={styles.divider} />

              <FactorRow
                icon="🔓"
                title="Unlocks during session"
                value={`${ui.unlocksAfter9}`}
                note="Frequent checking may indicate restlessness."
                color="rgba(34,197,94,0.16)"
              />

              <View style={styles.divider} />

              <FactorRow
                icon="🔔"
                title="Notifications"
                value={`${ui.notifCount}`}
                note="Night notifications can interrupt sleep and increase awakenings."
                color="rgba(239,68,68,0.14)"
              />

              <View style={styles.divider} />

              {/* <FactorRow
                icon="🌙"
                title="Do Not Disturb"
                value={ui.dnd}
                note="Enable DND to reduce interruptions during sleep time."
                color="rgba(245,158,11,0.14)"
              /> */}
            </Card>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sumItem: {
    width: "47%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sumLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  sumValue: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 6 },

  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 140 },
  barItem: { flex: 1, alignItems: "center" },
  barTrack: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.50)",
  },
  barLabel: { color: colors.faint, fontWeight: "900", fontSize: 12, marginTop: 8 },

  factorRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  factorIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  factorIconText: { fontSize: 18 },
  factorTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factorTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  factorValue: { color: colors.text, fontWeight: "900", fontSize: 14, opacity: 0.9 },
  factorNote: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },
});
