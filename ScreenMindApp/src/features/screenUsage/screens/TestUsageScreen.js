import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';

import {
  getUsageStats,
  requestUsagePermission,
  hasUsagePermission,
} from '../services/usageStatsNative';

import { extractUsageFeatures } from '../services/extractUsageFeatures';

export default function TestUsageScreen() {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permGranted, setPermGranted] = useState(null);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);

  const checkPermission = async () => {
    const granted = await hasUsagePermission();
    setPermGranted(granted);
    console.log('[TestUsageScreen] Permission granted:', granted);
  };

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    setFeatures(null);

    try {
      const data = await getUsageStats();
      console.log('RAW USAGE DATA:', data);

      setIsMock(
        Platform.OS !== 'android' ||
          (Array.isArray(data) &&
            data.length > 0 &&
            data[0]?.packageName === 'com.instagram.android'),
      );

      const extracted = extractUsageFeatures(data);
      console.log('EXTRACTED FEATURES:', extracted);

      setFeatures(extracted);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch usage data. Please check permission again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.heading}>📱 Phone Usage Summary</Text>

      <View style={styles.row}>
        <Pressable onPress={requestUsagePermission} style={styles.btnSecondary}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>

        <Pressable onPress={checkPermission} style={styles.btnSecondary}>
          <Text style={styles.btnText}>Check Permission</Text>
        </Pressable>
      </View>

      {permGranted !== null && (
        <Text
          style={[
            styles.badge,
            { backgroundColor: permGranted ? '#065f46' : '#7f1d1d' },
          ]}
        >
          {permGranted ? '✅ Permission Granted' : '❌ Permission Not Granted'}
        </Text>
      )}

      <Pressable
        onPress={fetchUsage}
        style={styles.btnPrimary}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Load Today&apos;s Usage</Text>
        )}
      </Pressable>

      {isMock && features && (
        <View style={styles.mockBadge}>
          <Text style={styles.mockText}>
            🧪 Showing sample data. Real usage will load when Android Usage
            Access is available.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {features && (
        <View style={styles.card}>
          <Text style={styles.title}>📊 Today&apos;s Phone Usage</Text>

          <View style={styles.statGrid}>
            <StatItem
              label="Total Screen Time"
              value={`${features.totalScreenTimeMin ?? 0} min`}
            />
            <StatItem label="Apps Used" value={`${features.appCount ?? 0}`} />
            <StatItem
              label="App Changes"
              value={`${features.appSwitchingCount ?? 0}`}
            />
            <StatItem
              label="Short Checks"
              value={`${features.repeatedCheckingCount ?? 0}`}
            />
          </View>

          <Text style={[styles.title, { marginTop: 22 }]}>
            🧠 Usage Behavior
          </Text>

          <View style={styles.featureList}>
            <FeatureRow
              label="Screen Time Change"
              value={features.screen_time_dev}
              help="How much your screen time differs between apps."
            />
            <FeatureRow
              label="Frequent Short Sessions"
              value={features.session_fragmentation}
              help="How often you use the phone in short bursts."
            />
            <FeatureRow
              label="Switching Between Apps"
              value={features.app_switching}
              help="How often your usage moves between different apps."
            />
            <FeatureRow
              label="Repeated Phone Checking"
              value={features.repeated_checking}
              help="How often you quickly check the phone."
            />
            <FeatureRow
              label="Irregular Usage Pattern"
              value={features.usage_irregularity}
              help="How inconsistent today’s usage pattern is."
            />
          </View>

          <Text style={[styles.title, { marginTop: 22 }]}>
            📈 App Usage Chart
          </Text>

          <TopAppsChart apps={features.topApps ?? []} />
        </View>
      )}
    </ScrollView>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FeatureRow({ label, value, help }) {
  const safeValue = Number(value ?? 0);
  const percent = Math.round(safeValue * 100);

  return (
    <View style={styles.featureRow}>
      <View style={styles.featureHeader}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureValue}>{safeValue.toFixed(2)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>

      <Text style={styles.helpText}>{help}</Text>
    </View>
  );
}

function TopAppsChart({ apps = [] }) {
  const maxTime = Math.max(...apps.map(app => app.totalTimeMin || 0), 1);

  if (!apps.length) {
    return <Text style={styles.emptyText}>No app usage data available.</Text>;
  }

  return (
    <View style={styles.chartBox}>
      {apps.map((app, index) => {
        const widthPercent = Math.max(
          8,
          Math.round(((app.totalTimeMin || 0) / maxTime) * 100),
        );

        return (
          <View key={app.packageName ?? index} style={styles.chartRow}>
            <Text style={styles.chartLabel}>{app.appName || 'Unknown App'}</Text>

            <View style={styles.chartTrack}>
              <View style={[styles.chartFill, { width: `${widthPercent}%` }]} />
            </View>

            <Text style={styles.chartValue}>{app.totalTimeMin ?? 0} min</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#001827',
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#6d28d9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
    minWidth: 220,
    alignSelf: 'center',
  },
  btnSecondary: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    flex: 1,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
    color: '#fff',
    fontWeight: '800',
  },
  mockBadge: {
    backgroundColor: '#1e293b',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  mockText: {
    color: '#f59e0b',
    fontSize: 12,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  card: {
    width: '100%',
    marginTop: 10,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    backgroundColor: '#03182c',
    borderRadius: 10,
    padding: 12,
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#a78bfa',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    backgroundColor: '#03182c',
    borderRadius: 12,
    padding: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featureLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  featureValue: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 999,
  },
  helpText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 7,
    lineHeight: 15,
  },
  chartBox: {
    gap: 14,
  },
  chartRow: {
    marginBottom: 4,
  },
  chartLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  chartTrack: {
    height: 10,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    overflow: 'hidden',
  },
  chartFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 999,
  },
  chartValue: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});