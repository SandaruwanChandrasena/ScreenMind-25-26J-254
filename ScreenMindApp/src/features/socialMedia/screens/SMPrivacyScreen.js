import React from "react";
import { Text, StyleSheet, ScrollView, View } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";

export default function SMPrivacyScreen() {
  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>PRIVACY</Text>
        <Text style={styles.title}>Ethics & Consent</Text>
        <Text style={styles.sub}>
          This module is designed to be privacy-preserving and non-diagnostic.
        </Text>

        <SMSectionTitle title="What we collect (signals)" />
        <View style={styles.card}>
          <Text style={styles.text}>• Sentiment score (numerical)</Text>
          <Text style={styles.text}>• Absolutist word count</Text>
          <Text style={styles.text}>• Emoji masking flag</Text>
          <Text style={styles.text}>• Response latency (timestamps)</Text>
          <Text style={styles.text}>• Journal text (user-entered, consent-based)</Text>
        </View>

        <SMSectionTitle title="What we do NOT collect" />
        <View style={styles.card}>
          <Text style={styles.text}>• Passwords or secure input</Text>
          <Text style={styles.text}>• Private message history storage</Text>
          <Text style={styles.text}>• Contact names (should be anonymized)</Text>
          <Text style={styles.text}>• Medical diagnosis</Text>
        </View>

        <SMSectionTitle title="Purpose" subtitle="Outputs are risk indicators, not clinical conclusions." />
        <View style={styles.card}>
          <Text style={styles.text}>
            The goal is early warning and awareness. Any “high risk” result should be treated as a
            signal to take a break and seek support—not as a diagnosis.
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
  text: { color: colors.muted, lineHeight: 20, marginBottom: 6 },
});
