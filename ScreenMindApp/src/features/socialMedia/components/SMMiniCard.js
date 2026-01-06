import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function SMMiniCard({ label, value, sub, tint }) {
  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: tint || "rgba(124,58,237,0.25)" }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {!!sub && (
        <Text style={styles.sub} numberOfLines={2}>
          {sub}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  value: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 6 },
  sub: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },
});
