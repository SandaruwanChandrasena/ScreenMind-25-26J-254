import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function MentalHealthDashboard({ route, navigation }) {
  const result = route?.params?.result;

  // Questionnaire
  const phqScore = result?.phq9?.score ?? 0;
  const phqSev = result?.phq9?.severity ?? "—";
  const gadScore = result?.gad7?.score ?? 0;
  const gadSev = result?.gad7?.severity ?? "—";

  // AI Prediction
  const aiLabel = result?.aiPrediction?.label ?? result?.combinedRisk?.label ?? "—";
  const aiScore = result?.aiPrediction?.score01 ?? result?.combinedRisk?.score ?? null;

  // Usage
  const usageLog = result?.usageLog ?? {};
  const usageRisk01 = result?.usageRisk?.usageRisk01 ?? null;

  const submittedAt = result?.submittedAt ?? null;

  const badge = useMemo(() => getRiskBadge(aiLabel), [aiLabel]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>AI Mental Health Prediction</Text>
        <Text style={styles.sub}>
          Hybrid model combining PHQ-9, GAD-7 and behavioral screen usage patterns.
        </Text>

        {/* 🔥 AI Risk Summary */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>AI Risk Level</Text>

            <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          </View>

          {aiScore !== null && (
            <Text style={styles.heroHint}>
              AI Score: {aiScore}
            </Text>
          )}

          {usageRisk01 !== null && (
            <Text style={styles.timestamp}>
              Usage Risk Contribution: {Number(usageRisk01.toFixed(2))}
            </Text>
          )}

          {submittedAt && (
            <Text style={styles.timestamp}>
              Submitted: {formatDateTime(submittedAt)}
            </Text>
          )}
        </View>

        {/* Questionnaire Scores */}
        <View style={styles.row}>
          <ScoreCard title="PHQ-9" score={phqScore} severity={phqSev} />
          <ScoreCard title="GAD-7" score={gadScore} severity={gadSev} />
        </View>

        {/* 🔥 Usage Analysis Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Screen Usage Analysis</Text>

          <InsightLine
            title="Total Screen Time"
            value={`${usageLog.totalScreenTimeMin ?? 0} min`}
            hint="Daily total device usage duration."
          />

          <InsightLine
            title="Night Usage"
            value={`${usageLog.nightUsageMin ?? 0} min`}
            hint="Screen activity during late night hours."
          />

          <InsightLine
            title="Unlock Frequency"
            value={`${usageLog.unlockCount ?? 0} times`}
            hint="Device check frequency indicator."
          />

          <InsightLine
            title="Avg Session Duration"
            value={`${usageLog.avgSessionMin ?? 0} min`}
            hint="Average length per interaction session."
          />
        </View>

        {/* What it Means */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Interpretation</Text>

          <InsightLine
            title="Mood"
            value={`${phqScore} • ${phqSev}`}
            hint="Higher PHQ-9 indicates depressive symptoms."
          />

          <InsightLine
            title="Anxiety"
            value={`${gadScore} • ${gadSev}`}
            hint="Higher GAD-7 indicates anxiety symptoms."
          />

          <InsightLine
            title="Hybrid Model"
            value={aiLabel}
            hint="Weighted combination of questionnaire and usage behavior."
          />
        </View>

        {/* Buttons */}
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

/* ---------- Reusable Components ---------- */

function ScoreCard({ title, score, severity }) {
  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreTitle}>{title}</Text>
      <Text style={styles.scoreValue}>{score}</Text>
      <Text style={styles.scoreHint}>{severity}</Text>
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

/* ---------- Helpers ---------- */

function getRiskBadge(label) {
  const l = String(label || "").toLowerCase();

  if (l.includes("high")) {
    return {
      text: "High",
      bg: "rgba(239,68,68,0.16)",
      border: "rgba(239,68,68,0.45)",
    };
  }

  if (l.includes("moderate")) {
    return {
      text: "Moderate",
      bg: "rgba(245,158,11,0.16)",
      border: "rgba(245,158,11,0.45)",
    };
  }

  return {
    text: "Low",
    bg: "rgba(34,197,94,0.16)",
    border: "rgba(34,197,94,0.45)",
  };
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1 },
  container: { padding: spacing.lg },

  h1: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: spacing.xs },
  sub: { color: colors.muted, marginBottom: spacing.lg },

  heroCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: colors.muted, fontWeight: "900" },
  heroHint: { color: colors.text, marginTop: spacing.sm },
  timestamp: { color: colors.faint, marginTop: spacing.sm },

  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
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

  scoreTitle: { color: colors.text, fontWeight: "900" },
  scoreValue: { color: colors.text, fontSize: 32, fontWeight: "900" },
  scoreHint: { color: colors.muted },

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
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  insightTitle: { color: colors.text, fontWeight: "900" },
  insightHint: { color: colors.muted },
  insightValue: { color: colors.text, fontWeight: "900" },

  actions: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  btn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: "center" },

  btnPrimary: { backgroundColor: "rgba(124,58,237,0.85)" },
  btnPrimaryText: { color: "#fff", fontWeight: "900" },

  btnSecondary: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border },
  btnSecondaryText: { color: colors.text, fontWeight: "900" },

  backHome: { alignItems: "center", marginTop: spacing.sm },
  backHomeText: { color: colors.faint, fontWeight: "800" },
});