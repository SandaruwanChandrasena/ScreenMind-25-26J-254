import React from "react";
import { View, StyleSheet } from "react-native";
import { spacing } from "../../../theme/spacing";
import SMMiniCard from "./SMMiniCard";

export default function SMMetricsGrid({ metrics }) {
  // metrics: array of 4 items (label, value, sub, tint)
  const m = metrics || [];

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.row}>
        <SMMiniCard {...m[0]} />
        <SMMiniCard {...m[1]} />
      </View>
      <View style={styles.row}>
        <SMMiniCard {...m[2]} />
        <SMMiniCard {...m[3]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
});
