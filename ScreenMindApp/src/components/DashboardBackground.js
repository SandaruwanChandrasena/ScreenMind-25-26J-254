import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function DashboardBackground({ children }) {
  return (
    <View style={styles.root}>
      {/* Glow layers ONLY (background visuals) */}
      <View style={styles.glowPurple} />
      <View style={styles.glowGreen} />
      <View style={styles.glowBlue} />

      {/* Your dashboard UI renders on top */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg1,
  },

  glowPurple: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    opacity: 0.16,
    top: -170,
    left: -170,
  },

  glowGreen: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    opacity: 0.10,
    bottom: -160,
    right: -160,
  },

  glowBlue: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "#0EA5E9",
    opacity: 0.08,
    top: 180,
    right: -180,
  },
});
