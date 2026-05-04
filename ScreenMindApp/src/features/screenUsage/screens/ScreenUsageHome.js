import React, { useState, useCallback } from 'react';
import { getUsageStats } from '../services/usageStatsNative';
import { predictScreenlogRisk } from '../services/screenlogsApi';
import { extractUsageFeatures } from '../services/extractUsageFeatures';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

const STORAGE_KEY = 'screenUsageAssessments';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function getRiskColor(riskLevel = '') {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return '#ef4444';
    case 'medium':
    case 'moderate':
      return '#f59e0b';
    case 'low':
      return '#22c55e';
    default:
      return colors.muted;
  }
}

function getRiskLabel(riskLevel = '') {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return '⚠️ High Risk';
    case 'medium':
    case 'moderate':
      return '🔶 Moderate Risk';
    case 'low':
      return '✅ Low Risk';
    default:
      return '—';
  }
}

function getRecommendation(riskLevel = '') {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return 'Your result shows a high risk level. Try reducing long screen sessions, take regular breaks, and consider talking to a trusted person or professional if you feel overwhelmed.';
    case 'medium':
    case 'moderate':
      return 'Your result shows a moderate risk level. Try reducing repeated phone checking and maintain a more consistent daily usage routine.';
    case 'low':
      return 'Your result shows a low risk level. Continue maintaining healthy phone usage habits and regular daily routines.';
    default:
      return 'Complete an analysis to receive a personalized recommendation.';
  }
}

function getQuestionnaireScores(latest) {
  const phq9Raw =
    latest?.phq9?.score ??
    latest?.phq9?.total ??
    latest?.phq9?.totalScore ??
    latest?.phq9?.phq9Score ??
    latest?.result?.phq9?.score ??
    latest?.result?.phq9Score ??
    latest?.phq9Score ??
    0;

  const gad7Raw =
    latest?.gad7?.score ??
    latest?.gad7?.total ??
    latest?.gad7?.totalScore ??
    latest?.gad7?.gad7Score ??
    latest?.result?.gad7?.score ??
    latest?.result?.gad7Score ??
    latest?.gad7Score ??
    0;

  return {
    phq9Score: Number(phq9Raw) || 0,
    gad7Score: Number(gad7Raw) || 0,
  };
}

