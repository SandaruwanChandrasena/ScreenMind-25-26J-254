import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

/**
 * data: [{ label, value, color }]
 * value >= 0
 */
export default function SMPieSummary({
  title = "Signal Breakdown",
  subtitle = "Tap the icon to view full metrics",
  data = [],
}) {
  const { total, rows, score } = useMemo(() => {
    const safe = (data || []).map((d) => ({
      ...d,
      value: Math.max(0, Number(d.value) || 0),
    }));
    const t = safe.reduce((acc, d) => acc + d.value, 0) || 1;

    const normalized = safe.map((d) => ({
      ...d,
      pct: Math.round((d.value / t) * 100),
      frac: d.value / t,
    }));

    // Simple score (0–100) just for UI
    const s = Math.min(100, Math.max(0, Math.round((t / 100) * 100)));

    return { total: t, rows: normalized, score: s };
  }, [data]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>

        {/* ✅ Donut-like badge */}
        <View style={styles.badgeWrap}>
          <View style={styles.badgeOuter}>
            <View style={styles.badgeInner}>
              <Text style={styles.badgeNum}>{score}</Text>
              <Text style={styles.badgeLabel}>Score</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: spacing.md }} />

      {/* ✅ Breakdown rows */}
      {rows.map((r, idx) => (
        <View key={idx} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: r.color }]} />
          <Text style={styles.rowLabel} numberOfLines={1}>
            {r.label}
          </Text>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${r.pct}%`, backgroundColor: r.color }]} />
          </View>

          <Text style={styles.pct}>{r.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },

  topRow: { flexDirection: "row", alignItems: "center" },

  title: { color: colors.text, fontWeight: "900", fontSize: 14 },
  sub: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 16 },

  badgeWrap: { marginLeft: spacing.md },
  badgeOuter: {
    width: 74,
    height: 74,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(18,26,51,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNum: { color: colors.text, fontWeight: "900", fontSize: 16, lineHeight: 18 },
  badgeLabel: { color: colors.faint, fontWeight: "800", fontSize: 10, marginTop: 2 },

  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 3, marginRight: 10 },
  rowLabel: { color: colors.muted, width: 90, fontSize: 12, fontWeight: "700" },

  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },

  pct: { color: colors.text, fontWeight: "900", fontSize: 12, width: 40, textAlign: "right" },
});
