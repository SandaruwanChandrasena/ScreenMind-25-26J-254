import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function MentalHealthDashboard({ route, navigation }) {
  const result = route?.params?.result;

  // Safe defaults
  const phqScore = result?.phq9?.score ?? 0;
  const phqSev = result?.phq9?.severity ?? "—";
  const gadScore = result?.gad7?.score ?? 0;
  const gadSev = result?.gad7?.severity ?? "—";

  const combinedLabel = result?.combinedRisk?.label ?? "—";
  const combinedScore = result?.combinedRisk?.score ?? null;

  const submittedAt = result?.submittedAt ?? null;

  const usageLog = result?.usageLog ?? null;
  const usageBreakdown = result?.usageBreakdown ?? null;

  const badge = useMemo(() => getRiskBadge(combinedLabel), [combinedLabel]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Mental Health Predictor</Text>
        <Text style={styles.sub}>
          Hybrid result using **questionnaire + screen usage logs** (local storage).
        </Text>

        {/* Risk summary */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Overall Risk</Text>

            <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={styles.badgeText}>{badge.text}</Text>
            </View>
          </View>

          <Text style={styles.heroHint}>{badge.hint}</Text>

          <View style={{ height: 10 }} />

          <Text style={styles.line}>
            Hybrid score: <Text style={styles.strong}>{combinedScore ?? "—"}</Text>
          </Text>

          {submittedAt ? (
            <Text style={styles.timestamp}>Submitted: {formatDateTime(submittedAt)}</Text>
          ) : null}
        </View>

        {/* Questionnaire */}
        <View style={styles.row}>
          <ScoreCard title="PHQ-9" score={phqScore} severity={phqSev} />
          <ScoreCard title="GAD-7" score={gadScore} severity={gadSev} />
        </View>

        {/* Usage log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Screen usage log (simulated)</Text>

          {usageLog ? (
            <>
              <InfoRow label="Total screen time (min)" value={String(usageLog.totalScreenTimeMin ?? "—")} />
              <InfoRow label="Night usage (min)" value={String(usageLog.nightUsageMin ?? "—")} />
              <InfoRow label="Unlock count" value={String(usageLog.unlockCount ?? "—")} />
              <InfoRow label="Avg session (min)" value={String(usageLog.avgSessionMin ?? "—")} />
              <InfoRow label="Social media (min)" value={String(usageLog.socialMediaMin ?? "—")} />
              <InfoRow label="Gaming (min)" value={String(usageLog.gamingMin ?? "—")} />
            </>
          ) : (
            <Text style={styles.muted}>No usage log found in this result.</Text>
          )}
        </View>

        {/* Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Usage risk breakdown (0 → 1)</Text>

          {usageBreakdown ? (
            <>
              <InfoRow label="Screen time score" value={fmt3(usageBreakdown.screenTimeScore)} />
              <InfoRow label="Night score" value={fmt3(usageBreakdown.nightScore)} />
              <InfoRow label="Unlock score" value={fmt3(usageBreakdown.unlockScore)} />
              <InfoRow label="Session score" value={fmt3(usageBreakdown.sessionScore)} />
            </>
          ) : (
            <Text style={styles.muted}>No breakdown found in this result.</Text>
          )}
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
            <Text style={styles.btnPrimaryText}>Retake</Text>
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

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* helpers */

function getRiskBadge(label) {
  const l = String(label || "").toLowerCase();

  if (l.includes("high")) {
    return {
      text: "High",
      bg: "rgba(239,68,68,0.16)",
      border: "rgba(239,68,68,0.45)",
      hint: "High risk based on combined score. Consider reducing late-night usage and adding healthy breaks.",
    };
  }
  if (l.includes("moderate")) {
    return {
      text: "Moderate",
      bg: "rgba(245,158,11,0.16)",
      border: "rgba(245,158,11,0.45)",
      hint: "Moderate risk. Small changes to sleep and screen habits may help.",
    };
  }
  return {
    text: "Low",
    bg: "rgba(34,197,94,0.16)",
    border: "rgba(34,197,94,0.45)",
    hint: "Low risk right now. Maintain steady routines and take breaks.",
  };
}

function getSeverityTag(severity) {
  const s = String(severity || "").toLowerCase();
  if (s.includes("severe")) return { text: "Severe", bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.45)" };
  if (s.includes("moderate")) return { text: "Moderate", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.45)" };
  if (s.includes("mild")) return { text: "Mild", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.45)" };
  return { text: "Minimal", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.40)" };
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function fmt3(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(3);
}

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
  heroLabel: { color: colors.muted, fontWeight: "900" },
  heroHint: { color: colors.text, marginTop: spacing.sm, fontWeight: "700", lineHeight: 18 },
  timestamp: { color: colors.faint, marginTop: spacing.sm, fontWeight: "700" },

  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  badgeText: { color: colors.text, fontWeight: "900" },

  line: { color: colors.muted, fontWeight: "700" },
  strong: { color: colors.text, fontWeight: "900" },

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

  sevPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
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
  muted: { color: colors.muted, fontWeight: "700" },

  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  infoLabel: { color: colors.muted, fontWeight: "700" },
  infoValue: { color: colors.text, fontWeight: "900" },

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