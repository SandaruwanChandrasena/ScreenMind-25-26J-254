import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import {
  getLatestCompletedSession,
  getSessionSummary,
  getActiveSleepSession,
  getMorningCheckInForSession,
  getLast7Sessions,
} from "../services/sleepRepository";

// ─── helpers ────────────────────────────────────────────────────────────────

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
 * Sleep quality %: blends disruption signals with self-reported score when available.
 */
function computeQualityPercent({ durationMs, unlockCount, notifCount, selfReported }) {
  const hours = durationMs / (1000 * 60 * 60);

  const durBad = clamp01((7 - hours) / 3);
  const unlockBad = clamp01(unlockCount / 12);
  const notifBad = clamp01(notifCount / 15);
  const disruptionBad = 0.5 * durBad + 0.3 * unlockBad + 0.2 * notifBad;
  const disruption = Math.round((1 - clamp01(disruptionBad)) * 100);

  if (selfReported != null && selfReported >= 0 && selfReported <= 10) {
    // Blend: 60% disruption signals, 40% self-report
    const selfPct = Math.round((selfReported / 10) * 100);
    return Math.round(disruption * 0.6 + selfPct * 0.4);
  }

  return disruption;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionHeader({ icon, title, sub }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!sub && <Text style={styles.cardHint}>{sub}</Text>}
      </View>
    </View>
  );
}

function SummaryItem({ label, value, highlight }) {
  return (
    <View style={[styles.sumItem, highlight && styles.sumItemHighlight]}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, highlight && { color: colors.primary2 }]}>{value}</Text>
    </View>
  );
}

