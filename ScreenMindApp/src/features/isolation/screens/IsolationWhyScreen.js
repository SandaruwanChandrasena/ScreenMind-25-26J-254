/**
 * IsolationWhyScreen.js
 *
 * Shows the user WHY their isolation risk score is what it is.
 * Reasons come from the scoring engine (computeIsolationRisk → reasons[]).
 * Falls back to a helpful default message if no history exists yet.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

import { getDailyIsolationHistory } from "../services/isolationStorage";

// Risk-level → colour mapping
function riskColor(r) {
  if (r >= 0.7) return "#f87171"; // red
  if (r >= 0.4) return "#fbbf24"; // amber
  return "#4ade80";               // green
}

// Risk-level → short badge label
function riskBadge(r) {
  if (r >= 0.7) return "High";
  if (r >= 0.4) return "Medium";
  return "Low";
}

// ─── Fallback reasons when no data exists yet ────────────────────────────────
const PLACEHOLDER_REASONS = [
  {
    title:  "No data collected yet",
    detail: "Start background tracking from the Privacy screen to begin collecting mobility, communication, and behaviour signals.",
    risk:   0,
  },
  {
    title:  "Enable the features you're comfortable with",
    detail: "GPS mobility and phone usage data give the most accurate picture. Communication metadata (calls/SMS counts) is optional.",
    risk:   0,
  },
];

export default function IsolationWhyScreen() {
  const [reasons, setReasons]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [riskLabel, setRiskLabel] = useState("");
  const [riskScore, setRiskScore] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const history = await getDailyIsolationHistory();
        if (history.length > 0) {
          const latest = history[0]; // newest-first
          // Scoring engine now saves reasons[] in each daily record
          setReasons(latest.reasons?.length ? latest.reasons : PLACEHOLDER_REASONS);
          setRiskLabel(latest.riskLabel ?? latest.riskLevel ?? "");
          setRiskScore(latest.riskScore ?? null);
        } else {
          setReasons(PLACEHOLDER_REASONS);
        }
      } catch (e) {
        console.warn("IsolationWhyScreen load error:", e);
        setReasons(PLACEHOLDER_REASONS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Why this risk?</Text>
        <Text style={styles.sub}>
          Explainable factors that contributed to your isolation score.
        </Text>

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
                  Current score: {riskScore}/100 — {riskLabel}
                </Text>
              </View>
            )}

            <GlassCard
              icon="sparkles-outline"
              title="Top contributing factors"
              subtitle="Ranked by influence on your score"
              style={{ marginTop: spacing.lg }}
            >
              {reasons.map((r, i) => (
                <View key={r.title + i} style={[styles.item, i !== 0 && styles.borderTop]}>
                  {/* Risk indicator dot */}
                  <View style={styles.itemHeader}>
                    {r.risk > 0 && (
                      <View
                        style={[
                          styles.riskDot,
                          { backgroundColor: riskColor(r.risk) },
                        ]}
                      />
                    )}
                    <Text style={styles.itemTitle}>{r.title}</Text>

                    {r.risk > 0 && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: riskColor(r.risk) + "33", borderColor: riskColor(r.risk) + "66" },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: riskColor(r.risk) }]}>
                          {riskBadge(r.risk)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDetail}>{r.detail}</Text>
                </View>
              ))}
            </GlassCard>

            <Text style={styles.note}>
              Privacy: Only aggregated behavioural signals are analysed. No message content,
              call audio, or precise GPS trails are stored or uploaded.
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

  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

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

  item:     { paddingVertical: 12 },
  borderTop:{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },

  itemHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  riskDot:    { width: 8, height: 8, borderRadius: 4 },
  itemTitle:  { color: colors.text, fontWeight: "900", fontSize: 14, flex: 1 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "900" },

  itemDetail: { color: colors.faint, marginTop: 6, lineHeight: 18 },
  note:       { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16 },
});