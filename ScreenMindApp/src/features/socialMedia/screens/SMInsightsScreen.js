import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";

function Insight({ title, body }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

export default function SMInsightsScreen() {
  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>INSIGHTS</Text>
        <Text style={styles.title}>Explainable Results</Text>
        <Text style={styles.sub}>Human-readable explanations of detected signals.</Text>

        <SMSectionTitle title="Today" subtitle="Example insights (replace with real generated insights later)." />

        <Insight
          title="Negative exposure increased"
          body="A cluster of negative messages was detected today. Repeated negative exposure may contribute to stress."
        />
        <Insight
          title="Absolutist language markers"
          body='Words like "always/never/nothing" were detected in user text. This may indicate cognitive rigidity.'
        />
        <Insight
          title="Response latency elevated"
          body="Long delays in opening messaging apps can suggest social withdrawal, especially if consistent across days."
        />

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
    marginBottom: spacing.md,
  },
  cardTitle: { color: colors.text, fontWeight: "900", marginBottom: spacing.xs },
  cardBody: { color: colors.muted, lineHeight: 20 },
});
