import React, { useContext } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";

import { AuthContext } from "../context/AuthContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

import DashboardBackground from "../components/DashboardBackground";
import FeatureCard from "../components/FeatureCard";


export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  // Dummy summary (later replace with your ML predictions)
  const overallRisk = "Moderate";
  const overallHint = "Late-night usage increased this week.";

  return (
    <DashboardBackground>
      {/* ✅ Your layout stays the same — only background is new */}
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>SCREENMIND</Text>

        <Text style={styles.title}>Welcome, {user?.displayName || "User"} 👋</Text>
        <Text style={styles.sub}>Your calm dashboard for healthier screen habits.</Text>

        {/* Summary card (keep or remove — your choice) */}
        <View style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>Overall Risk</Text>
            <Text style={styles.summaryValue}>{overallRisk}</Text>
            <Text style={styles.summaryHint} numberOfLines={2}>
              {overallHint}
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>Today</Text>
          </View>
        </View>

        {/* Cards (same as before) */}
        <View style={styles.grid}>
          <FeatureCard
            emoji="📱"
            title="Screen Usage"
            subtitle="Usage & addiction risk"
            tint="rgba(124,58,237,0.25)"
            onPress={() => {}}
          />
          <FeatureCard
            emoji="😴"
            title="Sleep"
            subtitle="Sleep disruption analysis"
            tint="rgba(34,197,94,0.22)"
            onPress={() => navigation.navigate("SleepHome")}
          />
        </View>

        <View style={styles.grid}>
          <FeatureCard
            emoji="💬"
            title="Social Media"
            subtitle="Interaction risk patterns"
            tint="rgba(14,165,233,0.22)"
            onPress={() => navigation.navigate("SocialMediaStack")}
          />
          <FeatureCard
            emoji="📍"
            title="Isolation"
            subtitle="Mobility & loneliness risk"
            tint="rgba(239,68,68,0.18)"
            onPress={() => navigation.navigate("IsolationOverview")} // ✅ EDIT HERE
          />


        </View>

        <Pressable style={styles.footerLink} onPress={() => {}}>
          <Text style={styles.footerText}>Privacy & Data Settings</Text>
        </Pressable>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  brand: {
    color: colors.muted,
    fontWeight: "900",
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
  },

  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 18 },

  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: spacing.lg,
  },

  summaryTitle: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  summaryValue: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: 6 },
  summaryHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.22)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  grid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },

  footerLink: { marginTop: spacing.md, alignItems: "center" },
  footerText: { color: colors.faint, fontWeight: "700" },
});
