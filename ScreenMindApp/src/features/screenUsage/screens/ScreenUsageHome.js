import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
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
      return '🔶 Medium Risk';
    case 'low':
      return '✅ Low Risk';
    default:
      return '—';
  }
}

export default function ScreenUsageHome({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);

  // Reload data every time the screen comes into focus
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

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={styles.loadingText}>Checking assessment...</Text>
      </View>
    );
  }

  const lastDate = new Date(latest.submittedAt).toLocaleDateString();
  const riskLevel = latest?.result?.riskLevel || latest?.riskLevel || '';
  const isDue = daysRemaining === 0;

  return (
    <ScrollView contentContainerStyle={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Screen Mind</Text>
        <Text style={styles.headerSub}>Mental Health Risk Monitor</Text>
      </View>

      {/* Risk Summary Card */}
      {riskLevel ? (
        <View
          style={[styles.riskCard, { borderColor: getRiskColor(riskLevel) }]}
        >
          <Text style={styles.riskLabel}>Current Risk Level</Text>
          <Text style={[styles.riskValue, { color: getRiskColor(riskLevel) }]}>
            {getRiskLabel(riskLevel)}
          </Text>
        </View>
      ) : null}

      {/* Assessment Info Card */}
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

        {/* Action Buttons */}
        <View style={styles.buttons}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              navigation.navigate('MentalHealthDashboard', { result: latest })
            }
          >
            <Text style={styles.btnText}>📊 View Dashboard</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('PredictionHistoryScreen')}
          >
            <Text style={styles.btnText}>📋 View History</Text>
          </Pressable>

          <Pressable
            style={[styles.outlineBtn, isDue && styles.outlineBtnDue]}
            onPress={() => navigation.navigate('QuestionnaireScreen')}
          >
            <Text style={styles.btnText}>
              {isDue ? '🔁 Retake Assessment (Due)' : '🔁 Retake Assessment'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Test Usage Data Button (dev helper) */}
      <Pressable
        style={styles.devBtn}
        onPress={() => navigation.navigate('TestUsage')}
      >
        <Text style={styles.devBtnText}>🧪 Test Usage Data</Text>
      </Pressable>
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
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
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
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  buttons: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: 'rgba(124,58,237,0.85)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(124,58,237,0.45)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.6)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  outlineBtnDue: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  btnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  devBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  devBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
});
