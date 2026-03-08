import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import DashboardBackground from '../../../components/DashboardBackground';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

import SMPieSummary from '../components/SMPieSummary';
import SMActionCard from '../components/SMActionCard';
import SMRiskBadge from '../components/SMRiskBadge';
import SMSectionTitle from '../components/SMSectionTitle';
import SMMetricsGrid from '../components/SMMetricsGrid';

import { SM_ROUTES } from '../utils/sm.constants';
import { fetchDailySummary } from '../services/smFirebase.service';

// ── App package → display name ─────────────────────────────────
const APP_NAMES = {
  'com.whatsapp': 'WhatsApp',
  'com.facebook.katana': 'Facebook',
  'com.instagram.android': 'Instagram',
  'com.zhiliaoapp.musically': 'TikTok',
};

// ── Local date string (avoids UTC offset bug) ──────────────────
function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Get top app from appCounts map ─────────────────────────────
function getTopApp(appCounts = {}) {
  const entries = Object.entries(appCounts);
  if (entries.length === 0) return 'None';
  const top = entries.sort((a, b) => b[1] - a[1])[0];
  return APP_NAMES[top[0]] || top[0];
}

export default function SMHomeScreen({ navigation }) {
  const [loadingKey, setLoadingKey] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const toggleColor = showDetails
    ? 'rgba(123,77,255,0.85)'
    : 'rgba(0,224,255,0.85)';

  // ── Load today's data from Firebase ──────────────────────────
  const loadTodayData = async () => {
    try {
      setDataLoading(true);
      const todayStr = getLocalDateStr(); // ✅ local date, no UTC bug
      const data = await fetchDailySummary(todayStr);
      setTodayData(data);
    } catch (e) {
      console.log('❌ SMHomeScreen load error:', e);
    } finally {
      setDataLoading(false);
    }
  };

  // ── Reload every time screen comes into focus ─────────────────
  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, []),
  );

  useEffect(() => {
    const unsub = navigation.addListener('blur', () => setLoadingKey(null));
    return unsub;
  }, [navigation]);

  const go = (key, route) => {
    setLoadingKey(key);
    setTimeout(() => navigation.navigate(route), 280);
  };

  // ── Derive display values from todayData ──────────────────────
  const riskLevel = todayData?.riskLevel || 'LOW';
  const avgScore = todayData?.avgScore || 0;
  const negCount = todayData?.negativeCount || 0;
  const posCount = todayData?.positiveCount || 0;
  const neuCount = todayData?.neutralCount || 0;
  const totalCount = todayData?.totalCount || 0;
  const topApp = getTopApp(todayData?.appCounts);
  const dissonance = todayData?.dissonanceCount || 0;

  const riskHint =
    riskLevel === 'HIGH'
      ? 'High negative exposure detected today. Take a break.'
      : riskLevel === 'MODERATE'
      ? 'Mood signal and response patterns show moderate risk today.'
      : totalCount === 0
      ? 'No messages analyzed yet today.'
      : 'Your emotional environment looks healthy today.';

  // ── 6 Metrics for grid view ───────────────────────────────────
  const metrics = [
    {
      label: 'Sentiment',
      value: totalCount > 0 ? `${Math.round(avgScore * 100)}%` : '--',
      sub: 'Avg risk score',
      tint: 'rgba(124,58,237,0.25)',
    },
    {
      label: 'Negative',
      value: negCount.toString(),
      sub: 'Msgs detected',
      tint: 'rgba(239,68,68,0.18)',
    },
    {
      label: 'Positive',
      value: posCount.toString(),
      sub: 'Msgs detected',
      tint: 'rgba(34,197,94,0.18)',
    },
    {
      label: 'Top App',
      value: topApp,
      sub: 'Most active',
      tint: 'rgba(14,165,233,0.22)',
    },
    {
      label: 'Total Msgs',
      value: totalCount.toString(),
      sub: 'Analyzed today',
      tint: 'rgba(251,191,36,0.18)',
    },
    {
      label: 'Dissonance',
      value: dissonance.toString(),
      sub: 'Emoji conflicts',
      tint: 'rgba(217,70,239,0.18)',
    },
  ];

  // ── Pie chart data ────────────────────────────────────────────
  const pieData =
    totalCount > 0
      ? [
          { label: 'Negative', value: negCount, color: 'rgba(239,68,68,0.80)' },
          { label: 'Positive', value: posCount, color: 'rgba(34,197,94,0.80)' },
          { label: 'Neutral', value: neuCount, color: 'rgba(14,165,233,0.75)' },
        ].filter(d => d.value > 0)
      : [{ label: 'No Data', value: 1, color: 'rgba(255,255,255,0.12)' }];

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>SOCIAL MEDIA</Text>
        <Text style={styles.title}>Mental State Analyzer</Text>
        <Text style={styles.sub}>
          This module summarizes emotional exposure, social withdrawal, and
          interaction signals.
        </Text>

        {/* ── Risk Badge ─────────────────────────────────────────── */}
        {dataLoading ? (
          <View style={styles.loadingBadge}>
            <Text style={styles.loadingText}>⏳ Loading today's risk...</Text>
          </View>
        ) : (
          <SMRiskBadge level={riskLevel} hint={riskHint} />
        )}

        {/* ── Quick Metrics header + toggle ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <SMSectionTitle
              title="Quick Metrics"
              subtitle={showDetails ? 'Detailed view' : 'Summary view'}
            />
          </View>
          <Pressable
            onPress={() => setShowDetails(p => !p)}
            style={({ pressed }) => [
              styles.toggleBtn,
              { borderColor: toggleColor, shadowColor: toggleColor },
              pressed && { opacity: 0.9 },
            ]}
            hitSlop={12}
          >
            <Icon
              name={showDetails ? 'list-outline' : 'pie-chart-outline'}
              size={20}
              color={toggleColor}
            />
          </Pressable>
        </View>

        {/* ── Toggle: pie chart ↔ metrics grid ───────────────────── */}
        {showDetails ? (
          <SMMetricsGrid metrics={metrics} />
        ) : (
          <SMPieSummary
            title="Sentiment Breakdown"
            subtitle={
              totalCount > 0
                ? `${totalCount} messages analyzed today`
                : 'No messages analyzed yet'
            }
            score={totalCount > 0 ? Math.round(avgScore * 100) : 0}
            scoreLabel="Risk %"
            data={pieData}
          />
        )}

        {/* ── Last updated ───────────────────────────────────────── */}
        {todayData?.lastTimestamp && (
          <Text style={styles.lastUpdated}>
            🕒 Last activity:{' '}
            {new Date(todayData.lastTimestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}

        {/* ── Actions ────────────────────────────────────────────── */}
        <SMSectionTitle
          title="Actions"
          subtitle="Explore each analysis pillar."
        />
        <SMActionCard
          title="Notification Analysis"
          emoji="🔔"
          glow="rgba(0,224,255,0.50)"
          loading={loadingKey === 'notif'}
          onPress={() => go('notif', SM_ROUTES.Notification)}
        />

        <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
          <SMActionCard
            title="Daily Journal"
            emoji="📝"
            glow="rgba(123,77,255,0.55)"
            loading={loadingKey === 'journal'}
            onPress={() => go('journal', SM_ROUTES.Journal)}
          />
          <SMActionCard
            title="History"
            emoji="📊"
            glow="rgba(59,130,246,0.55)"
            loading={loadingKey === 'history'}
            onPress={() => go('history', SM_ROUTES.History)}
          />
          <SMActionCard
            title="Privacy & Ethics"
            emoji="🔒"
            glow="rgba(255,184,0,0.50)"
            loading={loadingKey === 'privacy'}
            onPress={() => go('privacy', SM_ROUTES.Privacy)}
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: '900', letterSpacing: 2.5 },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  sub: {
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },

  loadingBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: { color: colors.faint, fontSize: 13 },

  lastUpdated: {
    color: colors.faint,
    fontSize: 11,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
