import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";
import SMMiniCard from "../components/SMMiniCard";
import { formatMinutes } from "../utils/sm.formatters";

export default function SMGhostingScreen() {
  /* ---------------- MOCK BEHAVIOUR DATA ---------------- */
  const avgReplyMin = 160;       // average reply time
  const maxReplyMin = 540;       // longest delay today
  const recentReplyMin = 210;    // recent replies
  const lateReplies = 5;
  const totalReplies = 12;
  const repliesToday = 6;
  const usualReplies = 14;
  const unanswered = 3;
  const lowActivityDays = 3;

  const latencyTrendUp = true;
  const engagementDown = repliesToday < usualReplies;

  /* ---------------- DERIVED VALUES ---------------- */
  const latePercent = Math.round((lateReplies / totalReplies) * 100);

  const riskScore =
    (avgReplyMin > 120 ? 1 : 0) +
    (latePercent > 35 ? 1 : 0) +
    (engagementDown ? 1 : 0) +
    (lowActivityDays >= 3 ? 1 : 0);

  const riskLevel =
    riskScore >= 3 ? "HIGH" : riskScore === 2 ? "MODERATE" : "LOW";

  const riskUI = {
    LOW: {
      label: "Low",
      color: "#22C55E",
      bg: "rgba(34,197,94,0.14)",
      message: "Interaction behaviour appears stable.",
    },
    MODERATE: {
      label: "Moderate",
      color: "#FFB800",
      bg: "rgba(255,184,0,0.14)",
      message: "Reply delays or reduced interaction detected.",
    },
    HIGH: {
      label: "High",
      color: "#EF4444",
      bg: "rgba(239,68,68,0.14)",
      message: "Sustained avoidance patterns detected.",
    },
  }[riskLevel];

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>GHOSTING DETECTOR</Text>
        <Text style={styles.title}>Reply & Interaction Behaviour</Text>
        <Text style={styles.sub}>
          Analyses response timing and interaction patterns without reading message content.
        </Text>

        {/* -------- STATUS CARD -------- */}
        <View style={[styles.statusCard, { backgroundColor: riskUI.bg }]}>
          <Text style={styles.statusTitle}>Social Withdrawal Risk</Text>
          <Text style={[styles.statusLevel, { color: riskUI.color }]}>
            {riskUI.label}
          </Text>
          <Text style={styles.statusMsg}>{riskUI.message}</Text>
        </View>

        {/* -------- RESPONSE LATENCY -------- */}
        <SMSectionTitle title="Response Latency" subtitle="Timing-based interaction signals." />

        <View style={styles.row}>
          <SMMiniCard
            label="Average reply"
            value={formatMinutes(avgReplyMin)}
            sub="Today"
            tint="rgba(59,130,246,0.18)"
          />
          <SMMiniCard
            label="Longest delay"
            value={formatMinutes(maxReplyMin)}
            sub="Today"
            tint="rgba(239,68,68,0.18)"
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            Response time is {latencyTrendUp ? "increasing ⬆️" : "stable"} this week.
          </Text>
        </View>

        {/* -------- LATE REPLIES -------- */}
        <SMSectionTitle title="Late Replies" subtitle="Replies exceeding your usual response time." />

        <View style={styles.row}>
          <SMMiniCard
            label="Late replies"
            value={lateReplies.toString()}
            sub="Today"
            tint="rgba(123,77,255,0.20)"
          />
          <SMMiniCard
            label="Delayed"
            value={`${latePercent}%`}
            sub="Of replies"
            tint="rgba(14,165,233,0.20)"
          />
        </View>

        <Text style={styles.note}>
          Late = replies longer than your typical response time.
        </Text>

        {/* -------- ENGAGEMENT -------- */}
        <SMSectionTitle title="Engagement Level" subtitle="Reply frequency compared to your baseline." />

        <View style={styles.row}>
          <SMMiniCard
            label="Replies today"
            value={repliesToday.toString()}
            sub={`Usual: ${usualReplies}`}
            tint="rgba(34,197,94,0.18)"
          />
          <SMMiniCard
            label="Low activity"
            value={`${lowActivityDays} days`}
            sub="In a row"
            tint="rgba(255,184,0,0.18)"
          />
        </View>

        {/* -------- UNANSWERED -------- */}
        <SMSectionTitle title="Unanswered Messages" subtitle="Messages not replied to yet." />

        <View style={styles.row}>
          <SMMiniCard
            label="Unanswered"
            value={unanswered.toString()}
            sub="Today"
            tint="rgba(239,68,68,0.18)"
          />
        </View>

        <Text style={styles.note}>
          Some messages have not received a reply yet.
        </Text>

        {/* -------- INSIGHTS -------- */}
        <SMSectionTitle title="Insights" subtitle="Behavioural patterns observed." />

        <View style={styles.card}>
          <Text style={styles.cardText}>
            • You are taking longer to reply than usual.{"\n"}
            • Interaction frequency has decreased recently.{"\n"}
            • These patterns may indicate social withdrawal or overload.
          </Text>
        </View>

        {/* -------- ETHICS FOOTER -------- */}
        <View style={styles.ethics}>
          <Text style={styles.ethicsText}>
            This analysis is based only on response timing and frequency. Message content,
            recipients, and identities are never accessed.
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },

  statusCard: {
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: spacing.lg,
  },
  statusTitle: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  statusLevel: { fontSize: 22, fontWeight: "900", marginTop: 6 },
  statusMsg: { color: colors.text, marginTop: 6, fontSize: 13 },

  row: { flexDirection: "row", gap: spacing.md },

  infoRow: { marginTop: spacing.sm },
  infoText: { color: colors.faint, fontSize: 12 },

  note: {
    color: colors.faint,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  cardText: { color: colors.muted, lineHeight: 20 },

  ethics: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  ethicsText: { color: colors.faint, fontSize: 11, lineHeight: 16 },
});
