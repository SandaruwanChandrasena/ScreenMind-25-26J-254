import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";

export default function MiniBarChart({ values = [] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.wrap}>
      {values.map((v, i) => {
        const h = Math.max(6, Math.round((v / max) * 88));
        return <View key={i} style={[styles.bar, { height: h }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 100,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.45)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.55)",
  },
});
