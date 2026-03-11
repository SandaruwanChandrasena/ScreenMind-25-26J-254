import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function MentalHealthDashboard({ route, navigation }) {
  const result = route?.params?.result;

  // ── Questionnaire scores ──────────────────────────────────
  const phqScore = result?.phq9?.score ?? 0;
  const phqSev   = result?.phq9?.severity ?? "—";
  const gadScore = result?.gad7?.score ?? 0;
  const gadSev   = result?.gad7?.severity ?? "—";

  // ── Combined risk ─────────────────────────────────────────
  const combinedLabel    = result?.combinedRisk?.label ?? result?.aiPrediction?.label ?? "—";
  const combinedScore01Raw = result?.combinedRisk?.score ?? result?.aiPrediction?.score01 ?? null;
  const combinedScore01  = typeof combinedScore01Raw === "number" ? clamp01(combinedScore01Raw) : null;

  const submittedAt = result?.submittedAt ?? null;

  // ── Usage window ──────────────────────────────────────────
  const usageWindow = Array.isArray(result?.usageWindow) ? result.usageWindow : [];
  const bpri        = result?.bpri ?? null;

  // ── Real usage features (direct from extractUsageFeatures) ─
  // This is the rich real data: socialMediaMin, topApps, appCount etc.
  const realFeatures = result?.realUsageFeatures ?? null;
  const usageSource  = result?.usageSource ?? "simulated";
  const isRealData   = usageSource === "real";

  const badge = useMemo(() => getRiskBadge(combinedLabel), [combinedLabel]);

  // ── Usage summary ─────────────────────────────────────────
  // Works for both 1-day (real) and 7-day (simulated) windows
  const usageSummary = useMemo(() => {
    if (!usageWindow.length) return null;

    const windowOldToNew = [...usageWindow].reverse();
    const last7 = windowOldToNew.slice(-7);

    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const total   = last7.map((d) => d.totalScreenTimeMin ?? 0);
    const night   = last7.map((d) => d.nightUsageMin ?? 0);
    const unlock  = last7.map((d) => d.unlockCount ?? 0);
    const session = last7.map((d) => d.avgSessionMin ?? 0);

    const newest = last7[last7.length - 1];
    const oldest = last7[0];

    const newestRisk = newest ? computeDayUsageRisk01(newest) : null;
    const oldestRisk = oldest ? computeDayUsageRisk01(oldest) : null;

    return {
      days:           last7.length,
      avgTotalMin:    Math.round(avg(total)),
      avgNightMin:    Math.round(avg(night)),
      avgUnlocks:     Math.round(avg(unlock)),
      avgSessionMin:  Math.round(avg(session)),
      newest,
      oldest,
      newestRisk,
      oldestRisk,
      chart: {
        total,
        night,
        unlock,
        session,
        labels: last7.map((_, i) =>
          last7.length === 1 ? "Today" : `D${i + 1}`
        ),
      },
    };
  }, [usageWindow]);

  // ── Trend (only meaningful with 7+ days) ─────────────────
  const trend = useMemo(() => {
    if (usageSummary?.days < 2) return null; // not enough days for trend
    if (usageSummary?.newestRisk == null || usageSummary?.oldestRisk == null) return null;

    const diff = usageSummary.newestRisk - usageSummary.oldestRisk;
    if (diff <= -0.08) return { label: "Improving",  icon: "⬇️", hint: "Your usage risk seems to be going down." };
    if (diff >= 0.08)  return { label: "Worsening",  icon: "⬆️", hint: "Your usage risk seems to be going up." };
    return              { label: "Stable",     icon: "➡️", hint: "Your usage risk looks fairly steady." };
  }, [usageSummary]);

  const bpriLabel = bpri?.label || bpriLabelFromScore(bpri?.score);
  const bpriBadge = useMemo(() => getBpriBadge(bpriLabel), [bpriLabel]);

  // ── Key insights (now uses real features if available) ────
  const keyInsights = useMemo(() => {
    const list = [];
    const newest = usageSummary?.newest;

    // Real data insights — more detailed
    if (realFeatures && isRealData) {
      if ((realFeatures.totalScreenTimeMin ?? 0) >= 360)
        list.push({ icon: "📱", text: `High daily screen time: ${realFeatures.totalScreenTimeMin} min today.` });
      if ((realFeatures.socialMediaMin ?? 0) >= 60)
        list.push({ icon: "📲", text: `Heavy social media use: ${realFeatures.socialMediaMin} min today.` });
      if ((realFeatures.communicationMin ?? 0) >= 90)
        list.push({ icon: "💬", text: `High messaging app usage: ${realFeatures.communicationMin} min.` });
      if ((realFeatures.videoMin ?? 0) >= 60)
        list.push({ icon: "🎬", text: `Significant video streaming: ${realFeatures.videoMin} min.` });
      if ((realFeatures.appCount ?? 0) >= 15)
        list.push({ icon: "🗂️", text: `You used ${realFeatures.appCount} different apps today.` });
    } else if (newest) {
      // Simulated data insights
      if ((newest.nightUsageMin ?? 0) >= 90)
        list.push({ icon: "🌙", text: "High night-time phone use." });
      if ((newest.totalScreenTimeMin ?? 0) >= 360)
        list.push({ icon: "📱", text: "High daily screen time." });
      if ((newest.unlockCount ?? 0) >= 120)
        list.push({ icon: "🔓", text: "Very frequent checking (many unlocks)." });
      if ((newest.avgSessionMin ?? 0) >= 20)
        list.push({ icon: "⏳", text: "Long sessions (possible doom-scrolling)." });
    }

    if (phqScore >= 10)     list.push({ icon: "🧠", text: "Mood score suggests moderate or higher symptoms." });
    else if (phqScore >= 5) list.push({ icon: "🧠", text: "Mood score suggests mild symptoms." });

    if (gadScore >= 10)     list.push({ icon: "💭", text: "Anxiety score suggests moderate or higher symptoms." });
    else if (gadScore >= 5) list.push({ icon: "💭", text: "Anxiety score suggests mild symptoms." });

    if (!list.length) list.push({ icon: "ℹ️", text: "No major risk signals found. Keep up the good habits!" });

    return list.slice(0, 6);
  }, [usageSummary, phqScore, gadScore, realFeatures, isRealData]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.title}>Mental Health Risk Summary</Text>
        <Text style={styles.subtitle}>
          Based on your check-in answers and{" "}
          {isRealData ? "your real phone usage today." : "simulated usage patterns."}
        </Text>

        {/* Data source badge */}
        <View style={[styles.sourceBadge, { borderColor: isRealData ? "#22c55e" : "#f59e0b" }]}>
          <Text style={[styles.sourceText, { color: isRealData ? "#22c55e" : "#f59e0b" }]}>
            {isRealData ? "📡 Real usage data" : "🧪 Simulated usage data"}
          </Text>
        </View>

        {/* Top Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Overall risk</Text>
              <Text style={styles.summaryMain}>{badge.text}</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={styles.badgePillText}>{badge.text}</Text>
            </View>
          </View>

          <Text style={styles.summaryHint}>{badge.hint}</Text>

          <View style={{ marginTop: spacing.md }}>
            <View style={styles.progressTopRow}>
              <Text style={styles.progressLabel}>Risk meter</Text>
              <Text style={styles.progressValue}>
                {typeof combinedScore01 === "number" ? `${Math.round(combinedScore01 * 100)}%` : "—"}
              </Text>
            </View>
            <ProgressBar value01={typeof combinedScore01 === "number" ? combinedScore01 : 0} />
            <Text style={styles.progressLegend}>Low • Moderate • High</Text>
          </View>

          {submittedAt
            ? <Text style={styles.smallMuted}>Last updated: {formatDateTime(submittedAt)}</Text>
            : null}
        </View>

        {/* Real usage breakdown (shown only when real data available) */}
        {isRealData && realFeatures && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📡 Today's Real Usage Breakdown</Text>

            <View style={styles.usageGrid}>
              <UsageItem icon="📱" label="Total screen time"  value={minToHrMin(realFeatures.totalScreenTimeMin)} />
              <UsageItem icon="📲" label="Social media"       value={minToHrMin(realFeatures.socialMediaMin)} />
              <UsageItem icon="💬" label="Communication"      value={minToHrMin(realFeatures.communicationMin)} />
              <UsageItem icon="🎬" label="Video streaming"    value={minToHrMin(realFeatures.videoMin)} />
              <UsageItem icon="🌐" label="Browser"            value={minToHrMin(realFeatures.browserMin)} />
              <UsageItem icon="🗂️" label="Apps used"          value={`${realFeatures.appCount} apps`} />
            </View>

            {/* Top Apps */}
            {Array.isArray(realFeatures.topApps) && realFeatures.topApps.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.miniTitle}>🏆 Top Apps Today</Text>
                {realFeatures.topApps.map((app, idx) => (
                  <View key={idx} style={styles.appRow}>
                    <Text style={styles.appRank}>{idx + 1}.</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appName}>{app.appName}</Text>
                      <Text style={styles.appMeta}>{app.totalTimeMin} min · {app.category}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Trend card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7-day Trend</Text>
          {trend ? (
            <View style={styles.trendRow}>
              <Text style={styles.trendIcon}>{trend.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trendTitle}>{trend.label}</Text>
                <Text style={styles.trendHint}>{trend.hint}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.muted}>
              {isRealData
                ? "Trend will appear after multiple assessments over several days."
                : "Trend needs a 7-day window to compare."}
            </Text>
          )}
        </View>

        {/* Check-in scores */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Check-in Results</Text>
          <View style={styles.row}>
            <InfoTile title="🧠 Mood (PHQ-9)"    value={String(phqScore)} note={friendlySeverity("mood", phqSev)} />
            <InfoTile title="💭 Anxiety (GAD-7)" value={String(gadScore)} note={friendlySeverity("anxiety", gadSev)} />
          </View>
        </View>

        {/* Usage window card (simulated or multi-day) */}
        {usageSummary && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Phone Usage {usageSummary.days > 1 ? `(Last ${usageSummary.days} Days)` : "(Today)"}
            </Text>

            <View style={styles.usageGrid}>
              <UsageItem icon="📱" label="Daily screen time" value={minToHrMin(usageSummary.avgTotalMin)} />
              <UsageItem icon="🌙" label="Night-time use"    value={minToHrMin(usageSummary.avgNightMin)} />
              <UsageItem icon="🔓" label="Phone checks/day"  value={String(usageSummary.avgUnlocks)} />
              <UsageItem icon="⏳" label="Avg session"       value={`${usageSummary.avgSessionMin} min`} />
            </View>

            {usageSummary.days >= 1 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.miniTitle}>Weekly pattern</Text>
                <MiniBarChart title="📱 Screen time"  unit="min"   values={usageSummary.chart.total}   labels={usageSummary.chart.labels} />
                <MiniBarChart title="🌙 Night usage"  unit="min"   values={usageSummary.chart.night}   labels={usageSummary.chart.labels} />
                <MiniBarChart title="🔓 Unlocks"      unit="times" values={usageSummary.chart.unlock}  labels={usageSummary.chart.labels} />
                <MiniBarChart title="⏳ Avg session"  unit="min"   values={usageSummary.chart.session} labels={usageSummary.chart.labels} />
              </>
            )}

            <View style={styles.divider} />
            <View style={styles.patternRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patternTitle}>Behavior pattern score (BPRI)</Text>
                <Text style={styles.patternHint}>
                  Shows if your habits (night use + frequent checking + session pattern) look risky.
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: bpriBadge.bg, borderColor: bpriBadge.border }]}>
                <Text style={styles.pillText}>
                  {typeof bpri?.score === "number" ? `${bpri.score} • ${bpriBadge.text}` : bpriBadge.text}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Key Insights */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          {keyInsights.map((it, idx) => (
            <View key={idx} style={styles.insightRow}>
              <Text style={styles.insightIcon}>{it.icon}</Text>
              <Text style={styles.insightText}>{it.text}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What you can do next</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Small steps that help</Text>
            <Text style={styles.tipLine}>• Try "Do Not Disturb" after 10 PM</Text>
            <Text style={styles.tipLine}>• Stop screen use 30–60 mins before sleep</Text>
            <Text style={styles.tipLine}>• Move social media apps off your home screen</Text>
            <Text style={styles.tipLine}>• Take a 5-minute break every hour</Text>
            <Text style={styles.tipLine}>• If you feel overwhelmed, talk to a trusted person</Text>
          </View>
          <Text style={styles.smallMuted}>This app does not diagnose. It only provides a wellbeing snapshot.</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate("PredictionHistoryScreen")}
            style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.btnSecondaryText}>View History</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("QuestionnaireScreen")}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.btnPrimaryText}>Retake Check-in</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate("Dashboard")} style={styles.backHome}>
          <Text style={styles.backHomeText}>Back to Home</Text>
        </Pressable>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

