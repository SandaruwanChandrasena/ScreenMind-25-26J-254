import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export default function MentalHealthDashboard({ route, navigation }) {
  const result = route?.params?.result;
  const prediction = route?.params?.prediction;
  const payload = route?.params?.payload;

  const phqScore = payload?.phq9_score ?? result?.phq9?.score ?? 0;
  const gadScore = payload?.gad7_score ?? result?.gad7?.score ?? 0;

  const finalRisk =
    prediction?.predicted_risk ??
    result?.combinedRisk?.label ??
    result?.aiPrediction?.label ??
    '—';

  const confidence = prediction?.confidence ?? null;
  const badge = useMemo(() => getRiskBadge(finalRisk), [finalRisk]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mental Health Dashboard</Text>
        <Text style={styles.subtitle}>
          Your combined result from questionnaire answers and phone usage.
        </Text>

        <View style={[styles.mainCard, { borderColor: badge.color }]}>
          <Text style={styles.label}>Final Risk Level</Text>
          <Text style={[styles.mainRisk, { color: badge.color }]}>
            {getRiskLabel(finalRisk)}
          </Text>

          {confidence !== null && (
            <Text style={styles.confidence}>
              Confidence: {Math.round(confidence * 100)}%
            </Text>
          )}

          <Text style={styles.hint}>{badge.hint}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🧠 Questionnaire Scores</Text>

          <View style={styles.scoreRow}>
            <ScoreBox title="PHQ-9" value={phqScore} />
            <ScoreBox title="GAD-7" value={gadScore} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📱 Phone Usage Summary</Text>

          <InfoRow
            label="Screen time change"
            value={formatScore(payload?.screen_time_dev)}
          />
          <InfoRow
            label="Short usage sessions"
            value={formatScore(payload?.session_fragmentation)}
          />
          <InfoRow
            label="Repeated checking"
            value={formatScore(payload?.repeated_checking)}
          />

          <Text style={styles.summaryText}>
            These values help the system understand your phone usage behavior.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💡 Recommendation</Text>
          <Text style={styles.recommendation}>
            {getRecommendation(finalRisk)}
          </Text>
        </View>

        {prediction?.top_factors?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔍 Main Reasons</Text>

            {prediction.top_factors.slice(0, 2).map((factor, index) => (
              <Text key={index} style={styles.factorText}>
                • {factor}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('PredictionHistoryScreen')}
          >
            <Text style={styles.secondaryButtonText}>View History</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('QuestionnaireScreen')}
          >
            <Text style={styles.primaryButtonText}>Retake Check-in</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ScoreBox({ title, value }) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreTitle}>{title}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatScore(value) {
  return Number(value ?? 0).toFixed(2);
}

function getRiskLabel(risk = '') {
  const r = String(risk).toLowerCase();

  if (r.includes('high')) return '⚠️ High Risk';
  if (r.includes('moderate') || r.includes('medium')) return '🔶 Moderate Risk';
  if (r.includes('low')) return '✅ Low Risk';

  return '—';
}

function getRiskBadge(risk = '') {
  const r = String(risk).toLowerCase();

  if (r.includes('high')) {
    return {
      color: '#ef4444',
      hint: 'Your result shows a high risk level. Consider reducing screen use and talking to someone you trust.',
    };
  }

  if (r.includes('moderate') || r.includes('medium')) {
    return {
      color: '#f59e0b',
      hint: 'Some risk signs were detected. Small changes in phone habits may help.',
    };
  }

  return {
    color: '#22c55e',
    hint: 'Your result shows low risk. Keep maintaining healthy routines.',
  };
}

function getRecommendation(risk = '') {
  const r = String(risk).toLowerCase();

  if (r.includes('high')) {
    return 'Take regular breaks, reduce long phone sessions, and consider speaking with a trusted person if you feel overwhelmed.';
  }

  if (r.includes('moderate') || r.includes('medium')) {
    return 'Try reducing repeated phone checking and keep a more consistent daily routine.';
  }

  return 'Continue your current healthy usage habits and maintain regular daily routines.';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg1,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  mainCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainRisk: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  confidence: {
    color: colors.text,
    fontWeight: '800',
    marginTop: 8,
  },
  hint: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreTitle: {
    color: colors.muted,
    fontWeight: '800',
  },
  scoreValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    flex: 1,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '900',
  },
  summaryText: {
    color: colors.faint,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  recommendation: {
    color: colors.text,
    fontWeight: '700',
    lineHeight: 19,
  },
  factorText: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: 'rgba(124,58,237,0.85)',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '900',
  },
  backBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  backText: {
    color: colors.faint,
    fontWeight: '800',
  },
});