function MiniBarChart({ title, data }) {
  return (
    <Card>
      <SectionHeader icon="📈" title={title} sub="Higher bars = more disruption" />
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

/** Horizontal score bar for check-in values */
function ScoreBar({ value, max = 10 }) {
  const pct = Math.max(0, Math.min(1, value / max));
  let barColor = "rgba(239,68,68,0.70)";
  if (pct > 0.7) barColor = "rgba(34,197,94,0.70)";
  else if (pct > 0.4) barColor = "rgba(245,158,11,0.70)";
  return (
    <View style={styles.scoreBarTrack}>
      <View style={[styles.scoreBarFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
    </View>
  );
}

/** Chip: yes (red-tinted) or no (green-tinted) */
function StatusChip({ label, yes }) {
  const bg = yes ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.16)";
  const bc = yes ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.30)";
  const tc = yes ? "#F87171" : "#4ADE80";
  return (
    <View style={[styles.statusChip, { backgroundColor: bg, borderColor: bc }]}>
      <Text style={[styles.statusChipText, { color: tc }]}>
        {yes ? "✓" : "✗"} {label}
      </Text>
    </View>
  );
}

/** Morning check-in card — shown when checkIn data exists */
function CheckInCard({ checkIn, navigation }) {
  const q = checkIn.sleep_quality ?? 0;
  const r = checkIn.refreshed ?? 0;
  const headache = checkIn.headache === "Yes";
  const dryMouth = checkIn.dry_mouth === "Yes";
  const wokeUp = checkIn.woke_up === "Yes";
  const snoreUsed = checkIn.snore_used === "Yes";

  // Mood label from score
  const moodLabel =
    r >= 9 ? "😄 Great" :
      r >= 7 ? "😊 Good" :
        r >= 5 ? "🙂 Okay" :
          r >= 3 ? "😐 Tired" :
            "😴 Exhausted";

  return (
    <Card style={{ marginTop: spacing.md }}>
      <SectionHeader
        icon="☀️"
        title="Morning Check-In"
        sub="Self-reported quality data"
      />

      {/* Sleep quality */}
      <Text style={styles.checkLabel}>Sleep Quality</Text>
      <View style={styles.checkScoreRow}>
        <Text style={styles.checkScoreNum}>{q}</Text>
        <Text style={styles.checkScoreDen}> / 10</Text>
      </View>
      <ScoreBar value={q} />

      <View style={{ height: spacing.md }} />

      {/* Refreshed */}
      <Text style={styles.checkLabel}>Morning Energy · <Text style={{ color: colors.text }}>{moodLabel}</Text></Text>
      <View style={styles.checkScoreRow}>
        <Text style={styles.checkScoreNum}>{r}</Text>
        <Text style={styles.checkScoreDen}> / 10</Text>
      </View>
      <ScoreBar value={r} />

      <View style={styles.divider} />

      {/* Symptoms chips */}
      <Text style={styles.checkLabel}>Symptoms & Events</Text>
      <View style={styles.chipRow}>
        <StatusChip label="Headache" yes={headache} />
        <StatusChip label="Dry Mouth" yes={dryMouth} />
        <StatusChip label="Night Wake" yes={wokeUp} />
        <StatusChip label="Snore Detect" yes={snoreUsed} />
      </View>

      {/* Update button */}
      {/* <Pressable
        onPress={() => navigation.navigate("SleepCheckIn")}
        style={styles.updateCheckInBtn}
      >
        <Text style={styles.updateCheckInText}>✏️ Update Check-In</Text>
      </Pressable> */}
    </Card>
  );
}

/** CTA card — shown when no check-in exists yet */
function NoCheckInCard({ navigation }) {
  return (
    <Card style={[styles.noCheckInCard, { marginTop: spacing.md }]}>
      <Text style={styles.noCheckInEmoji}>☀️</Text>
      <Text style={styles.noCheckInTitle}>No Morning Check-In yet</Text>
      <Text style={styles.noCheckInSub}>
        Fill in your morning check-in to get a more accurate sleep quality score.
      </Text>
      <PrimaryButton
        title="Fill Morning Check-In"
        onPress={() => navigation.navigate("SleepCheckIn")}
        style={{ marginTop: spacing.md, backgroundColor: colors.primary }}
      />
    </Card>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function SleepDetailsScreen({ route, navigation }) {
  const userId = null;
  const passedSessionId = route?.params?.sessionId ?? null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [checkIn, setCheckIn] = useState(null);
  const [sessionId, setSessionId] = useState(passedSessionId);
  const [weeklyData, setWeeklyData] = useState([]);
  const [period, setPeriod] = useState('day'); // 'day', 'week', 'month'

  async function loadDetails() {
    setLoading(true);
    try {
      let sid = passedSessionId;

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
        setCheckIn(null);
        return;
      }

      const s = await getSessionSummary(sid);
      if (!s) {
        setSummary(null);
        setSessionId(null);
        setCheckIn(null);
        return;
      }

      setSessionId(sid);
      setSummary(s);

      // Load check-in separately so the card has all fields
      const ci = await getMorningCheckInForSession(sid);
      setCheckIn(ci);

      // Load last 7 sessions for weekly trend
      const last7 = await getLast7Sessions(userId);
      setWeeklyData(last7 || []);

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
    if (!summary && period === 'day') return null;
    if (period !== 'day' && weeklyData.length === 0) return null;

    // Aggregate data based on period
    let aggregatedData;
    if (period === 'day') {
      aggregatedData = summary;
    } else {
      // For week/month, aggregate weeklyData
      const sessions = period === 'week' ? weeklyData.slice(0, 7) : weeklyData;
      const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);
      const totalUnlocks = sessions.reduce((sum, s) => sum + (s.unlockCount || 0), 0);
      const totalNotifs = sessions.reduce((sum, s) => sum + (s.notifCount || 0), 0);
      const totalScreenOn = sessions.reduce((sum, s) => sum + (s.screenOnCount || 0), 0);
      const avgQuality = sessions.length > 0 ? sessions.reduce((sum, s) => {
        const q = computeQualityPercent({
          durationMs: s.durationMs,
          unlockCount: s.unlockCount,
          notifCount: s.notifCount,
          selfReported: null,
        });
        return sum + q;
      }, 0) / sessions.length : 0;

      aggregatedData = {
        durationMs: totalDuration,
        unlockCount: totalUnlocks,
        notifCount: totalNotifs,
        screenOnCount: totalScreenOn,
        sessionCount: sessions.length,
        avgQuality: Math.round(avgQuality),
      };
    }

    const durationMs = aggregatedData.durationMs ?? 0;
    const hours = durationMs / (1000 * 60 * 60);

    const timeInBed = period === 'day'
      ? msToHrsMins(durationMs)
      : `${Math.round(hours)}h ${Math.round((hours % 1) * 60)}m avg/night`;

    const timeAsleep = period === 'day'
      ? msToHrsMins(Math.max(0, durationMs - aggregatedData.unlockCount * 2 * 60000))
      : msToHrsMins(Math.max(0, (durationMs - aggregatedData.unlockCount * 2 * 60000) / (aggregatedData.sessionCount || 1)));

    const timeToSleep = `${Math.min(90, 10 + Math.round(aggregatedData.unlockCount / (aggregatedData.sessionCount || 1)) * 2)} min`;

    // Use self-reported quality if check-in exists (day view only)
    const selfReported = period === 'day' ? (checkIn?.sleep_quality ?? null) : null;
    const quality = period === 'day'
      ? computeQualityPercent({
        durationMs,
        unlockCount: aggregatedData.unlockCount,
        notifCount: aggregatedData.notifCount,
        selfReported,
      })
      : aggregatedData.avgQuality;

    // Bars for chart based on selected period
    let bars;
    let chartTitle;

    if (period === 'day') {
      // Day view: show last 7 days trend
      bars = weeklyData.slice(0, 7).reverse().map((s, idx) => {
        const hours = (s.durationMs || 0) / (1000 * 60 * 60);
        const durBad = clamp01((7 - hours) / 3);
        const unlockBad = clamp01((s.unlockCount || 0) / 12);
        const notifBad = clamp01((s.notifCount || 0) / 15);
        const disruptionScore = durBad * 5 + unlockBad * 3 + notifBad * 2;

        const date = new Date(s.end || s.start);
        const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];

        return {
          id: String(idx),
          label: dayLabel,
          value: Math.round(disruptionScore),
        };
      });
      chartTitle = "Last 7 Days Trend";
    } else if (period === 'week') {
      // Week view: show last 7 sessions with date labels
      bars = weeklyData.slice(0, 7).reverse().map((s, idx) => {
        const hours = (s.durationMs || 0) / (1000 * 60 * 60);
        const durBad = clamp01((7 - hours) / 3);
        const unlockBad = clamp01((s.unlockCount || 0) / 12);
        const notifBad = clamp01((s.notifCount || 0) / 15);
        const disruptionScore = durBad * 5 + unlockBad * 3 + notifBad * 2;

        const date = new Date(s.end || s.start);
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

        return {
          id: String(idx),
          label: dateLabel,
          value: Math.round(disruptionScore),
        };
      });
      chartTitle = "Last 7 Sessions";
    } else {
      // Month view: group by week, show 4 weeks
      const weekGroups = [];
      for (let i = 0; i < Math.min(4, Math.ceil(weeklyData.length / 7)); i++) {
        const weekSessions = weeklyData.slice(i * 7, (i + 1) * 7);
        if (weekSessions.length === 0) break;

        const avgDisruption = weekSessions.reduce((sum, s) => {
          const hours = (s.durationMs || 0) / (1000 * 60 * 60);
          const durBad = clamp01((7 - hours) / 3);
          const unlockBad = clamp01((s.unlockCount || 0) / 12);
          const notifBad = clamp01((s.notifCount || 0) / 15);
          return sum + (durBad * 5 + unlockBad * 3 + notifBad * 2);
        }, 0) / weekSessions.length;

        weekGroups.push({
          id: String(i),
          label: `W${4 - i}`,
          value: Math.round(avgDisruption),
        });
      }
      bars = weekGroups.reverse();
      chartTitle = "Last 4 Weeks";
    }

    // Fallback to demo data if no history
    const barsFinal = bars && bars.length > 0 ? bars : [
      { id: "0", label: "—", value: 0 },
    ];

    const lateNightScreenMins = Math.min(180, aggregatedData.screenOnCount * 8);
    const unlocksAfter9 = aggregatedData.unlockCount;
    const notifCount = aggregatedData.notifCount;
    const sessionCount = aggregatedData.sessionCount || 1;

    const durationNote = period === 'day'
      ? (hours < 6
        ? "Short sleep detected. Consider reducing screen time 30–60 min before bed."
        : "Sleep duration looks okay. Consistent bedtime improves quality.")
      : `Average data from ${sessionCount} night${sessionCount > 1 ? 's' : ''}`;

    const qualitySource = period === 'day'
      ? (selfReported != null ? " (blended with check-in)" : " (sensor-based)")
      : " (averaged)";

    return {
      timeInBed, timeAsleep, timeToSleep,
      quality: `${quality}%`,
      qualitySource,
      bars: barsFinal,
      chartTitle,
      lateNightScreenMins,
      unlocksAfter9,
      notifCount,
      durationNote,
      period,
      sessionCount,
    };
  }, [summary, checkIn, weeklyData, period]);

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.overline}>SLEEP REPORT</Text>
        <Text style={styles.title}>Sleep Details</Text>
        <Text style={styles.sub}>
          Factors & insights from your phone behaviour.
          {period === 'day' && !!sessionId ? ` (Session #${sessionId})` : ""}
        </Text>

        {/* Period Selector */}
        <View style={styles.periodTabs}>
          <Pressable
            style={[styles.periodTab, period === 'day' && styles.periodTabActive]}
            onPress={() => setPeriod('day')}
          >
            <Text style={[styles.periodTabText, period === 'day' && styles.periodTabTextActive]}>
              Day
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.periodTabText, period === 'week' && styles.periodTabTextActive]}>
              Week
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>
              Month
            </Text>
          </Pressable>
        </View>

        {loading && (
          <View style={{ paddingVertical: 30 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!loading && !summary && (
          <Card>
            <Text style={styles.cardTitle}>No data found</Text>
            <Text style={styles.cardHint}>(Start & stop a session to generate a report.)</Text>
          </Card>
        )}

        {!loading && !!summary && !!ui && (
          <>
            {/* Summary */}
            <Card style={{ marginBottom: spacing.md }}>
              <SectionHeader
                icon="🌙"
                title={period === 'day' ? "Last Night Summary" : `${period === 'week' ? 'Weekly' : 'Monthly'} Summary`}
                sub={ui.durationNote}
              />
              <View style={styles.summaryGrid}>
                <SummaryItem label="Time in bed" value={ui.timeInBed} />
                <SummaryItem label="Time asleep" value={ui.timeAsleep} />
                <SummaryItem label="Time to sleep" value={ui.timeToSleep} />
                <SummaryItem
                  label={`Quality${ui.qualitySource}`}
                  value={ui.quality}
                  highlight
                />
              </View>
            </Card>

            {/* Trend chart with dynamic title */}
            <MiniBarChart title={ui.chartTitle} data={ui.bars} />

            <View style={{ height: spacing.md }} />

            {/* Contributing Factors */}
            <Card>
              <SectionHeader
                icon="📊"
                title="Contributing Factors"
                sub="These patterns affect sleep quality."
              />

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
                title={period === 'day' ? "Unlocks during session" : "Total unlocks"}
                value={period === 'day' ? `${ui.unlocksAfter9}` : `${ui.unlocksAfter9} (${Math.round(ui.unlocksAfter9 / ui.sessionCount)}/night)`}
                note="Frequent checking may indicate restlessness."
                color="rgba(34,197,94,0.16)"
              />

              <View style={styles.divider} />

              <FactorRow
                icon="🔔"
                title="Notifications"
                value={period === 'day' ? `${ui.notifCount}` : `${ui.notifCount} (${Math.round(ui.notifCount / ui.sessionCount)}/night)`}
                note="Night notifications can interrupt sleep."
                color="rgba(239,68,68,0.14)"
              />
            </Card>

            {/* Morning Check-In card (day view only) */}
            {period === 'day' && (
              checkIn ? (
                <CheckInCard checkIn={checkIn} navigation={navigation} />
              ) : (
                <NoCheckInCard navigation={navigation} />
              )
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  overline: { color: colors.primary, fontWeight: "900", fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, marginBottom: spacing.md, lineHeight: 18 },

  // Period tabs
  periodTabs: {
    flexDirection: "row",
    backgroundColor: colors.input,
    borderRadius: 16,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  periodTabActive: {
    backgroundColor: "rgba(124,58,237,0.20)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
  },
  periodTabText: {
    color: colors.muted,
    fontWeight: "900",
    fontSize: 13,
  },
  periodTabTextActive: {
    color: colors.primary,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.md },
  sectionIconWrap: {
    width: 40, height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIcon: { fontSize: 18 },

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 4, lineHeight: 16 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sumItem: {
    width: "47%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sumItemHighlight: {
    borderColor: "rgba(124,58,237,0.40)",
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  sumLabel: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  sumValue: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 6 },

  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 140 },
  barItem: { flex: 1, alignItems: "center" },
  barTrack: {
    width: "100%", height: 110,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: { width: "100%", borderRadius: 14, backgroundColor: "rgba(124,58,237,0.50)" },
  barLabel: { color: colors.faint, fontWeight: "900", fontSize: 12, marginTop: 8 },

  factorRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  factorIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  factorIconText: { fontSize: 18 },
  factorTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factorTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  factorValue: { color: colors.text, fontWeight: "900", fontSize: 14, opacity: 0.9 },
  factorNote: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },

  // Check-in card
  checkLabel: { color: colors.muted, fontWeight: "900", fontSize: 12, marginBottom: 4 },
  checkScoreRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8 },
  checkScoreNum: { color: colors.text, fontWeight: "900", fontSize: 32 },
  checkScoreDen: { color: colors.faint, fontWeight: "900", fontSize: 14, marginBottom: 5 },

  scoreBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  scoreBarFill: { height: "100%", borderRadius: 999 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusChipText: { fontWeight: "900", fontSize: 12 },

  updateCheckInBtn: {
    marginTop: spacing.md,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.30)",
  },
  updateCheckInText: { color: colors.primary, fontWeight: "900", fontSize: 12 },

  // No check-in CTA card
  noCheckInCard: { alignItems: "center", paddingVertical: spacing.xl },
  noCheckInEmoji: { fontSize: 40, marginBottom: 12 },
  noCheckInTitle: { color: colors.text, fontWeight: "900", fontSize: 16, textAlign: "center" },
  noCheckInSub: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
});
