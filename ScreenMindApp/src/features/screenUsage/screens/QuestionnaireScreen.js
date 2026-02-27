import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import { PHQ9_QUESTIONS, PHQ9_OPTIONS } from "../services/phq9";
import { GAD7_QUESTIONS, GAD7_OPTIONS } from "../services/gad7";
import { sumScore, phq9Severity, gad7Severity } from "../services/scoring";

import { generateSimulatedDailyUsage, computeUsageRisk } from "../services/usageLogs";

// ✅ local storage key
const STORAGE_KEY = "screenUsageAssessments";

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Normalize questionnaire distress 0..1
function distressIndex01(phq9Score, gad7Score) {
  const phqNorm = phq9Score / 27; // 0..1
  const gadNorm = gad7Score / 21; // 0..1
  return clamp01((phqNorm + gadNorm) / 2);
}

function labelFrom01(score01) {
  if (score01 >= 0.67) return "High";
  if (score01 >= 0.34) return "Moderate";
  return "Low";
}

export default function QuestionnaireScreen({ navigation }) {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const phq9Ids = useMemo(() => PHQ9_QUESTIONS.map((q) => q.id), []);
  const gad7Ids = useMemo(() => GAD7_QUESTIONS.map((q) => q.id), []);

  const totalQuestions = phq9Ids.length + gad7Ids.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;

  const phq9Score = useMemo(() => sumScore(answers, phq9Ids), [answers, phq9Ids]);
  const gad7Score = useMemo(() => sumScore(answers, gad7Ids), [answers, gad7Ids]);

  const phq9 = useMemo(() => phq9Severity(phq9Score), [phq9Score]);
  const gad7 = useMemo(() => gad7Severity(gad7Score), [gad7Score]);

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function onSubmit() {
    if (!allAnswered) {
      Alert.alert("Complete all questions", "Please answer every question before submitting.");
      return;
    }
    if (saving) return;

    setSaving(true);

    try {
      // ✅ 1) Simulated usage log (try to pass q scores; if your function doesn't accept params, it still works)
      let usageLog;
      try {
        usageLog = generateSimulatedDailyUsage({ phq9Score, gad7Score });
      } catch {
        usageLog = generateSimulatedDailyUsage();
      }

      // ✅ 2) Usage risk (0..1) + breakdown
      const usage = computeUsageRisk(usageLog);
      const usageRisk01 = clamp01(usage?.usageRisk ?? 0);

      // ✅ 3) Questionnaire distress (0..1)
      const qDistress01 = distressIndex01(phq9Score, gad7Score);

      // ✅ 4) Hybrid AI score (0..1)
      // (You can change weights anytime — this is your “model”)
      const hybridScore01 = clamp01(0.6 * qDistress01 + 0.4 * usageRisk01);
      const aiLabel = labelFrom01(hybridScore01);

      // ✅ 5) Final result object (SERIALIZABLE)
      const result = {
        id: makeId(),
        submittedAt: new Date().toISOString(),

        // keep answers for research evidence
        answers,

        phq9: { score: phq9Score, severity: phq9.label },
        gad7: { score: gad7Score, severity: gad7.label },

        // keep your old field name for compatibility
        combinedRisk: {
          label: aiLabel,
          score: Number(hybridScore01.toFixed(3)),
        },

        // ✅ clearer AI output too (recommended)
        aiPrediction: {
          label: aiLabel,
          score01: Number(hybridScore01.toFixed(3)),
          weights: { questionnaire: 0.6, usage: 0.4 },
        },

        // ✅ usage data stored
        usageLog,
        usageRisk: {
          usageRisk01,
          breakdown: usage?.breakdown || {},
        },
      };

      // ✅ 6) Save to AsyncStorage history
      const existingStr = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = safeJsonParse(existingStr, []);

      const next = Array.isArray(existing) ? [result, ...existing] : [result];
      const limited = next.slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limited));

      // ✅ 7) Navigate
      navigation.navigate("MentalHealthDashboard", { result });
    } catch (error) {
      console.error("LOCAL SAVE ERROR:", error);
      Alert.alert("Error", error?.message || "Failed to save assessment locally");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>PHQ-9</Text>
        <Text style={styles.hint}>Over the last 2 weeks, how often have you been bothered by:</Text>

        {PHQ9_QUESTIONS.map((q) => (
          <QuestionBlock
            key={q.id}
            title={q.text}
            value={answers[q.id]}
            options={PHQ9_OPTIONS}
            onChange={(v) => setAnswer(q.id, v)}
            isSafetyItem={q.isSafetyItem}
          />
        ))}

        <View style={styles.sectionDivider} />

        <Text style={styles.h1}>GAD-7</Text>
        <Text style={styles.hint}>Over the last 2 weeks, how often have you been bothered by:</Text>

        {GAD7_QUESTIONS.map((q) => (
          <QuestionBlock
            key={q.id}
            title={q.text}
            value={answers[q.id]}
            options={GAD7_OPTIONS}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ))}

        <View style={styles.sectionDivider} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current summary</Text>

          <Text style={styles.summaryLine}>
            PHQ-9: <Text style={styles.bold}>{phq9Score}</Text> ({phq9.label})
          </Text>
          <Text style={styles.summaryLine}>
            GAD-7: <Text style={styles.bold}>{gad7Score}</Text> ({gad7.label})
          </Text>

          <Text style={styles.progress}>
            Answered {answeredCount}/{totalQuestions}
          </Text>
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={!allAnswered || saving}
          style={({ pressed }) => [
            styles.submitBtn,
            (!allAnswered || saving) && styles.submitBtnDisabled,
            pressed && allAnswered && !saving && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.submitText}>
            {saving ? "Saving..." : allAnswered ? "Submit Assessment" : "Answer all questions"}
          </Text>
        </Pressable>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function QuestionBlock({ title, value, options, onChange, isSafetyItem }) {
  return (
    <View style={styles.qCard}>
      <Text style={[styles.qTitle, isSafetyItem && { color: colors.text }]}>{title}</Text>

      <View style={styles.optionsWrap}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1 },
  container: { padding: spacing.lg, paddingTop: spacing.lg },

  h1: { color: colors.text, fontSize: 20, fontWeight: "900", marginBottom: spacing.xs },
  hint: { color: colors.muted, marginBottom: spacing.md, lineHeight: 18 },

  qCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  qTitle: { color: colors.text, fontWeight: "800", marginBottom: spacing.sm, lineHeight: 18 },

  optionsWrap: { gap: 10 },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  optionSelected: {
    borderColor: "rgba(124,58,237,0.7)",
    backgroundColor: "rgba(124,58,237,0.18)",
  },
  optionText: { color: colors.muted, fontWeight: "700" },
  optionTextSelected: { color: colors.text },

  sectionDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },

  summaryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: { color: colors.text, fontWeight: "900", marginBottom: spacing.sm },
  summaryLine: { color: colors.muted, marginBottom: 6 },
  bold: { color: colors.text, fontWeight: "900" },
  progress: { color: colors.faint, marginTop: spacing.sm, fontWeight: "700" },

  submitBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(124,58,237,0.85)",
  },
  submitBtnDisabled: { backgroundColor: "rgba(124,58,237,0.35)" },
  submitText: { color: "#fff", fontWeight: "900" },
});