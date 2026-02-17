import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

/**
 * IsolationTrendsScreen (UPDATED UI)
 * This screen now looks like the "Stats" UI (Week/Month/Year + Cards + Charts).
 */
export default function IsolationTrendsScreen() {
  const [range, setRange] = useState("Week"); // Week | Month | Year

  // ✅ DUMMY DATA (EDIT LATER with real backend/sensor outputs)
  const ui = useMemo(() => {
    // Example risk score history: 0-100
    const weekPoints = [42, 45, 48, 58, 62, 59, 60];
    const monthPoints = Array.from({ length: 30 }, (_, i) => 35 + Math.round(25 * Math.abs(Math.sin(i / 6))));
    const yearPixels = buildYearPixels(); // 365 values (0-4)
    const socialWithdraw = [
      { label: "campus", pct: 28 },
      { label: "walking", pct: 22 },
      { label: "friends", pct: 18 },
      { label: "work", pct: 14 },
      { label: "staying home", pct: 18 },
    ];

    return { weekPoints, monthPoints, yearPixels, socialWithdraw };
  }, []);

  const chartData = range === "Week" ? ui.weekPoints : range === "Month" ? ui.monthPoints : ui.monthPoints;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Stats</Text>
          <View style={styles.headerIcon}>
            <Icon name="stats-chart" size={18} color={colors.text} />
          </View>
        </View>

        {/* Segmented control */}
        <Segmented
          value={range}
          options={["Week", "Month", "Year"]}
          onChange={setRange}
        />

        {/* Card 1: Average Isolation Risk */}
        <GlassCard
          icon="analytics-outline"
          title="Average Isolation Risk"
          subtitle={`Your average risk this ${range.toLowerCase()}`}
          style={{ marginTop: spacing.lg }}
        >
          <MiniBarChart values={chartData} />

          <View style={styles.captionRow}>
            <Text style={styles.caption}>Lower is better</Text>
            <Text style={styles.captionStrong}>{average(chartData)}/100</Text>
          </View>
        </GlassCard>

        {/* Card 2: Social / Withdraw */}
        <GlassCard
          icon="swap-horizontal-outline"
          title="Social / Withdraw"
          subtitle="Patterns that influenced your social exposure"
          style={{ marginTop: spacing.md }}
        >
          <JoyDownTabs />
          <View style={{ height: spacing.sm }} />
          <FlatList
            data={ui.socialWithdraw}
            keyExtractor={(item) => item.label}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Icon name="checkmark-circle-outline" size={16} color={colors.muted} />
                  <Text style={styles.rowText}>{item.label}</Text>
                </View>

                <View style={styles.pctPill}>
                  <Text style={styles.pctText}>{item.pct}%</Text>
                </View>
              </View>
            )}
          />
        </GlassCard>

        {/* Card 3: Year in pixels */}
        <GlassCard
          icon="grid-outline"
          title="Year in pixels"
          subtitle="Your isolation risk throughout a year"
          style={{ marginTop: spacing.md }}
        >
          <LegendRow />
          <View style={{ height: spacing.md }} />
          <YearInPixels values={ui.yearPixels} />
        </GlassCard>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

/* ----------------------------- Components ----------------------------- */

function Segmented({ value, options, onChange }) {
  return (
    <View style={styles.segmentWrap}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.segmentBtn,
              active && styles.segmentBtnActive,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GlassCard({ icon, title, subtitle, children, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Icon name={icon} size={18} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
      </View>

      <View style={{ height: spacing.md }} />
      {children}
    </View>
  );
}

function MiniBarChart({ values }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.chartWrap}>
      {values.map((v, i) => {
        const h = Math.max(6, Math.round((v / max) * 88));
        return <View key={i} style={[styles.bar, { height: h }]} />;
      })}
    </View>
  );
}

function JoyDownTabs() {
  // Static UI for panel (you can make it functional later)
  return (
    <View style={styles.jdWrap}>
      <View style={[styles.jdBtn, styles.jdBtnActive]}>
        <Text style={[styles.jdText, styles.jdTextActive]}>Social</Text>
      </View>
      <View style={styles.jdBtn}>
        <Text style={styles.jdText}>Withdraw</Text>
      </View>
    </View>
  );
}

function LegendRow() {
  const items = [
    { label: "Low", level: 0 },
    { label: "Mild", level: 1 },
    { label: "Normal", level: 2 },
    { label: "High", level: 3 },
    { label: "Severe", level: 4 },
  ];
  return (
    <View style={styles.legendRow}>
      {items.map((x) => (
        <View key={x.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: pixelColor(x.level) }]} />
          <Text style={styles.legendText}>{x.label}</Text>
        </View>
      ))}
    </View>
  );
}

function YearInPixels({ values }) {
  // 7 columns per week style grid (like GitHub)
  // We'll show 13 columns x ~28 rows for compact demo UI
  const cols = 13;
  const rows = 28;
  const total = cols * rows;

  const sliced = values.slice(0, total);

  return (
    <View style={styles.pixelGrid}>
      {sliced.map((lvl, idx) => (
        <View key={idx} style={[styles.pixel, { backgroundColor: pixelColor(lvl) }]} />
      ))}
    </View>
  );
}

/* ----------------------------- Helpers ----------------------------- */

function average(arr) {
  if (!arr?.length) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Math.round(sum / arr.length);
}

function buildYearPixels() {
  // 0..4 levels
  return Array.from({ length: 365 }, (_, i) => {
    const wave = Math.sin(i / 18) + Math.sin(i / 7) * 0.4;
    const v = (wave + 1.4) / 2.8; // normalize ~ 0..1
    if (v < 0.2) return 0;
    if (v < 0.4) return 1;
    if (v < 0.6) return 2;
    if (v < 0.8) return 3;
    return 4;
  });
}

function pixelColor(level) {
  // Dark theme friendly colors (no hard-coded bright neon)
  switch (level) {
    case 0:
      return "rgba(34,197,94,0.35)"; // low
    case 1:
      return "rgba(34,197,94,0.18)";
    case 2:
      return "rgba(245,158,11,0.22)";
    case 3:
      return "rgba(239,68,68,0.25)";
    case 4:
      return "rgba(239,68,68,0.38)";
    default:
      return "rgba(148,163,184,0.18)";
  }
}

/* ----------------------------- Styles ----------------------------- */

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },

  segmentWrap: {
    flexDirection: "row",
    marginTop: spacing.lg,
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(124,58,237,0.28)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.50)",
  },
  segmentText: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  segmentTextActive: { color: colors.text },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  cardSub: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 16 },

  chartWrap: {
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
  captionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  caption: { color: colors.faint, fontSize: 12, fontWeight: "800" },
  captionStrong: { color: colors.text, fontSize: 12, fontWeight: "900" },

  jdWrap: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  jdBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  jdBtnActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  jdText: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  jdTextActive: { color: colors.text },

  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { color: colors.text, fontWeight: "900", fontSize: 13 },

  pctPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.32)",
  },
  pctText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: colors.muted, fontWeight: "900", fontSize: 12 },

  pixelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pixel: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
