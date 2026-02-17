import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export default function InsightRow({ icon = "•", text, good = false }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.icon, good ? styles.good : styles.bad]}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  icon: { fontSize: 16, fontWeight: "900", marginTop: 1 },
  good: { color: colors.primary2 },
  bad: { color: colors.danger },
  text: { flex: 1, color: colors.text, opacity: 0.9, lineHeight: 18, fontSize: 13 },
});
