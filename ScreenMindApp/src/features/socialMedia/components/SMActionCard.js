import React from "react";
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

export default function SMActionCard({
  title,
  emoji = "➡️",
  onPress,
  glow = "rgba(124,58,237,0.65)",
  loading = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.card,
        { borderColor: glow, shadowColor: glow },
        pressed && !loading && styles.pressed,
        loading && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: glow }]} />

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color={glow} />
      ) : (
        <Text style={styles.emoji}>{emoji}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 16,

    backgroundColor: "rgba(18,26,51,0.92)",
    borderWidth: 1.6,
    overflow: "hidden",

    // ✅ Softer glow (less neon)
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,

    flexDirection: "row",
    alignItems: "center",
  },

  pressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.95,
  },

  accent: {
    width: 3,
    height: 22,
    borderRadius: 999,
    marginRight: spacing.sm,
    opacity: 0.95,
  },

  title: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },

  emoji: {
    fontSize: 18,
    marginLeft: spacing.sm,
  },
});