/* ── UI components ───────────────────────────────────────── */

function ProgressBar({ value01 }) {
  const v = clamp01(value01);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(v * 100)}%` }]} />
    </View>
  );
}

function InfoTile({ title, value, note }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileNote}>{note}</Text>
    </View>
  );
}

function UsageItem({ icon, label, value }) {
  return (
    <View style={styles.usageRow}>
      <Text style={styles.usageIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageValue}>{value}</Text>
      </View>
    </View>
  );
}

function MiniBarChart({ title, values = [], labels = [], unit = "" }) {
  const max   = Math.max(...values, 1);
  const last  = values.length ? values[values.length - 1] : 0;
  const first = values.length ? values[0] : 0;
  const change = last - first;
  const changeText =
    Math.abs(change) < 1 ? "No big change"
    : change > 0 ? `+${Math.round(change)} ${unit}`
    : `${Math.round(change)} ${unit}`;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartTop}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartChange}>{changeText}</Text>
      </View>
      <View style={styles.barsRow}>
        {values.map((v, i) => {
          const h = Math.max(6, Math.round((v / max) * 44));
          return (
            <View key={String(i)} style={styles.barWrap}>
              <View style={[styles.bar, { height: h }]} />
              <Text style={styles.barLabel}>{labels[i] || ""}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.chartFoot}>
        Min: {Math.round(Math.min(...values, 0))} {unit} • Max: {Math.round(max)} {unit}
      </Text>
    </View>
  );
}

/* ── helpers ────────────────────────────────────────────── */

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v || 0)));
}

function minToHrMin(min) {
  const m = Number(min || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

function formatDateTime(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return ""; }
}

function computeDayUsageRisk01(day) {
  const screenTimeScore = clamp01((day.totalScreenTimeMin ?? 0) / 600);
  const nightScore      = clamp01((day.nightUsageMin ?? 0) / 180);
  const unlockScore     = clamp01((day.unlockCount ?? 0) / 120);
  const sessionScore    = clamp01((day.avgSessionMin ?? 0) / 30);
  return clamp01(0.4 * screenTimeScore + 0.3 * nightScore + 0.2 * unlockScore + 0.1 * sessionScore);
}

function friendlySeverity(type, severity) {
  const s = String(severity || "").toLowerCase();
  if (type === "mood") {
    if (s.includes("severe"))   return "High mood symptoms";
    if (s.includes("moderate")) return "Moderate mood symptoms";
    if (s.includes("mild"))     return "Mild mood symptoms";
    return "Minimal mood symptoms";
  }
  if (s.includes("severe"))   return "High anxiety symptoms";
  if (s.includes("moderate")) return "Moderate anxiety symptoms";
  if (s.includes("mild"))     return "Mild anxiety symptoms";
  return "Minimal anxiety symptoms";
}

function getRiskBadge(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("high")) return {
    text: "High", bg: "rgba(239,68,68,0.16)", border: "rgba(239,68,68,0.45)",
    hint: "Your answers and habits suggest higher stress. Consider support and healthier screen routines.",
  };
  if (l.includes("moderate")) return {
    text: "Moderate", bg: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.45)",
    hint: "Some risk indicators detected. Small habit improvements can help a lot.",
  };
  return {
    text: "Low", bg: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.45)",
    hint: "Risk looks low right now. Keep steady routines and take breaks.",
  };
}

function bpriLabelFromScore(score) {
  if (typeof score !== "number") return "—";
  if (score >= 70) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

function getBpriBadge(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("high"))     return { text: "High",     bg: "rgba(239,68,68,0.14)",  border: "rgba(239,68,68,0.45)" };
  if (l.includes("moderate")) return { text: "Moderate", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.45)" };
  if (l.includes("low"))      return { text: "Low",      bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.40)" };
  return { text: "—", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)" };
}

/* ── styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg1 },
  container: { padding: spacing.lg, paddingTop: spacing.lg },

  title:    { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: colors.muted, lineHeight: 18, marginBottom: spacing.sm },

  sourceBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  sourceText: { fontWeight: "800", fontSize: 12 },

  summaryCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 22, padding: spacing.lg, marginBottom: spacing.lg,
  },
  summaryTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel:{ color: colors.faint, fontWeight: "800" },
  summaryMain: { color: colors.text, fontSize: 26, fontWeight: "900", marginTop: 4 },
  summaryHint: { color: colors.text, marginTop: 10, fontWeight: "700", lineHeight: 18 },

  badgePill:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  badgePillText: { color: colors.text, fontWeight: "900" },
  smallMuted:    { color: colors.faint, marginTop: 10, fontWeight: "700" },

  sectionCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 22, padding: spacing.lg, marginBottom: spacing.lg,
  },
  sectionTitle: { color: colors.text, fontWeight: "900", marginBottom: spacing.md },

  row: { flexDirection: "row", gap: spacing.md },

  tile: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 18,
    padding: spacing.md, backgroundColor: "rgba(255,255,255,0.03)",
  },
  tileTitle: { color: colors.muted, fontWeight: "800" },
  tileValue: { color: colors.text, fontSize: 34, fontWeight: "900", marginTop: 6 },
  tileNote:  { color: colors.faint, fontWeight: "800", marginTop: 6 },

  progressTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel:  { color: colors.muted, fontWeight: "800" },
  progressValue:  { color: colors.text, fontWeight: "900" },
  progressTrack:  { height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  progressFill:   { height: "100%", borderRadius: 999, backgroundColor: "rgba(124,58,237,0.85)" },
  progressLegend: { marginTop: 8, color: colors.faint, fontWeight: "700", fontSize: 12 },

  trendRow:  { flexDirection: "row", gap: 12, alignItems: "center" },
  trendIcon: { fontSize: 26 },
  trendTitle:{ color: colors.text, fontWeight: "900", fontSize: 16 },
  trendHint: { color: colors.muted, marginTop: 4, lineHeight: 16, fontWeight: "700" },

  usageGrid: { gap: 12 },
  usageRow:  {
    flexDirection: "row", gap: 12, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center",
  },
  usageIcon:  { fontSize: 18 },
  usageLabel: { color: colors.muted, fontWeight: "800" },
  usageValue: { color: colors.text, fontWeight: "900", marginTop: 4 },

  divider:   { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  miniTitle: { color: colors.text, fontWeight: "900", marginBottom: 10 },

  appRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  appRank: { color: colors.faint, fontWeight: "700", marginRight: 10, width: 20 },
  appName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  appMeta: { color: colors.faint, fontSize: 12, marginTop: 2 },

  chartCard: {
    borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)", marginBottom: 12,
  },
  chartTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  chartTitle: { color: colors.text, fontWeight: "900" },
  chartChange:{ color: colors.faint, fontWeight: "800" },
  barsRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  barWrap:    { alignItems: "center", width: 28 },
  bar:        { width: 14, borderRadius: 8, backgroundColor: "rgba(124,58,237,0.85)" },
  barLabel:   { marginTop: 6, color: colors.faint, fontWeight: "800", fontSize: 10 },
  chartFoot:  { marginTop: 10, color: colors.faint, fontWeight: "700", fontSize: 12 },

  patternRow:   { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  patternTitle: { color: colors.text, fontWeight: "900" },
  patternHint:  { color: colors.muted, marginTop: 4, lineHeight: 16, fontWeight: "700" },

  pill:     { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  pillText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  insightRow:  { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  insightIcon: { fontSize: 16, marginTop: 1 },
  insightText: { flex: 1, color: colors.text, fontWeight: "700", lineHeight: 18 },

  muted: { color: colors.muted, fontWeight: "700" },

  tipCard:  { borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(124,58,237,0.10)" },
  tipTitle: { color: colors.text, fontWeight: "900", marginBottom: 8 },
  tipLine:  { color: colors.text, fontWeight: "700", marginBottom: 6 },

  actions:        { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  btn:            { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  btnPrimary:     { backgroundColor: "rgba(124,58,237,0.85)" },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },
  btnSecondary:   { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border },
  btnSecondaryText:{ color: colors.text, fontWeight: "900" },

  backHome:     { alignItems: "center", marginTop: spacing.sm },
  backHomeText: { color: colors.faint, fontWeight: "800" },
});