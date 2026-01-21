import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function SMPrivacyStatusCard({
  title = "Anonymization Active.",
  message = "No personal message content leaves this device. Only mathematical scores are processed.",
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>PRIVACY STATUS</Text>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="shield-checkmark" size={42} color="rgba(123,77,255,0.95)" />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.msg}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { color: colors.muted, fontWeight: "900", letterSpacing: 1.5, marginBottom: spacing.sm },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(123,77,255,0.22)",
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    alignItems: "center",
  },

  iconWrap: {
    width: 74,
    height: 74,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(123,77,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: spacing.md,
  },

  title: { color: colors.text, fontWeight: "900", fontSize: 14, textAlign: "center" },
  msg: { color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 18, fontSize: 12 },
});
