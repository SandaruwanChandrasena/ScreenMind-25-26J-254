import React from "react";
import { View, StyleSheet } from "react-native";
import { spacing } from "../../../theme/spacing";
import SMMiniCard from "./SMMiniCard";

export default function SMMetricsGrid({ metrics }) {
  const m = metrics || [];

  // Split into rows of 2
  const rows = [];
  for (let i = 0; i < m.length; i += 2) {
    rows.push([m[i], m[i + 1]].filter(Boolean));
  }

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((item, colIdx) => (
            <SMMiniCard key={colIdx} {...item} />
          ))}
          {/* If odd number of items, fill with empty space */}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
});