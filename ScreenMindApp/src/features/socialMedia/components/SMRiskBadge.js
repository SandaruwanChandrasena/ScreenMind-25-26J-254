import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { RISK_LEVELS } from "../utils/sm.constants";

function getBadgeStyle(level) {
  switch (level) {
    case RISK_LEVELS.HIGH:
      return { bg: "rgba(239,68,68,0.18)", text: "#FCA5A5", label: "High Risk" };
    case RISK_LEVELS.MODERATE:
      return { bg: "rgba(124,58,237,0.18)", text: "#C4B5FD", label: "Moderate Risk" };
    default:
      return { bg: "rgba(34,197,94,0.16)", text: "#86EFAC", label: "Low Risk" };
  }
}

export default function SMRiskBadge({ level = RISK_LEVELS.MODERATE, hint = "" }) {
  const s = getBadgeStyle(level);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
      </View>

      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {!hint && <Text style={styles.hint}>Your social interaction signals summary.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  badgeText: { fontWeight: "900", fontSize: 12 },
  hint: { color: colors.muted, marginTop: spacing.sm, lineHeight: 18 },
});
