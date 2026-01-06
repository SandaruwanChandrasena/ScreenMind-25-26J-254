import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function MobilityInsightsScreen() {
  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🚶 Mobility Insights</Text>
        <Text style={styles.sub}>
          This screen is working. Replace these dummy values later with real mobility features.
        </Text>

        <View style={styles.card}>
          <Row label="Daily distance" value="1.2 km" />
          <Row label="Time at home" value="82%" />
          <Row label="Location entropy" value="Low" />
          <Row label="Transitions/day" value="2" />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  card: {
    marginTop: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: { color: colors.muted, fontWeight: "800" },
  value: { color: colors.text, fontWeight: "900" },
});
