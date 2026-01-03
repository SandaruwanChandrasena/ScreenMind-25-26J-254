import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Metric({ label, value, tint = "rgba(124,58,237,0.18)" }) {
  return (
    <View style={[styles.metric, { backgroundColor: tint }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function FactorChip({ text }) {
  return (
    <View style={styles.factorChip}>
      <Text style={styles.factorChipText}>{text}</Text>
    </View>
  );
}

function SnoreBars({ data }) {
  // data values 0-10 (timeline)
  return (
    <View style={styles.snoreBarsWrap}>
      <Text style={styles.cardTitle}>Snore Intensity</Text>
      <Text style={styles.cardHint}>Timeline (UI preview)</Text>

      <View style={{ height: 14 }} />
      <View style={styles.snoreBarsRow}>
        {data.map((v, idx) => (
          <View key={idx} style={styles.snoreBarTrack}>
            <View style={[styles.snoreBarFill, { height: `${(v / 10) * 100}%` }]} />
          </View>
        ))}
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>23</Text>
        <Text style={styles.timeText}>01</Text>
        <Text style={styles.timeText}>03</Text>
        <Text style={styles.timeText}>05</Text>
      </View>
    </View>
  );
}

export default function SnoringScreen() {
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);

  const toggleEnabled = () => setEnabled((p) => !p);

  const startStop = () => {
    if (!enabled) {
      Alert.alert("Enable first", "Turn on snoring detection to start.");
      return;
    }
    setRunning((p) => !p);
    Alert.alert("UI only", "Later: start/stop audio analysis on-device.");
  };

  // Dummy report values
  const report = {
    snoreTime: "45 min",
    intensity: "Medium",
    events: "12",
    breathingIndex: "32",
  };

  const bars = [1,2,1,4,6,3,2,7,5,3,2,1,4,6,8,5,3,2,1,2,4,3,2,1];

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Snoring Report</Text>
        <Text style={styles.sub}>Optional feature • On-device processing • No audio stored.</Text>

        {/* Toggle + session */}
        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Enable Snoring Detection</Text>
              <Text style={styles.cardHint}>
                Helps estimate snoring duration & intensity (not a medical diagnosis).
              </Text>
            </View>

            <Pressable onPress={toggleEnabled} style={[styles.toggle, enabled && styles.toggleOn]}>
              <Text style={styles.toggleText}>{enabled ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.sessionBox}>
            <Text style={styles.sessionTitle}>{running ? "Analysis in progress…" : "Ready for analysis"}</Text>
            <Text style={styles.sessionHint}>
              Start a sleep session before bed. Stop it in the morning.
            </Text>

            <View style={{ height: spacing.md }} />
            <PrimaryButton
              title={running ? "Stop Analysis" : "Start Analysis"}
              onPress={startStop}
              style={{ backgroundColor: running ? colors.danger : colors.primary }}
            />
          </View>
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <Metric label="Time snoring" value={report.snoreTime} tint="rgba(124,58,237,0.18)" />
          <Metric label="Intensity" value={report.intensity} tint="rgba(245,158,11,0.16)" />
        </View>
        <View style={{ height: spacing.sm }} />
        <View style={styles.metricsRow}>
          <Metric label="Events" value={report.events} tint="rgba(34,197,94,0.14)" />
          <Metric label="Breathing index" value={report.breathingIndex} tint="rgba(239,68,68,0.12)" />
        </View>

        <View style={{ height: spacing.md }} />

        {/* Chart */}
        <Card>
          <SnoreBars data={bars} />

          <View style={styles.divider} />

          <Text style={styles.cardTitle}>Possible Factors</Text>
          <Text style={styles.cardHint}>User-entered context (optional)</Text>

          <View style={{ height: 10 }} />
          <View style={styles.factorsWrap}>
            <FactorChip text="Blocked nose" />
            <FactorChip text="Late caffeine" />
            <FactorChip text="Exhaustion" />
            <FactorChip text="Heavy meal" />
            <FactorChip text="Stress" />
          </View>
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },

  toggle: {
    width: 64,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: "rgba(124,58,237,0.22)" },
  toggleText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

  sessionBox: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  sessionHint: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

  metricsRow: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 8 },

  snoreBarsWrap: {},
  snoreBarsRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 120, marginBottom: 10 },
  snoreBarTrack: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  snoreBarFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.65)",
  },

  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { color: colors.faint, fontSize: 12, fontWeight: "800" },

  factorsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  factorChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factorChipText: { color: colors.text, fontWeight: "900", fontSize: 12, opacity: 0.92 },
});
