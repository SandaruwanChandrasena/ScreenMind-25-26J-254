/**
 * IsolationSuggestionsScreen.js
 *
 * Shows personalised, actionable suggestions based on the user's actual
 * risk factors from the most recent scoring run.
 *
 * Suggestions come from computeIsolationRisk() → suggestions[]
 * which are ranked by the worst risk factors detected.
 */

import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

import { getDailyIsolationHistory } from "../services/isolationStorage";

// ─── Default suggestions (shown when no data yet) ────────────────────────────
const DEFAULT_SUGGESTIONS = [
  {
    title:  "Take a short walk outside",
    detail: "Even 10–15 minutes increases daily movement and improves mood.",
  },
  {
    title:  "Connect with one friend today",
    detail: "A short call or message helps maintain social connections.",
  },
  {
    title:  "Reduce phone use after 10 PM",
    detail: "Cutting late-night screen time improves sleep quality and daily rhythm.",
  },
  {
    title:  "Visit a different environment",
    detail: "Cafés, parks, or libraries provide location variety linked to lower isolation risk.",
  },
];

// Icon per suggestion keyword
function getIcon(title) {
  const t = title.toLowerCase();
  if (t.includes("walk") || t.includes("movement")) return "walk-outline";
  if (t.includes("call") || t.includes("friend") || t.includes("contact")) return "call-outline";
  if (t.includes("phone") || t.includes("night") || t.includes("screen")) return "moon-outline";
  if (t.includes("place") || t.includes("environment") || t.includes("outing")) return "location-outline";
  if (t.includes("message") || t.includes("text")) return "chatbubble-outline";
  if (t.includes("bedtime") || t.includes("routine")) return "time-outline";
  return "checkmark-circle-outline";
}

export default function IsolationSuggestionsScreen({ navigation }) {
  const [suggestions, setSuggestions] = useState(null);
  const [riskLabel,   setRiskLabel]   = useState("");
  const [riskScore,   setRiskScore]   = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const history = await getDailyIsolationHistory();
        if (history.length > 0) {
          const latest = history[0]; // newest-first
          setSuggestions(
            latest.suggestions?.length ? latest.suggestions : DEFAULT_SUGGESTIONS
          );
          setRiskLabel(latest.riskLabel ?? latest.riskLevel ?? "");
          setRiskScore(latest.riskScore ?? null);
        } else {
          setSuggestions(DEFAULT_SUGGESTIONS);
        }
      } catch (e) {
        console.warn("IsolationSuggestionsScreen load error:", e);
        setSuggestions(DEFAULT_SUGGESTIONS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Suggestions</Text>
        <Text style={styles.sub}>
          Personalised steps based on your detected patterns.
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            {/* Context badge */}
            {riskScore !== null && (
              <View
                style={[
                  styles.contextBadge,
                  riskScore >= 67 && styles.badgeHigh,
                  riskScore >= 34 && riskScore < 67 && styles.badgeMedium,
                  riskScore < 34 && styles.badgeLow,
                ]}
              >
                <Text style={styles.contextText}>
                  {riskLabel} isolation risk ({riskScore}/100) — {
                    riskScore >= 67
                      ? "Acting on these now will make a real difference."
                      : riskScore >= 34
                      ? "Small changes can keep your risk low."
                      : "You're doing well — keep it up!"
                  }
                </Text>
              </View>
            )}

            <GlassCard
              icon="heart-outline"
              title="Recommended actions"
              subtitle="Preventive nudges — not a diagnosis"
              style={{ marginTop: spacing.lg }}
            >
              {suggestions.map((s, i) => (
                <View key={s.title + i} style={[styles.item, i !== 0 && styles.borderTop]}>
                  <View style={styles.itemRow}>
                    <View style={styles.iconWrap}>
                      <Icon name={getIcon(s.title)} size={18} color={colors.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{s.title}</Text>
                      <Text style={styles.itemDetail}>{s.detail}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </GlassCard>

            {/* Link to Why screen for context */}
            <Pressable
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.9 }]}
              onPress={() => navigation.navigate("IsolationWhy")}
            >
              <Text style={styles.linkText}>Why am I seeing these?</Text>
              <Icon name="chevron-forward" size={16} color={colors.text} />
            </Pressable>

            <Text style={styles.disclaimer}>
              These suggestions are based on behavioural patterns only and are not a
              substitute for professional mental health advice.
            </Text>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title:     { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub:       { color: colors.muted, marginTop: 8, lineHeight: 18 },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

  contextBadge: {
    marginTop: spacing.lg,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeHigh:   { backgroundColor: "rgba(239,68,68,0.12)",  borderColor: "rgba(239,68,68,0.3)" },
  badgeMedium: { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.3)" },
  badgeLow:    { backgroundColor: "rgba(34,197,94,0.12)",  borderColor: "rgba(34,197,94,0.3)" },
  contextText: { color: colors.text, fontWeight: "800", fontSize: 13, lineHeight: 18 },

  item:      { paddingVertical: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },

  itemRow:  { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.32)",
    marginTop: 2,
  },
  itemTitle:  { color: colors.text, fontWeight: "900", fontSize: 14 },
  itemDetail: { color: colors.faint, marginTop: 4, lineHeight: 18 },

  linkBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.md,
  },
  linkText:    { color: colors.text, fontWeight: "900" },
  disclaimer:  { color: colors.faint, marginTop: spacing.lg, fontSize: 11, lineHeight: 16 },
});