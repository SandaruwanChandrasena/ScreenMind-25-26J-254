import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";
import SMMiniCard from "../components/SMMiniCard";
import { formatMinutes } from "../utils/sm.formatters";

export default function SMGhostingScreen() {
  // placeholder stats
  const avgLatencyMin = 95;
  const maxLatencyMin = 360;
  const lateReplies = 4;

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>GHOSTING DETECTOR</Text>
        <Text style={styles.title}>Response Latency</Text>
        <Text style={styles.sub}>
          Measures delay between receiving a message and opening the app to respond.
        </Text>

        <SMSectionTitle title="Latency Metrics" subtitle="Placeholders until usage tracking is connected." />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <SMMiniCard label="Average" value={formatMinutes(avgLatencyMin)} sub="Today" tint="rgba(34,197,94,0.18)" />
          <SMMiniCard label="Maximum" value={formatMinutes(maxLatencyMin)} sub="Today" tint="rgba(239,68,68,0.18)" />
        </View>

        <View style={{ height: spacing.md }} />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <SMMiniCard label="Late replies" value={lateReplies.toString()} sub="> 6 hours" tint="rgba(124,58,237,0.20)" />
          <SMMiniCard label="Status" value="Moderate" sub="Withdrawal risk" tint="rgba(14,165,233,0.18)" />
        </View>

        <SMSectionTitle
          title="Interpretation"
          subtitle="Consistently high latency suggests social withdrawal (avoidance of interaction)."
        />

        <View style={styles.card}>
          <Text style={styles.cardText}>
            If response latency stays above ~6 hours across multiple days, the system can flag a high
            social withdrawal risk and increase the overall risk score.
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  cardText: { color: colors.muted, lineHeight: 20 },
});
