/**
 * IsolationStatsScreen.js
 *
 * Shows:
 *  • Average isolation risk chart (Week / Month / Year)
 *  • Social / Withdraw breakdown  ← NOW REAL DATA from scoring engine
 *  • Year in pixels
 *
 * Key change from original: socialItems and withdrawItems come from
 * computeIsolationRisk() → saved in each daily record by IsolationOverviewScreen.
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import GlassCard from "../components/GlassCard";
import SegmentedControl from "../components/SegmentedControl";
import MiniBarChart from "../components/MiniBarChart";

import { getDailyIsolationHistory } from "../services/isolationStorage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr?.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function clampPct(value) {
  const num = Number(value || 0);
  return Math.max(0, Math.min(100, Math.round(num)));
}

function toPillarRiskPct(scoreOutOf25) {
  return clampPct((Number(scoreOutOf25 || 0) / 25) * 100);
}

function buildRealSocialWithdrawFromBreakdown(breakdown) {
  const pillarScores = {
    mobility: Number(breakdown?.mobility ?? 0),
    communication: Number(breakdown?.communication ?? breakdown?.comm ?? 0),
    behaviour: Number(breakdown?.behaviour ?? breakdown?.beh ?? 0),
    proximity: Number(breakdown?.proximity ?? breakdown?.prox ?? 0),
  };

  const riskItems = [
    { label: "Mobility Risk (Low Movement)", pct: toPillarRiskPct(pillarScores.mobility) },
    { label: "Communication Risk (Low Interaction)", pct: toPillarRiskPct(pillarScores.communication) },
    { label: "Behaviour Risk (Night Usage)", pct: toPillarRiskPct(pillarScores.behaviour) },
    { label: "Proximity Risk (Low Exposure)", pct: toPillarRiskPct(pillarScores.proximity) },
  ];

  const socialItems = [
    { label: "Healthy Mobility", pct: 100 - riskItems[0].pct },
    { label: "Social Communication", pct: 100 - riskItems[1].pct },
    { label: "Healthy Behaviour", pct: 100 - riskItems[2].pct },
    { label: "Healthy Proximity", pct: 100 - riskItems[3].pct },
  ]
    .sort((a, b) => b.pct - a.pct);

  const withdrawItems = riskItems
    .filter((item) => item.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  return { socialItems, withdrawItems };
}

// Fallback demo data (when no real history exists yet)
const DEMO_WEEK  = [42, 45, 48, 58, 62, 59, 60];
const DEMO_MONTH = Array.from({ length: 30 }, (_, i) => 35 + Math.round(25 * Math.abs(Math.sin(i / 6))));

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IsolationStatsScreen({ navigation }) {
  const [range,   setRange]   = useState("Week");
  const [mode,    setMode]    = useState("Social");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      const h = await getDailyIsolationHistory();
      setHistory(h);
    })();
  }, []);

  const ui = useMemo(() => {
    // History is saved newest-first; reverse for charts (oldest → newest left→right)
    const sorted = [...history].reverse();
    const scores = sorted.map((r) => Number(r.riskScore || 0));

    const weekRisk  = scores.slice(-7);
    const monthRisk = scores.slice(-30);

    // ── Social / Withdraw from most recent real breakdown ───────────────────
    const latest = history[0]; // newest-first
    const { socialItems, withdrawItems } = latest?.breakdown
      ? buildRealSocialWithdrawFromBreakdown(latest.breakdown)
      : { socialItems: [], withdrawItems: [] };

    return {
      weekRisk:    weekRisk.length  ? weekRisk  : DEMO_WEEK,
      monthRisk:   monthRisk.length ? monthRisk : DEMO_MONTH,
      socialItems,
      withdrawItems,
      isDemo: history.length === 0,
    };
  }, [history]);

  const chartData = range === "Week" ? ui.weekRisk : ui.monthRisk;
  const listData  = mode === "Social" ? ui.socialItems : ui.withdrawItems;

  return (
    <DashboardBackground>
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

        <SegmentedControl
          value={range}
          options={["Week", "Month", "Year"]}
          onChange={setRange}
        />

        {/* Demo data notice */}
        {ui.isDemo && (
          <Text style={styles.demoNotice}>
            📊 Showing demo data — start tracking to see your real stats.
          </Text>
        )}

        {/* Card 1 — Risk chart */}
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

          {!ui.isDemo && (
            <Text style={styles.smallMeta}>
              Records loaded: {history.length}
            </Text>
          )}
        </GlassCard>

        {/* Card 2 — Social / Withdraw */}
        <GlassCard
          icon="swap-horizontal-outline"
          title="Social / Withdraw"
          subtitle="Activities that influenced your exposure"
          style={{ marginTop: spacing.md }}
        >
          {/* Tabs */}
          <View style={styles.jdWrap}>
            <Pressable
              onPress={() => setMode("Social")}
              style={({ pressed }) => [
                styles.jdBtn,
                mode === "Social" && styles.jdBtnActive,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={[styles.jdText, mode === "Social" && styles.jdTextActive]}>
                Social ✅
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("Withdraw")}
              style={({ pressed }) => [
                styles.jdBtn,
                mode === "Withdraw" && styles.jdBtnActive,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={[styles.jdText, mode === "Withdraw" && styles.jdTextActive]}>
                Withdraw ⚠️
              </Text>
            </Pressable>
          </View>

          <View style={{ height: spacing.sm }} />

          {listData.length === 0 ? (
            <Text style={styles.emptyText}>
              No {mode.toLowerCase()} patterns detected yet.
            </Text>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(item, idx) => item.label + idx}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View style={[styles.rowItem, index !== 0 && styles.borderTop]}>
                  <View style={styles.rowLeft}>
                    <Icon
                      name={
                        mode === "Social"
                          ? "checkmark-circle-outline"
                          : "remove-circle-outline"
                      }
                      size={16}
                      color={mode === "Social" ? "#4ade80" : "#f87171"}
                    />
                    <Text style={styles.rowText}>{item.label}</Text>
                  </View>

                  <View style={[
                    styles.pctPill,
                    mode === "Social"
                      ? styles.pctPillGreen
                      : styles.pctPillRed,
                  ]}>
                    <Text style={styles.pctText}>{item.pct}%</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={{ height: spacing.md }} />

          {/* Quick nav to sub-screens */}
          <View style={styles.quickNavRow}>
            <SmallNav onPress={() => navigation.navigate("MobilityInsights")}   title="Mobility"   icon="walk-outline" />
            <SmallNav onPress={() => navigation.navigate("SocialInteraction")}   title="Calls/SMS"  icon="call-outline" />
            <SmallNav onPress={() => navigation.navigate("BehaviourInsights")}   title="Behaviour"  icon="phone-portrait-outline" />
            <SmallNav onPress={() => navigation.navigate("ProximityExposure")}   title="Proximity"  icon="wifi-outline" />
          </View>
        </GlassCard>

        <View style={{ marginTop: spacing.md }}>
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
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SmallNav({ title, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.smallNav, pressed && { opacity: 0.9 }]}
    >
      <Icon name={icon} size={18} color={colors.text} />
      <Text style={styles.smallNavText}>{title}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
  },
  title:      { color: colors.text, fontSize: 22, fontWeight: "900" },
  headerIcon: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
  },

  demoNotice: {
    color: colors.muted, marginTop: spacing.md,
    fontSize: 12, fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10, borderRadius: 10,
  },

  captionRow:     { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  caption:        { color: colors.faint, fontSize: 12, fontWeight: "800" },
  captionStrong:  { color: colors.text, fontSize: 12, fontWeight: "900" },

  linkBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
  },
  linkText:    { color: colors.text, fontWeight: "900" },
  smallMeta:   { color: colors.muted, fontWeight: "800", fontSize: 12, marginTop: 10 },
  emptyText:   { color: colors.faint, fontSize: 13, marginVertical: 10 },

  jdWrap: {
    flexDirection: "row", padding: 6, borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1, borderColor: colors.border,
  },
  jdBtn:        { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  jdBtnActive:  {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  jdText:       { color: colors.muted, fontWeight: "900", fontSize: 12 },
  jdTextActive: { color: colors.text },

  rowItem:  { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  borderTop:{ borderTopWidth: 1, borderTopColor: colors.border },
  rowLeft:  { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText:  { color: colors.text, fontWeight: "900", fontSize: 13 },

  pctPill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  pctPillGreen: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.32)",
  },
  pctPillRed: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.32)",
  },
  pctText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  quickNavRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  smallNav: {
    width: "48%", paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  smallNavText: { color: colors.text, fontWeight: "900" },
});