function ActionButton({ label, icon, onPress, disabled, loading }) {
  return (
    <Pressable
      style={[styles.gridBtn, disabled && styles.disabledBtn]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text style={styles.gridIcon}>{icon}</Text>
      <Text style={styles.gridText}>{loading ? 'Analyzing...' : label}</Text>
    </Pressable>
  );
}

export default function ScreenUsageHome({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadAssessment();
    }, []),
  );

  async function loadAssessment() {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list = safeJsonParse(raw, []);

      if (!list || list.length === 0) {
        navigation.replace('QuestionnaireScreen');
        return;
      }

      const last = list[0];
      const submitted = new Date(last.submittedAt).getTime();
      const now = Date.now();
      const diff = now - submitted;

      const remaining = Math.ceil(
        (TWO_WEEKS_MS - diff) / (1000 * 60 * 60 * 24),
      );

      setLatest(last);
      setDaysRemaining(Math.max(0, remaining));
      setAssessmentCount(list.length);
    } catch (err) {
      console.error('[ScreenUsageHome] loadAssessment error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handlePredict = async () => {
    try {
      setPredicting(true);
      setPrediction(null);

      const rawUsageData = await getUsageStats();
      const rawFeatures = extractUsageFeatures(rawUsageData);
      const { phq9Score, gad7Score } = getQuestionnaireScores(latest);

      const payload = {
        phq9_score: phq9Score,
        gad7_score: gad7Score,
        screen_time_dev: Number(rawFeatures?.screen_time_dev ?? 0),
        session_fragmentation: Number(rawFeatures?.session_fragmentation ?? 0),
        app_switching: Number(rawFeatures?.app_switching ?? 0),
        repeated_checking: Number(rawFeatures?.repeated_checking ?? 0),
        usage_irregularity: Number(rawFeatures?.usage_irregularity ?? 0),
      };

      console.log('[ScreenUsageHome] FINAL PAYLOAD:', payload);

      setLastPayload(payload);

      const result = await predictScreenlogRisk(payload);
      setPrediction(result);
    } catch (error) {
      console.error('[ScreenUsageHome] predict error:', error);
      Alert.alert(
        'Prediction Error',
        error?.message || 'Failed to analyze usage risk.',
      );
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={styles.loadingText}>Checking assessment...</Text>
      </View>
    );
  }

  if (!latest) return null;

  const lastDate = new Date(latest.submittedAt).toLocaleDateString();

  const riskLevel =
    latest?.result?.riskLevel ||
    latest?.result?.risk ||
    latest?.result?.overallRisk ||
    latest?.riskLevel ||
    latest?.risk ||
    latest?.overallRisk ||
    '';

  const isDue = daysRemaining === 0;
  const canViewDashboard = Boolean(prediction && lastPayload);

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Screen Mind</Text>
          <Text style={styles.headerSub}>Mental Health Risk Monitor</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {riskLevel ? (
        <View
          style={[styles.riskCard, { borderColor: getRiskColor(riskLevel) }]}
        >
          <Text style={styles.riskLabel}>Questionnaire Risk Level</Text>
          <Text style={[styles.riskValue, { color: getRiskColor(riskLevel) }]}>
            {getRiskLabel(riskLevel)}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.title}>Assessment History</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last assessment</Text>
          <Text style={styles.infoValue}>{lastDate}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total assessments</Text>
          <Text style={styles.infoValue}>{assessmentCount}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Next recommended</Text>
          <Text style={[styles.infoValue, isDue && { color: '#ef4444' }]}>
            {isDue ? 'Due now' : `In ${daysRemaining} days`}
          </Text>
        </View>

        <View style={styles.buttonGrid}>
          <ActionButton
            label="Analyze"
            icon="🧠"
            onPress={handlePredict}
            loading={predicting}
          />

          <ActionButton
            label="Dashboard"
            icon="📊"
            disabled={!canViewDashboard}
            onPress={() =>
              navigation.navigate('MentalHealthDashboard', {
                result: latest,
                prediction,
                payload: lastPayload,
              })
            }
          />

          <ActionButton
            label="Usage"
            icon="📱"
            onPress={() => navigation.navigate('TestUsage')}
          />

          <ActionButton
            label={isDue ? 'Retake Due' : 'Retake'}
            icon="🔁"
            onPress={() => navigation.navigate('QuestionnaireScreen')}
          />

          <ActionButton
            label="History"
            icon="📋"
            onPress={() => navigation.navigate('PredictionHistoryScreen')}
          />
        </View>

        {!canViewDashboard && (
          <Text style={styles.helperText}>
            Analyze usage risk first to unlock the dashboard.
          </Text>
        )}
      </View>

      {prediction && (
        <View style={styles.card}>
          <Text style={styles.title}>Prediction Result</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PHQ-9 score</Text>
            <Text style={styles.infoValue}>{lastPayload?.phq9_score ?? 0}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>GAD-7 score</Text>
            <Text style={styles.infoValue}>{lastPayload?.gad7_score ?? 0}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Final ML risk</Text>
            <Text
              style={[
                styles.infoValue,
                { color: getRiskColor(prediction.predicted_risk) },
              ]}
            >
              {getRiskLabel(prediction.predicted_risk)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confidence</Text>
            <Text style={styles.infoValue}>
              {(prediction.confidence * 100).toFixed(2)}%
            </Text>
          </View>

          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
            <Text style={styles.recommendationText}>
              {getRecommendation(prediction.predicted_risk)}
            </Text>
          </View>

          <View style={styles.factorSection}>
            <Text style={styles.infoLabel}>Top factors</Text>
            {prediction.top_factors?.map((factor, index) => (
              <Text key={index} style={styles.factorItem}>
                • {factor}
              </Text>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    backgroundColor: colors.bg1,
    padding: spacing.lg,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.muted,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 26,
    color: colors.text,
    fontWeight: '900',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 34,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  riskCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  riskLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  riskValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.lg,
  },
  gridBtn: {
    width: '48%',
    backgroundColor: 'rgba(124,58,237,0.85)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  gridIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  gridText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  disabledBtn: {
    opacity: 0.45,
  },
  helperText: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  factorSection: {
    marginTop: spacing.md,
  },
  factorItem: {
    color: colors.text,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  recommendationBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
  },
  recommendationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  recommendationText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});