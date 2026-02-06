import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";



import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import SMPieSummary from "../components/SMPieSummary";
import SMActionCard from "../components/SMActionCard";
import SMRiskBadge from "../components/SMRiskBadge";
import SMSectionTitle from "../components/SMSectionTitle";
import SMMetricsGrid from "../components/SMMetricsGrid";

import { SM_ROUTES, RISK_LEVELS } from "../utils/sm.constants";
import { formatMinutes, toFixedMaybe } from "../utils/sm.formatters";

export default function SMHomeScreen({ navigation }) {
  const [loadingKey, setLoadingKey] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const toggleColor = showDetails
  ? "rgba(123,77,255,0.85)"   // purple when showing details
  : "rgba(0,224,255,0.85)";  // cyan when showing summary


  useEffect(() => {
    const unsub = navigation.addListener("blur", () => setLoadingKey(null));
    return unsub;
  }, [navigation]);

  const go = (key, route) => {
    setLoadingKey(key);
    setTimeout(() => navigation.navigate(route), 280);
  };

  const riskLevel = RISK_LEVELS.MODERATE;

  const metrics = [
    {
      label: "Sentiment",
      value: `${toFixedMaybe(-0.62)}`,
      sub: "Today (avg score)",
      tint: "rgba(124,58,237,0.25)",
    },
    {
      label: "Absolutist",
      value: "2",
      sub: "Words detected",
      tint: "rgba(239,68,68,0.18)",
    },
    {
      label: "Emoji masking",
      value: "No",
      sub: "Contradictions",
      tint: "rgba(14,165,233,0.22)",
    },
    {
      label: "Latency",
      value: formatMinutes(95),
      sub: "Avg response time",
      tint: "rgba(34,197,94,0.18)",
    },
  ];

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>SOCIAL MEDIA</Text>
        <Text style={styles.title}>Mental State Analyzer</Text>
        <Text style={styles.sub}>
          This module summarizes emotional exposure, social withdrawal, and interaction signals.
        </Text>

        <SMRiskBadge level={riskLevel} hint="Mood signal and response patterns show moderate risk today." />

        {/* ✅ Quick Metrics header + toggle */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <SMSectionTitle
              title="Quick Metrics"
              subtitle={showDetails ? "Detailed view" : "Summary view"}
            />
          </View>

          <Pressable
  onPress={() => setShowDetails((p) => !p)}
  style={({ pressed }) => [
    styles.toggleBtn,
    { borderColor: toggleColor, shadowColor: toggleColor },
    pressed && { opacity: 0.9 },
  ]}
  hitSlop={12}
>
  <Icon
    name={showDetails ? "list-outline" : "pie-chart-outline"}
    size={20}
    color={toggleColor}
  />
</Pressable>


        </View>

        {/* ✅ Toggle content (ONLY one view shown) */}
        {showDetails ? (
          <SMMetricsGrid metrics={metrics} />
        ) : (
          <SMPieSummary
            title="Signal Breakdown"
            subtitle="Tap the icon to view full metrics"
            data={[
              { label: "Sentiment", value: 42, color: "rgba(123,77,255,0.75)" },
              { label: "Absolutist", value: 18, color: "rgba(0,224,255,0.70)" },
              { label: "Masking", value: 12, color: "rgba(217,70,239,0.70)" },
              { label: "Latency", value: 28, color: "rgba(0,221,187,0.70)" },
            ]}
          />
        )}

        <SMSectionTitle title="Actions" subtitle="Explore each analysis pillar." />

        <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
          <SMActionCard
            title="Daily Journal"
            emoji="📝"
            glow="rgba(123,77,255,0.55)"
            loading={loadingKey === "journal"}
            onPress={() => go("journal", SM_ROUTES.Journal)}
          />

          <SMActionCard
            title="Notification Analysis"
            emoji="🔔"
            glow="rgba(0,224,255,0.50)"
            loading={loadingKey === "notif"}
            onPress={() => go("notif", SM_ROUTES.Notification)}
          />

          <SMActionCard
            title="Ghosting Detector"
            emoji="⏱️"
            glow="rgba(0,221,187,0.50)"
            loading={loadingKey === "ghost"}
            onPress={() => go("ghost", SM_ROUTES.Ghosting)}
          />

          <SMActionCard
            title="Insights"
            emoji="🧠"
            glow="rgba(217,70,239,0.55)"
            loading={loadingKey === "insights"}
            onPress={() => go("insights", SM_ROUTES.Insights)}
          />

          <SMActionCard
            title="History"
            emoji="📊"
            glow="rgba(59,130,246,0.55)"
            loading={loadingKey === "history"}
            onPress={() => go("history", SM_ROUTES.History)}
          />

          <SMActionCard
            title="Privacy & Ethics"
            emoji="🔒"
            glow="rgba(255,184,0,0.50)"
            loading={loadingKey === "privacy"}
            onPress={() => go("privacy", SM_ROUTES.Privacy)}
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900", marginTop: spacing.sm },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
