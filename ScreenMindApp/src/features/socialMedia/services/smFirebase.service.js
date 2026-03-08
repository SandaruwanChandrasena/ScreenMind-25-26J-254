import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
// ✅ Get current user ID from AsyncStorage
// Saved by AuthContext on every login/app start
// ─────────────────────────────────────────────────────────────
export async function getCurrentUserId() {
  try {
    const uid = await AsyncStorage.getItem('current_user_id');
    if (uid) {
      console.log(`👤 User ID: ${uid}`);
      return uid;
    }
    console.log('⚠️ No user ID found — using test_user_123');
    return 'test_user_123';
  } catch (e) {
    return 'test_user_123';
  }
}

// ─────────────────────────────────────────────────────────────
// ✅ Fetch all social media analysis docs for a specific date
// ─────────────────────────────────────────────────────────────
export async function fetchDailySummary(dateStr) {
  try {
    const userId = await getCurrentUserId();
    const db = getFirestore(getApp());

    // Build LOCAL date range (Sri Lanka = UTC+5:30)
    const [year, month, day] = dateStr.split('-').map(Number);
    const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
    const startISO = startLocal.toISOString();
    const endISO = endLocal.toISOString();

    console.log(`📅 Querying Firebase: ${dateStr}`);
    console.log(`   Range: ${startISO} → ${endISO}`);
    console.log(`   Path: users/${userId}/social_media_analysis`);

    const colRef = collection(db, 'users', userId, 'social_media_analysis');
    const q = query(
      colRef,
      where('timestamp', '>=', startISO),
      where('timestamp', '<=', endISO),
      orderBy('timestamp', 'asc'),
    );

    const snapshot = await getDocs(q);
    console.log(`📊 Firebase returned ${snapshot.size} docs for ${dateStr}`);

    if (snapshot.empty) {
      console.log(`📭 No data found for ${dateStr}`);
      return null;
    }

    const docs = snapshot.docs.map(d => {
      const data = d.data();
      console.log(
        `  📄 label=${data.sentiment?.label} neg=${data.sentiment?.negative} ts=${data.timestamp}`,
      );
      return data;
    });

    // ── Aggregate ─────────────────────────────────────────────
    let negativeCount = 0,
      positiveCount = 0,
      neutralCount = 0;
    let totalScore = 0,
      peakScore = 0,
      highRiskCount = 0,
      dissonanceCount = 0;
    const appCounts = {};

    docs.forEach(doc => {
      const label = doc.sentiment?.label || 'Neutral';
      // Backend saves negative as 0-100 (e.g. 95.3) → convert to 0-1
      const negScore = parseFloat(doc.sentiment?.negative || 0) / 100;

      if (label === 'Negative') negativeCount++;
      else if (label === 'Positive') positiveCount++;
      else neutralCount++;

      totalScore += negScore;
      if (negScore > peakScore) peakScore = negScore;
      if (negScore >= 0.7) highRiskCount++;
      if (doc.dissonance?.dissonance_detected) dissonanceCount++;

      const app = doc.app_source || 'unknown';
      appCounts[app] = (appCounts[app] || 0) + 1;
    });

    const totalCount = docs.length;
    const avgScore = totalCount > 0 ? totalScore / totalCount : 0;
    const riskLevel =
      avgScore >= 0.7 ? 'HIGH' : avgScore >= 0.4 ? 'MODERATE' : 'LOW';
    const overallTone =
      totalCount === 0
        ? 'No Data'
        : riskLevel === 'HIGH'
        ? 'High Risk'
        : riskLevel === 'MODERATE'
        ? 'Moderate'
        : negativeCount > positiveCount
        ? 'Mostly Negative'
        : positiveCount > negativeCount
        ? 'Mostly Positive'
        : 'Mixed';

    console.log(
      `✅ ${dateStr}: ${overallTone} | neg=${negativeCount} pos=${positiveCount} avg=${avgScore.toFixed(
        2,
      )}`,
    );

    return {
      date: dateStr,
      overallTone,
      riskLevel,
      avgScore,
      peakScore,
      negativeCount,
      positiveCount,
      neutralCount,
      totalCount,
      highRiskCount,
      dissonanceCount,
      appCounts,
      lastTimestamp: docs[docs.length - 1]?.timestamp || null,
    };
  } catch (e) {
    console.log(`❌ Firebase fetch error for ${dateStr}:`, e.message);
    if (e.code) console.log(`   Error code: ${e.code}`);
    return null;
  }
}

export async function fetchWeeklySummaries(daysBack = 7) {
  const results = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')}`;
    const summary = await fetchDailySummary(dateStr);
    results.push({ dateStr, summary });
  }
  return results;
}
