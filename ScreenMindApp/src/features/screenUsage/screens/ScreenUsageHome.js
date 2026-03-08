import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

const STORAGE_KEY = "screenUsageAssessments";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default function ScreenUsageHome({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    loadAssessment();
  }, []);

  async function loadAssessment() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = safeJsonParse(raw, []);

    // console.log("📦 Loaded assessments:", JSON.stringify(list, null, 2));

    if (!list || list.length === 0) {
      navigation.replace("QuestionnaireScreen");
      return;
    }

    const last = list[0];
    const submitted = new Date(last.submittedAt).getTime();
    const now = Date.now();

    const diff = now - submitted;
    const remaining = Math.ceil((TWO_WEEKS_MS - diff) / (1000 * 60 * 60 * 24));

    setLatest(last);
    setDaysRemaining(Math.max(0, remaining));
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={styles.loadingText}>Checking assessment...</Text>
      </View>
    );
  }

  const lastDate = new Date(latest.submittedAt).toLocaleDateString();

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Screen Usage Assessment</Text>

        <Text style={styles.info}>
          Last assessment: <Text style={styles.bold}>{lastDate}</Text>
        </Text>

        <Text style={styles.info}>
          Next recommended in:{" "}
          <Text style={styles.bold}>{daysRemaining} days</Text>
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              navigation.navigate("MentalHealthDashboard", { result: latest })
            }
          >
            <Text style={styles.btnText}>View Dashboard</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("QuestionnaireScreen")}
          >
            <Text style={styles.btnText}>Retake Assessment</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  loading: {
    flex: 1,
    backgroundColor: colors.bg1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: spacing.md,
    color: colors.muted,
    fontWeight: "700",
  },

  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    marginBottom: spacing.md,
  },

  info: {
    color: colors.muted,
    marginBottom: spacing.sm,
    fontSize: 14,
  },

  bold: {
    color: colors.text,
    fontWeight: "900",
  },

  buttons: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },

  primaryBtn: {
    backgroundColor: "rgba(124,58,237,0.85)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryBtn: {
    backgroundColor: "rgba(124,58,237,0.35)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "900",
  },
});