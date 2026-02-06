import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

export default function SocialInteractionScreen() {
  // ✅ EDIT LATER: replace with call/SMS metadata features
  const c = useMemo(() => ([
    { k: "Calls per day", v: "1.2" },
    { k: "Avg call duration", v: "2m 10s" },
    { k: "Unique contacts", v: "2" },
    { k: "SMS count/day", v: "3" },
    { k: "Interaction silence", v: "18 hrs" },
  ]), []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📞 Social Interaction</Text>
        <Text style={styles.sub}>Communication metadata only (no content is collected).</Text>

        <GlassCard icon="call-outline" title="Communication summary" subtitle="Counts • durations • diversity" style={{ marginTop: spacing.lg }}>
          {c.map((x, i) => (
            <View key={x.k} style={[styles.row, i !== 0 && styles.borderTop]}>
              <Text style={styles.k}>{x.k}</Text>
              <Text style={styles.v}>{x.v}</Text>
            </View>
          ))}
        </GlassCard>

        <Text style={styles.note}>
          Privacy: We do not collect message text, call audio, or contact names. Only anonymized aggregates.
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

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  k: { color: colors.muted, fontWeight: "800", flex: 1 },
  v: { color: colors.text, fontWeight: "900", textAlign: "right" },

  note: { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16 },
});
