import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

export default function IsolationWhyScreen() {
  // ✅ EDIT LATER: replace with feature importance / SHAP output
  const reasons = useMemo(() => ([
    { t: "Low mobility", d: "Daily distance decreased compared to your baseline." },
    { t: "High time at home", d: "Most days were spent at one frequent location." },
    { t: "Reduced social diversity", d: "Unique contacts count dropped this week." },
    { t: "Low proximity exposure", d: "Fewer nearby Bluetooth devices detected." },
    { t: "Night phone usage", d: "Late-night sessions increased, affecting routine." },
    { t: "Low Wi-Fi diversity", d: "Few networks indicates low environment variety." },
  ]), []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Why this risk?</Text>
        <Text style={styles.sub}>Explainable factors that contributed to the risk score.</Text>

        <GlassCard icon="sparkles-outline" title="Top contributing factors" subtitle="Ranked explanations" style={{ marginTop: spacing.lg }}>
          {reasons.map((r, i) => (
            <View key={r.t} style={[styles.item, i !== 0 && styles.borderTop]}>
              <Text style={styles.itemTitle}>• {r.t}</Text>
              <Text style={styles.itemDetail}>{r.d}</Text>
            </View>
          ))}
        </GlassCard>

        <Text style={styles.note}>
          Privacy note: We analyze only aggregated signals. No message or call content is used.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  item: { paddingVertical: 10 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10 },
  itemTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  itemDetail: { color: colors.faint, marginTop: 6, lineHeight: 18 },

  note: { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16 },
});
