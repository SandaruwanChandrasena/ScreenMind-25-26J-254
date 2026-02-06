import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

// ✅ NEW: bridge functions (live stats)
import { ensureUsageAccess, getTodayBehaviourStats } from "../services/behaviourBridge";

// ✅ NEW: load saved daily history (AsyncStorage)
import { getDailyHistory } from "../services/behaviourStorage";

export default function BehaviourInsightsScreen() {
  const [stats, setStats] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: saved history + today's saved record
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(null);

  // ✅ Load saved history (AsyncStorage)
  const loadHistory = async () => {
    try {
      const h = await getDailyHistory();
      setHistory(h || []);
      setToday(h?.[0] || null); // newest-first
    } catch (e) {
      console.log("History load error:", e);
      setHistory([]);
      setToday(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setAccessDenied(false);

    // 1) Load saved history first (works even if usage access denied)
    await loadHistory();

    // 2) Check usage access (needed for live stats)
    const ok = await ensureUsageAccess(); // opens settings if not granted
    if (!ok) {
      setAccessDenied(true);
      setStats(null);
      setLoading(false);
      return;
    }

    // 3) Load live stats from native bridge
    try {
      const s = await getTodayBehaviourStats();
      setStats(s);
    } catch (e) {
      console.log("Behaviour stats error:", e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ Build UI rows:
  // Priority: Live stats -> Saved "today" -> "--"
  const rows = useMemo(() => {
    // ---------- helpers to pick values ----------
    const pickUnlocks = () => {
      if (stats?.unlockCountToday != null) return Number(stats.unlockCountToday);
      if (today?.unlocks != null) return Number(today.unlocks);
      return null;
    };

    const pickNight = () => {
      if (stats?.nightUsageMinutes != null) return Number(stats.nightUsageMinutes);
      if (today?.nightUsageMinutes != null) return Number(today.nightUsageMinutes);
      return null;
    };

    const pickTotal = () => {
      if (stats?.totalScreenTimeMinutesToday != null) return Number(stats.totalScreenTimeMinutesToday);
      if (today?.screenTimeMinutes != null) return Number(today.screenTimeMinutes);
      return null;
    };

    const pickSocialMins = () => {
      if (stats?.socialMinutesToday != null) return Number(stats.socialMinutesToday);
      if (today?.socialMinutes != null) return Number(today.socialMinutes);
      return null;
    };

    const pickSocialPct = (totalMins, socialMins) => {
      if (stats?.socialPercentToday != null) return Number(stats.socialPercentToday);
      if (today?.socialPct != null) return Number(today.socialPct);

      // fallback calculate
      if (totalMins && socialMins != null && totalMins > 0) {
        return Math.round((socialMins / totalMins) * 100);
      }
      return null;
    };

    // ---------- values ----------
    const unlocks = pickUnlocks();
    const nightMins = pickNight();
    const totalMins = pickTotal();
    const socialMins = pickSocialMins();
    const socialPct = pickSocialPct(totalMins, socialMins);

    return [
      { k: "Unlock count/day", v: unlocks == null ? "--" : `${unlocks}` },
      { k: "Night phone usage", v: nightMins == null ? "--" : formatMinutes(nightMins) },
      { k: "Screen time (today)", v: totalMins == null ? "--" : formatMinutes(totalMins) },
      {
        k: "Social app time / total",
        v:
          socialMins == null || socialPct == null
            ? "--"
            : `${formatMinutes(socialMins)} • ${socialPct}%`,
      },
    ];
  }, [stats, today]);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📱 Behaviour Patterns</Text>
        <Text style={styles.sub}>Phone-use indicators linked with isolation and mental fatigue.</Text>

        {/* Status text */}
        {loading ? (
          <Text style={styles.helper}>Loading…</Text>
        ) : accessDenied ? (
          <Text style={styles.warn}>
            Usage Access is OFF. Enable it in settings, then come back and press Refresh.
            {"\n"}
            (Saved history can still show previous values.)
          </Text>
        ) : (
          <Text style={styles.helper}>Live device metrics loaded ✅</Text>
        )}

        {/* Optional: show saved history count */}
        <Text style={styles.smallMeta}>
          Saved records: {history.length} {history.length === 0 ? "(no stored data yet)" : ""}
        </Text>

        <GlassCard
          icon="phone-portrait-outline"
          title="Usage behaviour"
          subtitle="Daily aggregates"
          style={{ marginTop: spacing.lg }}
        >
          {rows.map((x, i) => (
            <View key={x.k} style={[styles.row, i !== 0 && styles.borderTop]}>
              <Text style={styles.k}>{x.k}</Text>
              <Text style={styles.v}>{x.v}</Text>
            </View>
          ))}

          <View style={{ height: spacing.md }} />

          <Pressable onPress={load} style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </GlassCard>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

// ---------- helpers ----------
function formatMinutes(mins) {
  const m = Math.max(0, Math.round(Number(mins || 0)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  helper: { color: colors.muted, marginTop: 10, fontWeight: "800" },
  warn: { color: "#ffb4b4", marginTop: 10, fontWeight: "900", lineHeight: 18 },

  smallMeta: { color: colors.muted, marginTop: 8, fontWeight: "800", fontSize: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  k: { color: colors.muted, fontWeight: "800", flex: 1 },
  v: { color: colors.text, fontWeight: "900", textAlign: "right" },

  refreshBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: { color: colors.text, fontWeight: "900" },
});
