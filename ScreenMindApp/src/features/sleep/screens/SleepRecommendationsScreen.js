import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import DashboardBackground from '../../../components/DashboardBackground';
import PrimaryButton from '../../../components/PrimaryButton';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

import {
  getLatestCompletedSession,
  getSessionSummary,
  getLast7Sessions,
} from '../services/sleepRepository';

import { generateRecommendations, getPriorityLabel, getPriorityColor } from '../services/sleepRecommendations';
import { computeDisruptionScore } from '../services/sleepScoring';

// ─── Sub-components ─────────────────────────────────────────────────────────

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function RecommendationCard({ recommendation }) {
  const bgColor = getPriorityColor(recommendation.priority);
  const alpha = { high: '33', important: '22', suggestion: '11' }[recommendation.priority];

  return (
    <Card style={{
      borderLeftWidth: 4,
      borderLeftColor: bgColor,
      marginVertical: spacing.sm,
    }}>
      {/* Header with icon and title */}
      <View style={styles.recHeader}>
        <Text style={styles.recIcon}>{recommendation.icon}</Text>
        <Text style={styles.recTitle}>{recommendation.title}</Text>
      </View>

      {/* Description */}
      <Text style={styles.recDescription}>{recommendation.description}</Text>

      {/* Detail/science */}
      <Text style={styles.recDetail}>{recommendation.detail}</Text>

      {/* Action item */}
      <View style={styles.actionBox}>
        <Text style={styles.actionLabel}>💡 Try this:</Text>
        <Text style={styles.actionText}>{recommendation.action}</Text>
      </View>

      {/* Data triggered */}
      <Text style={styles.dataTriggered}>Data: {recommendation.dataTriggered}</Text>
    </Card>
  );
}

function PriorityBadge({ priority }) {
  const label = getPriorityLabel(priority);
  const bgColor = getPriorityColor(priority);

  return (
    <View style={[styles.badge, { backgroundColor: bgColor + '33' }]}>
      <Text style={[styles.badgeText, { color: bgColor }]}>{label}</Text>
    </View>
  );
}

function SummaryStats({ summary, riskResult }) {
  const hours = (summary?.durationMs || 0) / (1000 * 60 * 60);

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={styles.sectionTitle}>📊 Last Night's Metrics</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{hours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Hours Slept</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary?.unlockCount || 0}</Text>
          <Text style={styles.statLabel}>Unlocks</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(summary?.socialNotifCount || 0)}</Text>
          <Text style={styles.statLabel}>Social Notifs</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{riskResult?.risk || 'Low'}</Text>
          <Text style={styles.statLabel}>Risk Level</Text>
        </View>
      </View>
    </Card>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function SleepRecommendationsScreen({ route, navigation }) {
  const userId = null;
  const passedSessionId = route?.params?.sessionId ?? null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [last7Sessions, setLast7Sessions] = useState([]);

  async function loadData() {
    setLoading(true);
    try {
      let sid = passedSessionId;

      // If no session ID passed, get latest completed session
      if (!sid) {
        const latest = await getLatestCompletedSession(userId);
        if (latest) {
          sid = latest.id;
        }
      }

      if (!sid) {
        Alert.alert('No Data', 'No sleep session found for recommendations.');
        setRecommendations([]);
        return;
      }

      // Load current session summary
      const currentSummary = await getSessionSummary(sid);
      if (currentSummary) {
        setSummary(currentSummary);

        // Compute risk result
        const risk = computeDisruptionScore(currentSummary);
        setRiskResult(risk);

        // Load last 7 sessions for trend analysis
        const last7 = await getLast7Sessions(userId);
        setLast7Sessions(last7 || []);

        // Generate recommendations
        const recs = generateRecommendations(currentSummary, last7 || [], risk);
        setRecommendations(recs);

        console.log(`✅ Loaded ${recs.length} recommendations`);
      }
    } catch (e) {
      console.log('Recommendations load error:', e);
      Alert.alert('Error', 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [passedSessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const highPriority = recommendations.filter(r => r.priority === 'high');
  const important = recommendations.filter(r => r.priority === 'important');
  const suggestions = recommendations.filter(r => r.priority === 'suggestion');

  return (
    <DashboardBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌙 Sleep Recommendations</Text>
          <Text style={styles.headerSub}>Personalized insights based on your sleep data</Text>
        </View>

        {/* Summary Stats */}
        {summary && <SummaryStats summary={summary} riskResult={riskResult} />}

        {/* High Priority Section */}
        {highPriority.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>🔴 High Priority</Text>
            {highPriority.map((rec, idx) => (
              <RecommendationCard key={`high-${idx}`} recommendation={rec} />
            ))}
          </View>
        )}

        {/* Important Section */}
        {important.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>🟡 Important</Text>
            {important.map((rec, idx) => (
              <RecommendationCard key={`important-${idx}`} recommendation={rec} />
            ))}
          </View>
        )}

        {/* Suggestions Section */}
        {suggestions.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>🟢 Suggestions</Text>
            {suggestions.map((rec, idx) => (
              <RecommendationCard key={`suggestion-${idx}`} recommendation={rec} />
            ))}
          </View>
        )}

        {/* Footer action */}
        {recommendations.length > 0 && (
          <Card style={{ marginTop: spacing.lg, backgroundColor: colors.bg2 }}>
            <Text style={styles.footerText}>
              💡 Start with the highest priority recommendations and track which changes improve your sleep quality most.
            </Text>
            <Text style={styles.footerSubText}>
              Fill out your morning check-in tomorrow to see the impact!
            </Text>
          </Card>
        )}

        {/* Refresh button */}
        <Pressable onPress={loadData} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>🔄 Refresh Recommendations</Text>
        </Pressable>
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  header: {
    marginBottom: spacing.lg,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  headerSub: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  card: {
    backgroundColor: colors.bg2,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Recommendation card specific */
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  recIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },

  recTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },

  recDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },

  recDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },

  actionBox: {
    backgroundColor: colors.bg1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary2,
    marginBottom: spacing.xs,
  },

  actionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },

  dataTriggered: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  statBox: {
    width: '48%',
    backgroundColor: colors.bg1,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.xs,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary2,
    marginBottom: spacing.xs,
  },

  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* Badge */
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Footer */
  footerText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },

  footerSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  refreshBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary2,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  refreshText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
