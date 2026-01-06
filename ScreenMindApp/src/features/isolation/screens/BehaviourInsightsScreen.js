import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

export default function BehaviourInsightsScreen() {
  // ✅ EDIT LATER: replace with usage stats features
  const b = useMemo(() => ([
    { k: "Unlock count/day", v: "96 ↑" },
    { k: "Night phone usage", v: "1h 45m" },
    { k: "Screen time trend", v: "Increasing" },
    { k: "Social app time / total", v: "38% (optional)" },
    { k: "Daily rhythm", v: "Irregular" },
  ]), []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📱 Behaviour Patterns</Text>
        <Text style={styles.sub}>Phone-use indicators linked with isolation and mental fatigue.</Text>

        <GlassCard icon="phone-portrait-outline" title="Usage behaviour" subtitle="Daily aggregates" style={{ marginTop: spacing.lg }}>
          {b.map((x, i) => (
            <View key={x.k} style={[styles.row, i !== 0 && styles.borderTop]}>
              <Text style={styles.k}>{x.k}</Text>
              <Text style={styles.v}>{x.v}</Text>
            </View>
          ))}
        </GlassCard>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  k: { color: colors.muted, fontWeight: "800", flex: 1 },
  v: { color: colors.text, fontWeight: "900", textAlign: "right" },
});
