import React from "react";
import { View, StyleSheet } from "react-native";

function pixelColor(level) {
  switch (level) {
    case 0: return "rgba(34,197,94,0.35)";
    case 1: return "rgba(34,197,94,0.18)";
    case 2: return "rgba(245,158,11,0.22)";
    case 3: return "rgba(239,68,68,0.25)";
    case 4: return "rgba(239,68,68,0.38)";
    default: return "rgba(148,163,184,0.18)";
  }
}

export default function YearInPixels({ values = [] }) {
  const cols = 13;
  const rows = 28;
  const total = cols * rows;
  const sliced = values.slice(0, total);

  return (
    <View style={styles.grid}>
      {sliced.map((lvl, idx) => (
        <View key={idx} style={[styles.pixel, { backgroundColor: pixelColor(lvl) }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pixel: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
