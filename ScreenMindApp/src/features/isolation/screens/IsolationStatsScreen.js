import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import GlassCard from "../components/GlassCard";
import SegmentedControl from "../components/SegmentedControl";
import MiniBarChart from "../components/MiniBarChart";
import YearInPixels from "../components/YearInPixels";

// ✅ Load history from AsyncStorage
import { getDailyIsolationHistory } from "../services/isolationStorage";

export default function IsolationStatsScreen({ navigation }) {
  const [range, setRange] = useState("Week"); // Week | Month | Year

  // ✅ History state
  const [history, setHistory] = useState([]);

  // ✅ NEW: Social/Withdraw toggle state
  const [mode, setMode] = useState("Social"); // Social | Withdraw

  // ✅ Load from storage
  useEffect(() => {
    (async () => {
      const h = await getDailyIsolationHistory();
      setHistory(h);
    })();
  }, []);

  // ---------- Build real chart arrays + Social/Withdraw lists ----------
  const ui = useMemo(() => {
    // history is saved as newest-first
    const sortedOldestFirst = [...history].reverse();
    const scores = sortedOldestFirst.map((r) => Number(r.riskScore || 0));

    const weekRisk = scores.slice(-7);
    const monthRisk = scores.slice(-30);
    const yearScores = scores.slice(-365);
    const yearPixels = yearScores.map((s) => scoreToPixelLevel(s));

    // Fallback demo data (UI safe)
    const fallbackWeek = [42, 45, 48, 58, 62, 59, 60];
    const fallbackMonth = Array.from({ length: 30 }, (_, i) => 35 + Math.round(25 * Math.abs(Math.sin(i / 6))));
    const fallbackYear = Array.from({ length: 365 }, (_, i) => {
      const wave = Math.sin(i / 18) + Math.sin(i / 7) * 0.4;
      const v = (wave + 1.4) / 2.8;
      if (v < 0.2) return 0;
      if (v < 0.4) return 1;
      if (v < 0.6) return 2;
      if (v < 0.8) return 3;
      return 4;
    });

    // ✅ EDIT LATER: replace with REAL computed contributions
    // These are "what increased exposure" vs "what reduced exposure"
    const socialItems = [
      { label: "campus", pct: 28 },
      { label: "walking", pct: 22 },
      { label: "friends", pct: 18 },
      { label: "work", pct: 14 },
      { label: "staying home", pct: 18 },
    ];

    const withdrawItems = [
      { label: "low mobility days", pct: 30 },
      { label: "high time at home", pct: 24 },
      { label: "few calls/SMS", pct: 18 },
      { label: "low Bluetooth exposure", pct: 16 },
      { label: "late-night usage", pct: 12 },
    ];

    return {
      weekRisk: weekRisk.length ? weekRisk : fallbackWeek,
      monthRisk: monthRisk.length ? monthRisk : fallbackMonth,
      yearPixels: yearPixels.length ? yearPixels : fallbackYear,
      socialItems,
      withdrawItems,
    };
  }, [history]);

  const chartData = range === "Week" ? ui.weekRisk : ui.monthRisk;

  // ✅ NEW: list switches based on selected tab
  const listData = mode === "Social" ? ui.socialItems : ui.withdrawItems;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <Text style={styles.title}>Stats</Text>

          <View style={styles.headerIcon}>
            <Icon name="stats-chart" size={18} color={colors.text} />
          </View>
        </View>

        <SegmentedControl value={range} options={["Week", "Month", "Year"]} onChange={setRange} />

        {/* Card 1 */}
        <GlassCard
          icon="analytics-outline"
          title="Average Isolation Risk"
          subtitle={`Your average risk this ${range.toLowerCase()}`}
          style={{ marginTop: spacing.lg }}
        >
          <MiniBarChart values={chartData} />

          <View style={styles.captionRow}>
            <Text style={styles.caption}>Lower is better</Text>
            <Text style={styles.captionStrong}>{avg(chartData)}/100</Text>
          </View>

          <View style={{ height: spacing.md }} />

          <Pressable
            onPress={() => navigation.navigate("IsolationWhy")}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.linkText}>Why this risk?</Text>
            <Icon name="chevron-forward" size={16} color={colors.text} />
          </Pressable>

          <View style={{ height: spacing.sm }} />
          <Text style={styles.smallMeta}>
            Records loaded: {history.length} {history.length === 0 ? "(showing demo data)" : ""}
          </Text>
        </GlassCard>

        {/* Card 2 */}
        <GlassCard
          icon="swap-horizontal-outline"
          title="Social / Withdraw"
          subtitle="Activities that influenced your exposure"
          style={{ marginTop: spacing.md }}
        >
          {/* ✅ FIXED: Tabs now work */}
          <View style={styles.jdWrap}>
            <Pressable
              onPress={() => setMode("Social")}
              style={({ pressed }) => [
                styles.jdBtn,
                mode === "Social" && styles.jdBtnActive,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={[styles.jdText, mode === "Social" && styles.jdTextActive]}>Social</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("Withdraw")}
              style={({ pressed }) => [
                styles.jdBtn,
                mode === "Withdraw" && styles.jdBtnActive,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={[styles.jdText, mode === "Withdraw" && styles.jdTextActive]}>Withdraw</Text>
            </Pressable>
          </View>

          <View style={{ height: spacing.sm }} />

          <FlatList
            data={listData}
            keyExtractor={(item) => item.label}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={[styles.rowItem, index !== 0 && styles.borderTop]}>
                <View style={styles.rowLeft}>
                  <Icon
                    name={mode === "Social" ? "checkmark-circle-outline" : "remove-circle-outline"}
                    size={16}
                    color={colors.muted}
                  />
                  <Text style={styles.rowText}>{item.label}</Text>
                </View>

                <View style={styles.pctPill}>
                  <Text style={styles.pctText}>{item.pct}%</Text>
                </View>
              </View>
            )}
          />

          <View style={{ height: spacing.md }} />

          <View style={styles.quickNavRow}>
            <SmallNav onPress={() => navigation.navigate("MobilityInsights")} title="Mobility" icon="walk-outline" />
            <SmallNav onPress={() => navigation.navigate("SocialInteraction")} title="Calls/SMS" icon="call-outline" />
            <SmallNav onPress={() => navigation.navigate("BehaviourInsights")} title="Behaviour" icon="phone-portrait-outline" />
            <SmallNav onPress={() => navigation.navigate("ProximityExposure")} title="Proximity" icon="wifi-outline" />
          </View>
        </GlassCard>

        {/* Card 3 */}
        <GlassCard
          icon="grid-outline"
          title="Year in pixels"
          subtitle="Isolation risk throughout a year"
          style={{ marginTop: spacing.md }}
        >
          <View style={styles.legendRow}>
            {["Low", "Mild", "Normal", "High", "Severe"].map((label, idx) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: pixelColor(idx) }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: spacing.md }} />
          <YearInPixels values={ui.yearPixels} />

          <View style={{ height: spacing.md }} />

          <Pressable
            onPress={() => navigation.navigate("IsolationSuggestions")}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.linkText}>See Suggestions</Text>
            <Icon name="chevron-forward" size={16} color={colors.text} />
          </Pressable>

          <View style={{ height: spacing.sm }} />

          <Pressable
            onPress={() => navigation.navigate("IsolationPrivacy")}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.linkText}>Privacy & Data Controls</Text>
            <Icon name="chevron-forward" size={16} color={colors.text} />
          </Pressable>
        </GlassCard>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

// ---------- Helpers ----------
function avg(arr) {
  if (!arr?.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function scoreToPixelLevel(score) {
  const s = Number(score || 0);
  if (s < 20) return 0;
  if (s < 40) return 1;
  if (s < 60) return 2;
  if (s < 80) return 3;
  return 4;
}

function pixelColor(level) {
  switch (level) {
    case 0:
      return "rgba(34,197,94,0.35)";
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

function SmallNav({ title, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallNav, pressed && { opacity: 0.9 }]}>
      <Icon name={icon} size={18} color={colors.text} />
      <Text style={styles.smallNavText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
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

  captionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  caption: { color: colors.faint, fontSize: 12, fontWeight: "800" },
  captionStrong: { color: colors.text, fontSize: 12, fontWeight: "900" },

  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { color: colors.text, fontWeight: "900" },

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

  rowItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
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

  quickNavRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  smallNav: {
    width: "48%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smallNavText: { color: colors.text, fontWeight: "900" },

  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: colors.muted, fontWeight: "900", fontSize: 12 },

  smallMeta: { color: colors.muted, fontWeight: "800", fontSize: 12, marginTop: 10 },
});
