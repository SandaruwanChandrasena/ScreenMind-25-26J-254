import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export default function ScreenBackground({ children }) {
  return (
    <View style={styles.root}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1 },
  bgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: colors.bg1,
  },
  bgBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: colors.bg2,
    opacity: 0.95,
  },
  content: { flex: 1 },
});
