import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function SMSectionTitle({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sub: { color: colors.muted, marginTop: spacing.xs, lineHeight: 18, fontSize: 13 },
});
