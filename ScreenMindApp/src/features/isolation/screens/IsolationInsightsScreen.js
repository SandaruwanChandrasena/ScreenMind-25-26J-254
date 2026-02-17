import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

const TABS = ["Mobility", "Communication", "Behaviour", "Proximity"];

export default function IsolationInsightsScreen() {
  const [tab, setTab] = useState("Mobility");

  // ✅ DUMMY METRICS (EDIT LATER)
  const metrics = useMemo(
    () => ({
      Mobility: [
        { label: "Daily distance", value: "1.2 km ↓" },
        { label: "Radius of gyration", value: "0.8 km" },
        { label: "Time at home", value: "82%" },
        { label: "Location entropy", value: "Low" },
        { label: "Location transitions", value: "2/day" },
        { label: "Days not leaving home", value: "2 days" },
        { label: "Weekend vs weekday", value: "No change" },
      ],
      Communication: [
        { label: "Calls per day", value: "1.2" },
        { label: "Avg call duration", value: "2m 10s" },
        { label: "Unique contacts", value: "2" },
        { label: "SMS per day", value: "3" },
        { label: "Interaction silence", value: "18 hrs" },
      ],
      Behaviour: [
        { label: "Unlock count/day", value: "96 ↑" },
        { label: "Night usage", value: "1h 45m" },
        { label: "Screen time trend", value: "Increasing" },
        { label: "Social app vs total", value: "38% (optional)" },
        { label: "Daily rhythm", value: "Irregular" },
      ],
      Proximity: [
        { label: "Bluetooth proximity", value: "Low (avg 1-2 devices)" },
        { label: "WiFi diversity", value: "Low (1-2 networks/day)" },
      ],
    }),
    []
  );

  const list = metrics[tab] || [];

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.sub}>Explore metrics used to compute your isolation risk score.</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={({ pressed }) => [
                  styles.tab,
                  active && styles.tabActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Metrics list */}
        <View style={styles.card}>
          {list.map((m, idx) => (
            <View key={m.label} style={[styles.metricRow, idx !== 0 && styles.borderTop]}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          Tip: In the next phase, these values will be auto-filled from sensors + backend predictions.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: "rgba(124,58,237,0.25)", borderColor: "rgba(124,58,237,0.45)" },
  tabText: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  tabTextActive: { color: colors.text },

  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },
  metricRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, gap: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  metricLabel: { color: colors.muted, fontWeight: "800", flex: 1 },
  metricValue: { color: colors.text, fontWeight: "900", textAlign: "right" },

  note: { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16 },
});
