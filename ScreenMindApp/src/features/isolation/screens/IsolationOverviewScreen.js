import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function IsolationOverviewScreen({ navigation }) {
  // ✅ DUMMY DATA (EDIT LATER)
  const data = useMemo(
    () => ({
      riskLevel: "Moderate", // Low | Moderate | High  ✅ EDIT LATER
      riskScore: 62, // 0-100 ✅ EDIT LATER
      summary:
        "Reduced movement + fewer unique contacts detected over the last 7 days.", // ✅ EDIT LATER
      lastUpdated: "Today, 10:25 AM", // ✅ EDIT LATER
      highlights: [
        { label: "Time at home", value: "82%" },
        { label: "Unique contacts", value: "2" },
        { label: "Night usage", value: "1h 45m" },
        { label: "WiFi diversity", value: "Low" },
      ],
    }),
    []
  );

  const riskTone = getRiskTone(data.riskLevel);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📍 Isolation & Loneliness</Text>
        <Text style={styles.sub}>Your social well-being snapshot (privacy-safe).</Text>

        {/* Risk Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Current Risk</Text>
            <View style={[styles.pill, { backgroundColor: riskTone.bg }]}>
              <Text style={[styles.pillText, { color: riskTone.text }]}>{data.riskLevel}</Text>
            </View>
          </View>

          <Text style={styles.score}>{data.riskScore}/100</Text>
          <Text style={styles.hint}>{data.summary}</Text>

          <Text style={styles.updated}>Last updated: {data.lastUpdated}</Text>

          <View style={{ height: spacing.md }} />

          <PrimaryButton
            title="View Why This Risk"
            onPress={() => navigation.navigate("IsolationTrends")}
          />

          <View style={{ height: spacing.sm }} />

          <PrimaryButton
            title="View Insights"
            onPress={() => navigation.navigate("IsolationInsights")}
            style={{ backgroundColor: colors.primary2 }}
          />
        </View>

        {/* Quick highlights */}
        <Text style={styles.sectionTitle}>Quick Highlights</Text>
        <View style={styles.grid}>
          {data.highlights.map((x) => (
            <View key={x.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{x.label}</Text>
              <Text style={styles.statValue}>{x.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate("IsolationTrends")}
          >
            <Text style={styles.linkText}>📈 Stats</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate("IsolationSuggestions")}
          >
            <Text style={styles.linkText}>🧠 Suggestions</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function getRiskTone(level) {
  const l = (level || "").toLowerCase();
  if (l.includes("high")) return { bg: "rgba(239,68,68,0.22)", text: "#FCA5A5" };
  if (l.includes("moderate")) return { bg: "rgba(245,158,11,0.20)", text: "#FCD34D" };
  return { bg: "rgba(34,197,94,0.18)", text: "#86EFAC" };
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, lineHeight: 18 },

  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: colors.muted, fontWeight: "800", fontSize: 13 },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { fontWeight: "900", fontSize: 12 },

  score: { color: colors.text, fontSize: 34, fontWeight: "900", marginTop: 10 },
  hint: { color: colors.faint, marginTop: 8, lineHeight: 18 },
  updated: { color: colors.faint, marginTop: 12, fontSize: 12 },

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

  actionsRow: { flexDirection: "row", gap: spacing.md },
  linkBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { color: colors.text, fontWeight: "900" },
});
