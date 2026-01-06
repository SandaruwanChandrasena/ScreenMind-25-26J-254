import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function GlassCard({ icon, title, subtitle, children, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          {!!icon && <Icon name={icon} size={18} color={colors.text} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
        </View>
      </View>
      <View style={{ height: spacing.md }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontWeight: "900", fontSize: 16 },
  sub: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 16 },
});
