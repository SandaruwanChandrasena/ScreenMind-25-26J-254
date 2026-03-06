import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";
import { getCommunicationStatsWithPermission } from "../services/communicationBridge";

export default function SocialInteractionScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getCommunicationStatsWithPermission();
      setStats(data);
    } catch (e) {
      console.log("Communication stats error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Format helpers
  const formatCallDuration = (seconds) => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatSilence = (hours) => {
    if (!hours) return "--";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours)} hrs`;
  };

  const c = useMemo(() => {
    if (!stats) {
      return [
        { k: "Calls per day", v: "--" },
        { k: "Avg call duration", v: "--" },
        { k: "Unique contacts", v: "--" },
        { k: "SMS count/day", v: "--" },
        { k: "Interaction silence", v: "--" },
      ];
    }

    return [
      { k: "Calls per day", v: stats.callsPerDay?.toFixed(1) || "0" },
      { k: "Avg call duration", v: formatCallDuration(stats.avgCallDurationSeconds) },
      { k: "Unique contacts", v: `${stats.uniqueContacts || 0}` },
      { k: "SMS count/day", v: stats.smsCountPerDay?.toFixed(0) || "0" },
      { k: "Interaction silence", v: formatSilence(stats.interactionSilenceHours) },
    ];
  }, [stats]);

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📞 Social Interaction</Text>
        <Text style={styles.sub}>Communication metadata only (no content is collected).</Text>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={styles.helper}>Loading communication data...</Text>
          </View>
        )}

        {error && !loading && (
          <Text style={styles.warn}>
            Unable to load communication stats. Please grant Call Log and SMS permissions.
          </Text>
        )}

        <GlassCard icon="call-outline" title="Communication summary" subtitle="Counts • durations • diversity" style={{ marginTop: spacing.lg }}>
          {c.map((x, i) => (
            <View key={x.k} style={[styles.row, i !== 0 && styles.borderTop]}>
              <Text style={styles.k}>{x.k}</Text>
              <Text style={styles.v}>{x.v}</Text>
            </View>
          ))}

          <View style={{ height: spacing.md }} />
          
          <Pressable 
            onPress={loadStats} 
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </GlassCard>

        <Text style={styles.note}>
          Privacy: We do not collect message text, call audio, or contact names. Only anonymized aggregates.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  loadingContainer: { marginTop: spacing.xl, alignItems: "center" },
  helper: { color: colors.muted, marginTop: 10, fontWeight: "800" },
  warn: { color: "#ffb4b4", marginTop: 10, fontWeight: "900", lineHeight: 18 },

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

  note: { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16 },
});
