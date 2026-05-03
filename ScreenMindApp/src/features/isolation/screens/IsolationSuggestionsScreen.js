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

import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

import { getDailyIsolationHistory, markSuggestionsShown } from "../services/isolationStorage";

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

function overallRiskTextAndColor(label, score) {
  const raw = String(label || "").trim().toLowerCase();

  if (score !== null && score >= 67) {
    return { text: "High Risk", color: "#f87171" };
  }
  if (score !== null && score >= 34) {
    return { text: "Moderate Risk", color: "#fbbf24" };
  }
  if (score !== null) {
    return { text: "Low Risk", color: "#4ade80" };
  }

  if (raw === "high") {
    return { text: "High Risk", color: "#f87171" };
  }
  if (raw === "medium" || raw === "moderate") {
    return { text: "Moderate Risk", color: "#fbbf24" };
  }
  return { text: "Low Risk", color: "#4ade80" };
}

function riskBasedSuggestions(score, label) {
  const riskScore = typeof score === "number" ? score : null;
  const rawLabel = String(label || "").toLowerCase();

  if (riskScore !== null && riskScore >= 67) {
    return [
      { title: "Take a short walk outside", detail: "A 10-15 minute walk can reduce isolation and break up a long stretch indoors." },
      { title: "Connect with one friend today", detail: "Send a message or make a short call to keep one social connection active." },
      { title: "Reduce phone use after 10 PM", detail: "A better sleep window helps mood, energy, and daily rhythm." },
      { title: "Visit a different environment", detail: "A café, park, or library adds location variety and social exposure." },
    ];
  }

  if (riskScore !== null && riskScore >= 34) {
    return [
      { title: "Take a short walk outside", detail: "A small change of scene can improve mood and reduce withdrawal." },
      { title: "Reach out to someone you know", detail: "A message or quick call helps keep social contact steady." },
      { title: "Try a phone-free hour", detail: "A short break from checking can improve focus and reduce stress." },
    ];
  }

  if (rawLabel.includes("high")) {
    return riskBasedSuggestions(67, rawLabel);
  }
  if (rawLabel.includes("moderate") || rawLabel.includes("medium")) {
    return riskBasedSuggestions(34, rawLabel);
  }

  return [
    { title: "Take a short walk outside", detail: "Even 10-15 minutes supports movement and mood." },
    { title: "Connect with one friend today", detail: "A short call or message helps maintain social connections." },
    { title: "Visit a different environment", detail: "A new place can add healthy variety to your day." },
  ];
}

function normalizeSuggestions(record) {
  const persisted = Array.isArray(record?.suggestions) ? record.suggestions.filter(Boolean) : [];
  if (persisted.length > 0) return persisted;
  return riskBasedSuggestions(record?.riskScore ?? null, record?.riskLabel ?? record?.riskLevel ?? "");
}

export default function IsolationSuggestionsScreen({ navigation }) {
  const [suggestions, setSuggestions] = useState([]);
  const [riskLabel,   setRiskLabel]   = useState("");
  const [riskScore,   setRiskScore]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scoreRisk = overallRiskTextAndColor(riskLabel, riskScore);

  useEffect(() => {
    (async () => {
      try {
        const history = await getDailyIsolationHistory();
        if (history.length > 0) {
          const latest = history[0]; // newest-first
          const resolvedSuggestions = normalizeSuggestions(latest);
          const latestRiskScore = typeof latest.riskScore === "number" ? latest.riskScore : null;
          const latestRiskLabel = latest.riskLabel ?? latest.riskLevel ?? "";
          const alreadyShownForThisRisk = Boolean(latest.suggestionsShown)
            && latest.suggestionsShownScore === latestRiskScore;

          setSuggestions(resolvedSuggestions);
          setRiskLabel(latestRiskLabel);
          setRiskScore(latestRiskScore);
          setShowSuggestions(!alreadyShownForThisRisk);

          if (!alreadyShownForThisRisk) {
            await markSuggestionsShown(latest.date, latestRiskScore);
          }
        } else {
          setSuggestions(DEFAULT_SUGGESTIONS);
          setShowSuggestions(true);
        }
      } catch (e) {
        console.warn("IsolationSuggestionsScreen load error:", e);
        setSuggestions(DEFAULT_SUGGESTIONS);
        setShowSuggestions(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Suggestions</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            {/* Score badge */}
            {riskScore !== null && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>
                  Current score: {riskScore}/100 - {" "}
                  <Text style={[styles.scoreBadgeRiskText, { color: scoreRisk.color }]}>
                    {scoreRisk.text}
                  </Text>
                </Text>
              </View>
            )}

            {showSuggestions ? (
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
            ) : (
              <GlassCard
                icon="checkmark-done-outline"
                title="Suggestions already shown"
                subtitle="This risk level has already been surfaced today."
                style={{ marginTop: spacing.lg }}
              >
                <Text style={styles.itemDetail}>
                  We only show suggestions once for the current daily risk score. Check back after your risk changes or tomorrow's scan.
                </Text>
                <View style={{ height: spacing.md }} />
                <Pressable
                  style={styles.bigBtn}
                  onPress={() => setShowSuggestions(true)}
                >
                  <Text style={styles.bigBtnText}>View suggestions </Text>
                </Pressable>
              </GlassCard>
            )}

            {/* Link to Why screen for context */}
            <Pressable
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.9 }]}
              onPress={() => navigation.navigate("IsolationWhy")}
            >
              <Text style={styles.linkText}>Why am I seeing these?</Text>
              <Icon name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title:     { color: colors.text, fontSize: 24, fontWeight: "900" },
  centered:  { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

  scoreBadge: {
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.32)",
    alignSelf: "flex-start",
  },
  scoreBadgeText: { color: colors.text, fontWeight: "900", fontSize: 13 },
  scoreBadgeRiskText: { fontWeight: "900" },

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
});