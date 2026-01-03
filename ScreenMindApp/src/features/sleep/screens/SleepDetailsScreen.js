import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function MiniBarChart({ title, data }) {
  // data: [{label:'Mon', value: 6}, ...] value 0-10
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardHint}>Higher bars = more disruption</Text>

      <View style={{ height: 14 }} />
      <View style={styles.barRow}>
        {data.map((d) => (
          <View key={d.id} style={styles.barItem}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.min(100, (d.value / 10) * 100)}%` }]} />
            </View>
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function FactorRow({ icon, title, value, note, color = "rgba(239,68,68,0.22)" }) {
  return (
    <View style={styles.factorRow}>
      <View style={[styles.factorIcon, { backgroundColor: color }]}>
        <Text style={styles.factorIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.factorTop}>
          <Text style={styles.factorTitle}>{title}</Text>
          <Text style={styles.factorValue}>{value}</Text>
        </View>
        <Text style={styles.factorNote}>{note}</Text>
      </View>
    </View>
  );
}

export default function SleepDetailsScreen() {
  // Dummy analysis values
  const summary = {
    timeInBed: "7h 15m",
    timeAsleep: "6h 30m",
    timeToSleep: "0h 16m",
    sleepQuality: "68%",
  };

  const bars = [
    { id: "0", label: "M", value: 4 },
    { id: "1", label: "T", value: 6 },
    { id: "2", label: "W", value: 5 },
    { id: "3", label: "T", value: 8 },
    { id: "4", label: "F", value: 7 },
    { id: "5", label: "S", value: 3 },
    { id: "6", label: "S", value: 4 },
  ];

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Sleep Details</Text>
        <Text style={styles.sub}>Factors & insights from your phone behavior.</Text>

        {/* Summary */}
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Last Night Summary</Text>

          <View style={{ height: 14 }} />
          <View style={styles.summaryGrid}>
            <SummaryItem label="Time in bed" value={summary.timeInBed} />
            <SummaryItem label="Time asleep" value={summary.timeAsleep} />
            <SummaryItem label="Time to sleep" value={summary.timeToSleep} />
            <SummaryItem label="Quality" value={summary.sleepQuality} />
          </View>
        </Card>

        {/* Mini bar chart */}
        <MiniBarChart title="Weekly Disruption Trend" data={bars} />

        <View style={{ height: spacing.md }} />

        {/* Factors */}
        <Card>
          <Text style={styles.cardTitle}>Contributing Factors</Text>
          <Text style={styles.cardHint}>These patterns can affect sleep quality.</Text>

          <View style={{ height: 16 }} />

          <FactorRow
            icon="📱"
            title="Late-night screen time"
            value="64 min"
            note="Using the phone close to bedtime increases sleep delay."
            color="rgba(124,58,237,0.22)"
          />

          <View style={styles.divider} />

          <FactorRow
            icon="🔓"
            title="Unlocks after 9PM"
            value="11"
            note="Frequent checking may indicate restlessness."
            color="rgba(34,197,94,0.16)"
          />

          <View style={styles.divider} />

          <FactorRow
            icon="🔔"
            title="Notifications"
            value="12"
            note="Night notifications can interrupt sleep and increase awakenings."
            color="rgba(239,68,68,0.14)"
          />

          <View style={styles.divider} />

          <FactorRow
            icon="🌙"
            title="Do Not Disturb"
            value="OFF"
            note="Enabling DND can reduce interruptions during sleep time."
            color="rgba(245,158,11,0.14)"
          />
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function SummaryItem({ label, value }) {
  return (
    <View style={styles.sumItem}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
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

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sumItem: {
    width: "47%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sumLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  sumValue: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 6 },

  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 140 },
  barItem: { flex: 1, alignItems: "center" },
  barTrack: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.50)",
  },
  barLabel: { color: colors.faint, fontWeight: "900", fontSize: 12, marginTop: 8 },

  factorRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  factorIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  factorIconText: { fontSize: 18 },
  factorTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factorTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  factorValue: { color: colors.text, fontWeight: "900", fontSize: 14, opacity: 0.9 },
  factorNote: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },
});
