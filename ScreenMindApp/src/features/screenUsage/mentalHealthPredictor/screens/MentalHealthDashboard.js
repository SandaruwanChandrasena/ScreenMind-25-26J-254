import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { colors } from "../../../../theme/colors";
import { spacing } from "../../../../theme/spacing";

export default function MentalHealthDashboard({ route, navigation }) {
  const result = route?.params?.result;

  // Safe defaults (in case screen opened without params)
  const phqScore = result?.phq9?.score ?? 0;
  const phqSev = result?.phq9?.severity ?? "—";
  const gadScore = result?.gad7?.score ?? 0;
  const gadSev = result?.gad7?.severity ?? "—";
  const combinedLabel = result?.combinedRisk?.label ?? "—";
  const submittedAt = result?.submittedAt ?? null;

  const badge = useMemo(() => getRiskBadge(combinedLabel), [combinedLabel]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Screen Usage Risk</Text>
        <Text style={styles.sub}>
          Based on your PHQ-9 & GAD-7 answers, here’s your current mental well-being snapshot.
        </Text>

        {/* Risk summary card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Overall Risk</Text>

            <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          </View>

          <Text style={styles.heroHint}>{badge.hint}</Text>

          {submittedAt ? (
            <Text style={styles.timestamp}>
              Submitted: {formatDateTime(submittedAt)}
            </Text>
          ) : null}
        </View>

        {/* Score cards */}
        <View style={styles.row}>
          <ScoreCard title="PHQ-9" score={phqScore} severity={phqSev} />
          <ScoreCard title="GAD-7" score={gadScore} severity={gadSev} />
        </View>

        {/* Insights */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What this means</Text>

          <InsightLine
            title="Mood (PHQ-9)"
            value={`${phqScore} • ${phqSev}`}
            hint="Higher scores suggest more frequent low mood symptoms."
          />

          <InsightLine
            title="Anxiety (GAD-7)"
            value={`${gadScore} • ${gadSev}`}
            hint="Higher scores suggest more frequent anxiety symptoms."
          />

          <InsightLine
            title="Combined"
            value={combinedLabel}
            hint="A combined label helps summarize overall risk."
          />
        </View>

        {/* Action buttons */}
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
            <Text style={styles.btnPrimaryText}>Retake Assessment</Text>
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

function ScoreCard({ title, score, severity }) {
  const tag = getSeverityTag(severity);

  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreTop}>
        <Text style={styles.scoreTitle}>{title}</Text>
        <View style={[styles.sevPill, { backgroundColor: tag.bg, borderColor: tag.border }]}>
          <Text style={styles.sevText}>{tag.text}</Text>
        </View>
      </View>

      <Text style={styles.scoreValue}>{score}</Text>
      <Text style={styles.scoreHint}>Severity: {severity}</Text>
    </View>
  );
}

function InsightLine({ title, value, hint }) {
  return (
    <View style={styles.insightRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightHint}>{hint}</Text>
      </View>

      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

/* ---------- helpers ---------- */

function getRiskBadge(label) {
  const l = String(label || "").toLowerCase();

  if (l.includes("high")) {
    return {
      text: "High",
      bg: "rgba(239,68,68,0.16)",
      border: "rgba(239,68,68,0.45)",
      hint: "Your responses suggest elevated distress. Consider extra support and healthy screen routines.",
    };
  }

  if (l.includes("moderate")) {
    return {
      text: "Moderate",
      bg: "rgba(245,158,11,0.16)",
      border: "rgba(245,158,11,0.45)",
      hint: "Some signs of distress. Small changes to sleep and screen habits can help.",
    };
  }

  return {
    text: "Low",
    bg: "rgba(34,197,94,0.16)",
    border: "rgba(34,197,94,0.45)",
    hint: "Your responses suggest low distress right now. Keep steady routines and breaks.",
  };
}

function getSeverityTag(severity) {
  const s = String(severity || "").toLowerCase();

  if (s.includes("severe")) {
    return { text: "Severe", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.45)" };
  }
  if (s.includes("moderate")) {
    return { text: "Moderate", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.45)" };
  }
  if (s.includes("mild")) {
    return { text: "Mild", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.45)" };
  }
  return { text: "Minimal", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.40)" };
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1 },
  container: { padding: spacing.lg, paddingTop: spacing.lg },

  h1: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: spacing.xs },
  sub: { color: colors.muted, lineHeight: 18, marginBottom: spacing.lg },

  heroCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: colors.muted, fontWeight: "900", letterSpacing: 0.3 },
  heroHint: { color: colors.text, marginTop: spacing.sm, fontWeight: "700", lineHeight: 18 },
  timestamp: { color: colors.faint, marginTop: spacing.sm, fontWeight: "700" },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { color: colors.text, fontWeight: "900" },

  row: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },

  scoreCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.lg,
  },
  scoreTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreTitle: { color: colors.text, fontWeight: "900" },
  scoreValue: { color: colors.text, fontSize: 36, fontWeight: "900", marginTop: spacing.sm },
  scoreHint: { color: colors.muted, marginTop: spacing.xs, fontWeight: "700" },

  sevPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sevText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: { color: colors.text, fontWeight: "900", marginBottom: spacing.md },

  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  insightTitle: { color: colors.text, fontWeight: "900" },
  insightHint: { color: colors.muted, marginTop: 4, lineHeight: 16 },
  insightValue: { color: colors.text, fontWeight: "900" },

  actions: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  btn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },

  btnPrimary: { backgroundColor: "rgba(124,58,237,0.85)" },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  btnSecondary: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.text, fontWeight: "900" },

  backHome: { alignItems: "center", marginTop: spacing.sm },
  backHomeText: { color: colors.faint, fontWeight: "800" },
});
