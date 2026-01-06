import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";
import SMMiniCard from "../components/SMMiniCard";
import { analyzeJournalText } from "../services/socialMedia.api";
import { toFixedMaybe } from "../utils/sm.formatters";

export default function SMJournalScreen() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // local UI result (mock default)
  const [result, setResult] = useState(null);

  const canAnalyze = useMemo(() => text.trim().length >= 10, [text]);

  const onAnalyze = async () => {
    if (!canAnalyze) {
      Alert.alert("Write a little more", "Please write at least 10 characters.");
      return;
    }

    try {
      setLoading(true);

      // If backend isn't ready yet, you can comment this and set mock result
      const data = await analyzeJournalText(text.trim());

      // Expected response format (example):
      // { riskLevel, sentimentScore, sentimentLabel, absolutistCount, emojiMasking }
      setResult(data);
    } catch (e) {
      Alert.alert("Analysis failed", e?.message || "Backend not connected yet.");
      // Fallback mock (so UI can still be demonstrated)
      setResult({
        riskLevel: "MODERATE",
        sentimentScore: -0.62,
        sentimentLabel: "NEGATIVE",
        absolutistCount: 1,
        emojiMasking: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>DAILY JOURNAL</Text>
        <Text style={styles.title}>Typing Stress Test</Text>
        <Text style={styles.sub}>
          Write a short note. We use it for sentiment, absolutist words, and emoji masking.
        </Text>

        <SMSectionTitle title="Journal Input" subtitle="This is user-entered data (ethical and consent-based)." />

        <View style={styles.inputCard}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="How was your day today?"
            placeholderTextColor={colors.faint}
            multiline
            style={styles.input}
            textAlignVertical="top"
          />
        </View>

        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton
            title={loading ? "Analyzing..." : "Analyze"}
            onPress={onAnalyze}
            disabled={loading || !canAnalyze}
          />
        </View>

        <SMSectionTitle title="Result" subtitle="A compact view of extracted signals." />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <SMMiniCard
            label="Risk"
            value={result?.riskLevel || "—"}
            sub="Overall"
            tint="rgba(124,58,237,0.25)"
          />
          <SMMiniCard
            label="Sentiment"
            value={result ? `${toFixedMaybe(result.sentimentScore)} (${result.sentimentLabel})` : "—"}
            sub="Journal text"
            tint="rgba(14,165,233,0.22)"
          />
        </View>

        <View style={{ height: spacing.md }} />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <SMMiniCard
            label="Absolutist"
            value={result?.absolutistCount?.toString?.() || "—"}
            sub="Words detected"
            tint="rgba(239,68,68,0.18)"
          />
          <SMMiniCard
            label="Emoji masking"
            value={result ? (result.emojiMasking ? "Yes" : "No") : "—"}
            sub="Contradiction"
            tint="rgba(34,197,94,0.18)"
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
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },

  inputCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  input: {
    minHeight: 140,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
});
