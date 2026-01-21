import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";

function Row({ date, risk, note }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.note} numberOfLines={2}>{note}</Text>
      </View>
      <Text style={styles.risk}>{risk}</Text>
    </View>
  );
}

export default function SMHistoryScreen() {
  // Placeholder history
  const items = [
    { date: "Today", risk: "MODERATE", note: "Negative exposure + increased latency." },
    { date: "Yesterday", risk: "LOW", note: "Stable interactions, low cognitive markers." },
    { date: "2 days ago", risk: "HIGH", note: "High negative cluster + late-night activity." },
  ];

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>HISTORY</Text>
        <Text style={styles.title}>Risk Timeline</Text>
        <Text style={styles.sub}>Daily summary outputs.</Text>

        <SMSectionTitle title="Recent days" subtitle="Placeholder timeline until DB integration is done." />

        <View style={styles.card}>
          {items.map((it, idx) => (
            <View key={idx} style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border, paddingTop: idx === 0 ? 0 : spacing.md, marginTop: idx === 0 ? 0 : spacing.md }}>
              <Row {...it} />
            </View>
          ))}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  date: { color: colors.text, fontWeight: "900" },
  note: { color: colors.muted, marginTop: 4, lineHeight: 18 },
  risk: { color: colors.primary2, fontWeight: "900" },
});
