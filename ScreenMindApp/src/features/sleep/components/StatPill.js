import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export default function StatPill({ label, value, tint = "rgba(124,58,237,0.22)" }) {
  return (
    <View style={[styles.pill, { backgroundColor: tint }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  value: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 6 },
});
