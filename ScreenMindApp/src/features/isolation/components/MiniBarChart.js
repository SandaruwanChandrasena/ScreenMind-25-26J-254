import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { colors } from "../../../theme/colors";

export default function MiniBarChart({ values = [], labels = [], maxScale = 100, showValues = false, showValuesInBar = false }) {
  // values: array of numbers (0-100). If a value is null/undefined, render a placeholder.
  // showValuesInBar: render the numeric percent centered inside each valid bar.
  const max = Math.max(maxScale, 1);

  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        {values.map((v, i) => {
          const valid = Number.isFinite(v);
          const h = valid ? Math.max(6, Math.round((v / max) * 88)) : 6;
          return (
            <View key={i} style={styles.col}>
              {showValues && valid && <Text style={styles.valueText}>{Math.round(v)}</Text>}
              <View style={[styles.bar, !valid && styles.placeholderBar, { height: h }]}>
                {showValuesInBar && valid && (
                  <Text style={styles.inBarText}>{Math.round(v)}%</Text>
                )}
              </View>
              <Text style={styles.labelText} numberOfLines={1}>{labels[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 4 },
  wrap: {
    height: 120,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 4,
  },
  bar: {
    width: "100%",
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.45)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.55)",
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderBar: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.06)",
  },
  inBarText: { color: "#ffffff", fontWeight: "900", fontSize: 12 },
  labelText: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: "center" },
  valueText: { color: colors.text, fontSize: 11, marginBottom: 4, fontWeight: "900" },
});
