import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule } = NativeModules;

const MOCK_USAGE_DATA = [
  { packageName: 'com.instagram.android', totalTimeInForeground: 42 * 60000 },
  { packageName: 'com.google.android.youtube', totalTimeInForeground: 38 * 60000 },
  { packageName: 'com.whatsapp', totalTimeInForeground: 25 * 60000 },
  { packageName: 'com.twitter.android', totalTimeInForeground: 18 * 60000 },
  { packageName: 'com.netflix.mediaclient', totalTimeInForeground: 55 * 60000 },
  { packageName: 'com.snapchat.android', totalTimeInForeground: 12 * 60000 },
  { packageName: 'com.reddit.frontpage', totalTimeInForeground: 20 * 60000 },
  { packageName: 'org.telegram.messenger', totalTimeInForeground: 15 * 60000 },
  { packageName: 'com.android.chrome', totalTimeInForeground: 30 * 60000 },
  { packageName: 'com.discord', totalTimeInForeground: 10 * 60000 },
  { packageName: 'com.facebook.katana', totalTimeInForeground: 8 * 60000 },
  { packageName: 'com.spotify.music', totalTimeInForeground: 22 * 60000 },
  { packageName: 'com.zhiliaoapp.musically', totalTimeInForeground: 35 * 60000 },
  { packageName: 'com.google.android.apps.messaging', totalTimeInForeground: 9 * 60000 },
];

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = now.getTime();
  return { start, end };
}

export async function getUsageStats() {
  try {
    if (Platform.OS !== 'android') {
      console.warn('[UsageStats] Not Android — using mock data');
      return MOCK_USAGE_DATA;
    }
    if (!UsageStatsModule) {
      console.warn('[UsageStats] UsageStatsModule not found — using mock data');
      return MOCK_USAGE_DATA;
    }
    const { start, end } = getTodayRange();
    const result = await UsageStatsModule.getUsageStats(start, end);
    console.log('[UsageStats] RAW native result count:', result?.length ?? 0);
    if (!Array.isArray(result) || result.length === 0) {
      console.warn('[UsageStats] Native returned empty — using mock data');
      return MOCK_USAGE_DATA;
    }
    const normalized = result.map(item => ({
      packageName: item.packageName,
      totalTimeInForeground: item.totalTimeInForeground ?? item.totalTimeMs ?? 0,
    }));
    return normalized;
  } catch (error) {
    console.error('[UsageStats] Error fetching native stats:', error);
    return MOCK_USAGE_DATA;
  }
}

export function requestUsagePermission() {
  if (Platform.OS !== 'android') return;
  if (!UsageStatsModule) {
    console.warn('[UsageStats] UsageStatsModule not available');
    return;
  }
  if (UsageStatsModule.openUsageAccessSettings) {
    UsageStatsModule.openUsageAccessSettings();
  } else if (UsageStatsModule.openUsageSettings) {
    UsageStatsModule.openUsageSettings();
  } else {
    console.warn('[UsageStats] No permission opener found');
  }
}

export async function hasUsagePermission() {
  try {
    if (Platform.OS !== 'android' || !UsageStatsModule) return false;
    return await UsageStatsModule.hasUsageAccess();
  } catch {
    return false;
  }
}

// ✅ Added: used by QuestionnaireScreen.js
export async function getUnlockCount() {
  try {
    if (Platform.OS !== 'android' || !UsageStatsModule) return 0;
    if (typeof UsageStatsModule.getUnlockCount === 'function') {
      return await UsageStatsModule.getUnlockCount();
    }
    return 0;
  } catch {
    return 0;
  }
}