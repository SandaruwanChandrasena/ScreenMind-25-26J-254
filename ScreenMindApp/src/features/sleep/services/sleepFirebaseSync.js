import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFirestore, doc, setDoc } from '@react-native-firebase/firestore';

import { getDB } from './db';
import { getSessionSummary } from './sleepRepository';
import { computeDisruptionScore } from './sleepScoring';

const SYNC_STORAGE_PREFIX = '@screenmind_sleep_synced_sessions_v1:';

async function exec(db, sql, params = []) {
  const res = await db.executeSql(sql, params);
  return res[0];
}

async function getCurrentFirebaseUserId() {
  try {
    return (await AsyncStorage.getItem('current_user_id')) || 'test_user_123';
  } catch (e) {
    return 'test_user_123';
  }
}

function getSyncedStorageKey(userId) {
  return `${SYNC_STORAGE_PREFIX}${userId}`;
}

async function readSyncedSessionIds(userId) {
  try {
    const raw = await AsyncStorage.getItem(getSyncedStorageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function markSessionSynced(userId, sessionId) {
  const storageKey = getSyncedStorageKey(userId);
  const sessionKey = String(sessionId);
  const ids = new Set(await readSyncedSessionIds(userId));
  ids.add(sessionKey);
  await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
}

async function getCompletedSleepSessions() {
  const db = await getDB();
  const rs = await exec(
    db,
    `SELECT id
     FROM sleep_sessions
     WHERE end_time IS NOT NULL
     ORDER BY end_time ASC;`,
    []
  );

  const sessions = [];
  for (let i = 0; i < rs.rows.length; i++) {
    sessions.push(rs.rows.item(i));
  }
  return sessions;
}

function buildSleepSessionPayload(summary, riskResult) {
  return {
    sessionId: String(summary.sessionId),
    localSessionId: summary.sessionId,
    startTime: summary.start,
    endTime: summary.end,
    durationMs: summary.durationMs,
    unlockCount: summary.unlockCount,
    screenOnCount: summary.screenOnCount,
    notifCount: summary.notifCount,
    nightNotifCount: summary.nightNotifCount ?? 0,
    socialNotifCount: summary.socialNotifCount ?? 0,
    chargingStartTime: summary.chargingStartTime ?? null,
    snoringTotalMinutes: summary.snoringTotalMinutes ?? 0,
    checkIn: summary.checkIn ?? null,
    sleepScore: riskResult.score,
    sleepRisk: riskResult.risk,
    sleepReasons: riskResult.reasons || [],
    sleepBreakdown: riskResult.breakdown || {},
    sleepComponents: riskResult.components || {},
    syncedAt: Date.now(),
    dataSource: 'local-sqlite',
  };
}

export async function syncSleepSessionToFirebase(sessionId) {
  const userId = await getCurrentFirebaseUserId();
  const summary = await getSessionSummary(sessionId);

  if (!summary) {
    return { success: false, reason: 'missing-summary' };
  }

  const riskResult = computeDisruptionScore(summary);
  const payload = buildSleepSessionPayload(summary, riskResult);
  const firestoreDb = getFirestore(getApp());
  const docId = `sleep_session_${sessionId}`;

  await setDoc(
    doc(firestoreDb, 'users', userId, 'sleep_sessions', docId),
    payload,
    { merge: true }
  );

  await markSessionSynced(userId, sessionId);

  return {
    success: true,
    firebaseId: docId,
  };
}

export async function syncPendingSleepSessionsToFirebase() {
  const userId = await getCurrentFirebaseUserId();
  const syncedIds = new Set(await readSyncedSessionIds(userId));
  const completedSessions = await getCompletedSleepSessions();

  const results = [];

  for (const session of completedSessions) {
    const sessionId = String(session.id);
    if (syncedIds.has(sessionId)) {
      continue;
    }

    try {
      const result = await syncSleepSessionToFirebase(session.id);
      results.push({ sessionId: session.id, ...result });
    } catch (e) {
      results.push({
        sessionId: session.id,
        success: false,
        error: e?.message || 'sync-failed',
      });
    }
  }

  return {
    uploaded: results.filter(item => item.success).length,
    failed: results.filter(item => !item.success).length,
    results,
  };
}