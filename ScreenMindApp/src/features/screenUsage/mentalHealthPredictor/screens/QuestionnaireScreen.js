import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";

import { colors } from "../../../../theme/colors";
import { spacing } from "../../../../theme/spacing";

import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

import { PHQ9_QUESTIONS, PHQ9_OPTIONS } from "../questionnaires/phq9";
import { GAD7_QUESTIONS, GAD7_OPTIONS } from "../questionnaires/gad7";
import { sumScore, phq9Severity, gad7Severity, combinedQuestionnaireRisk } from "../questionnaires/scoring";

export default function QuestionnaireScreen({ navigation }) {
  const [answers, setAnswers] = useState({}); // { id: 0..3 }

  const phq9Ids = useMemo(() => PHQ9_QUESTIONS.map((q) => q.id), []);
  const gad7Ids = useMemo(() => GAD7_QUESTIONS.map((q) => q.id), []);

  const totalQuestions = phq9Ids.length + gad7Ids.length;
  const answeredCount = Object.keys(answers).length;

  const allAnswered = answeredCount === totalQuestions;

  const phq9Score = useMemo(() => sumScore(answers, phq9Ids), [answers, phq9Ids]);
  const gad7Score = useMemo(() => sumScore(answers, gad7Ids), [answers, gad7Ids]);

  const phq9 = useMemo(() => phq9Severity(phq9Score), [phq9Score]);
  const gad7 = useMemo(() => gad7Severity(gad7Score), [gad7Score]);

  const combined = useMemo(
    () => combinedQuestionnaireRisk({ phq9Score, gad7Score }),
    [phq9Score, gad7Score]
  );

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

async function onSubmit() {
  if (!allAnswered) {
    Alert.alert("Complete all questions", "Please answer every question before submitting.");
    return;
  }

  const user = auth().currentUser;
  if (!user) return;

  const result = {
    createdAt: firestore.FieldValue.serverTimestamp(),
    phq9: { score: phq9Score, severity: phq9.label },
    gad7: { score: gad7Score, severity: gad7.label },
    combinedRisk: combined,
  };

  try {
    await firestore()
      .collection("users")
      .doc(user.uid)
      .collection("screenUsageAssessments")
      .add(result);

    navigation.navigate("MentalHealthDashboard", { result });
  } catch (error) {
    Alert.alert("Error", "Failed to save assessment");
    console.error(error);
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

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current summary</Text>

          <Text style={styles.summaryLine}>
            PHQ-9: <Text style={styles.bold}>{phq9Score}</Text> ({phq9.label})
          </Text>
          <Text style={styles.summaryLine}>
            GAD-7: <Text style={styles.bold}>{gad7Score}</Text> ({gad7.label})
          </Text>

          <Text style={styles.summaryLine}>
            Combined risk: <Text style={styles.bold}>{combined.label}</Text>
          </Text>

          <Text style={styles.progress}>
            Answered {answeredCount}/{totalQuestions}
          </Text>
        </View>

        {/* Submit */}
        <Pressable
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            !allAnswered && styles.submitBtnDisabled,
            pressed && allAnswered && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.submitText}>{allAnswered ? "Submit Assessment" : "Answer all questions"}</Text>
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
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.label}</Text>
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

