import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PYTHON_BACKEND_URL } from '@env';
import { NativeModules } from 'react-native';

// ─────────────────────────────────────────────
// ✅ Local date string — fixes UTC timezone bug
// toISOString() returns UTC time which is wrong
// for Sri Lanka (UTC+5:30). This uses device local time.
// ─────────────────────────────────────────────
function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────
// ✅ Get current user ID from AsyncStorage
// ─────────────────────────────────────────────
async function getUserId() {
  try {
    const uid = await AsyncStorage.getItem('current_user_id');
    if (uid) {
      console.log(`👤 User ID from AsyncStorage: ${uid}`);
      return uid;
    }
    console.log('⚠️ No user ID in AsyncStorage — using test_user_123');
    return 'test_user_123';
  } catch (e) {
    return 'test_user_123';
  }
}

// ─────────────────────────────────────────────
// ✅ WHITELIST
// ─────────────────────────────────────────────
const SOCIAL_APP_WHITELIST = [
  'com.whatsapp',
  'com.facebook.katana',
  'com.instagram.android',
  'com.zhiliaoapp.musically',
];

const APP_NAMES = {
  'com.whatsapp': 'WhatsApp',
  'com.facebook.katana': 'Messenger',
  'com.instagram.android': 'Instagram',
  'com.zhiliaoapp.musically': 'TikTok',
};

// ─────────────────────────────────────────────
// ✅ CONSTANTS
// ─────────────────────────────────────────────
const BUFFER_KEY = 'sm_message_buffer';
const COOLDOWN_KEY = 'sm_alert_cooldown';
const OVERLAY_KEY = 'sm_overlay_trigger';
const SETTINGS_KEY = 'sm_alert_settings';
const MONITOR_APPS_KEY = 'sm_monitor_apps';
const MAX_BUFFER_SIZE = 20;
const HIGH_THRESHOLD = 0.7;
const MED_THRESHOLD = 0.4;

const DEFAULT_TIME_WINDOW_MINS = 10;
const DEFAULT_MIN_MESSAGES = 3;

const DEFAULT_MONITOR_APPS = {
  'com.whatsapp': true,
  'com.facebook.katana': false,
  'com.instagram.android': false,
  'com.zhiliaoapp.musically': false,
};

// ─────────────────────────────────────────────
// ✅ LOAD USER SETTINGS
// ─────────────────────────────────────────────
async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const monitorRaw = await AsyncStorage.getItem(MONITOR_APPS_KEY);
    const settings = raw ? JSON.parse(raw) : {};
    const monitorApps = monitorRaw
      ? JSON.parse(monitorRaw)
      : DEFAULT_MONITOR_APPS;
    return {
      timeWindowMins: settings.timeWindowMins || DEFAULT_TIME_WINDOW_MINS,
      minMessages: settings.negativeCount || DEFAULT_MIN_MESSAGES,
      alertHighRisk: settings.alertHighRisk !== false,
      monitorApps,
    };
  } catch (e) {
    return {
      timeWindowMins: DEFAULT_TIME_WINDOW_MINS,
      minMessages: DEFAULT_MIN_MESSAGES,
      monitorApps: DEFAULT_MONITOR_APPS,
    };
  }
}

// ─────────────────────────────────────────────
// ✅ PRIVACY FILTER
// ─────────────────────────────────────────────
function sanitizeText(raw = '') {
  let text = String(raw);
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
  text = text.replace(/(\+?\d[\d\s-]{7,}\d)/g, '[phone]');
  text = text.replace(/https?:\/\/\S+/gi, '[url]');
  return text.trim();
}

// ─────────────────────────────────────────────
// ✅ SEND ONE MESSAGE TO BACKEND
// ─────────────────────────────────────────────
async function analyzeOneMessage(cleanedText, appSource, userId) {
  try {
    const response = await axios.post(
      `${PYTHON_BACKEND_URL}/api/v1/social-media/analyze`,
      {
        user_id: userId,
        app_source: appSource,
        cleaned_text: cleanedText,
        timestamp: new Date().toISOString(),
      },
    );
    return response.data;
  } catch (error) {
    console.log('❌ Backend Error:', error.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// ✅ EMOJI HELPER
// ─────────────────────────────────────────────
function sentimentEmoji(label) {
  if (label === 'Negative') return '😡';
  if (label === 'Positive') return '😊';
  return '😐';
}

// ─────────────────────────────────────────────
// ✅ PRINT QUEUE
// ─────────────────────────────────────────────
function printQueue(
  activeBuffer,
  allBuffer,
  avgScore,
  riskLevel,
  timeWindowMins,
  minMessages,
) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    `📬 ACTIVE WINDOW  [${activeBuffer.length} msgs in last ${timeWindowMins} mins | min needed: ${minMessages}]`,
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  activeBuffer.forEach((item, index) => {
    const appName = APP_NAMES[item.app] || item.app;
    const emoji = sentimentEmoji(item.label);
    const score =
      typeof item.score === 'number' ? item.score.toFixed(2) : '0.00';
    const age = Math.round((Date.now() - new Date(item.time).getTime()) / 1000);
    console.log(
      `  [${index + 1}] ${appName.padEnd(10)} -> "${item.text}"`.padEnd(55) +
        `${emoji} ${item.label} (${score}) ${age}s ago`,
    );
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Average Risk Score : ${avgScore.toFixed(2)}`);
  console.log(`🎯 Risk Level         : ${riskLevel}`);
  if (riskLevel === 'HIGH') console.log('🚨 OVERLAY TRIGGERED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ─────────────────────────────────────────────
// ✅ CHECK COOLDOWN
// ─────────────────────────────────────────────
async function isCooldownActive() {
  try {
    const raw = await AsyncStorage.getItem(COOLDOWN_KEY);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    if (Date.now() < until) {
      const minsLeft = Math.ceil((until - Date.now()) / 60000);
      console.log(`⏳ Cooldown active — ${minsLeft} min(s) remaining`);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────
// ✅ TRIGGER OVERLAY
// ─────────────────────────────────────────────
async function triggerOverlay(avgScore, riskLevel) {
  try {
    const { OverlayModule } = NativeModules;
    if (OverlayModule) {
      OverlayModule.showOverlay(avgScore);
      console.log(
        `🚨 Native overlay shown -> ${riskLevel} (${avgScore.toFixed(2)})`,
      );
    } else {
      console.log(
        '⚠️ OverlayModule not available — falling back to AsyncStorage',
      );
    }
    await AsyncStorage.setItem(
      OVERLAY_KEY,
      JSON.stringify({
        show: true,
        risk_score: avgScore,
        risk_level: riskLevel,
        timestamp: new Date().toISOString(),
      }),
    );
    console.log(
      `📲 Overlay trigger saved -> ${riskLevel} (${avgScore.toFixed(2)})`,
    );
  } catch (e) {
    console.log('❌ Overlay trigger error:', e);
  }
}

// ─────────────────────────────────────────────
// ✅ MAIN HEADLESS TASK
// ─────────────────────────────────────────────
export default async function headlessTask({ notification }) {
  if (!notification) return;

  try {
    // 1 - Parse notification
    const parsed =
      typeof notification === 'string'
        ? JSON.parse(notification)
        : notification;

    const pkg = parsed.app;
    const text = parsed.text || '';

    // 2 - Whitelist check
    if (!SOCIAL_APP_WHITELIST.includes(pkg)) {
      console.log(`🚫 Ignored (not social): ${pkg}`);
      return;
    }

    // 2b - Load settings and user toggle check
    const { timeWindowMins, minMessages, monitorApps, alertHighRisk } =
      await loadSettings();
    if (monitorApps[pkg] === false) {
      console.log(`🔕 Ignored (monitoring OFF): ${APP_NAMES[pkg] || pkg}`);
      return;
    }

    // 2c - Get user ID
    const userId = await getUserId();

    // 3 - Sanitize
    const cleanedText = sanitizeText(text);
    if (!cleanedText) return;

    // 4 - Filter summaries
    if (/^\d+\s+new\s+messages?$/i.test(cleanedText)) {
      console.log(`🚫 Filtered summary: "${cleanedText}"`);
      return;
    }

    const appName = APP_NAMES[pkg] || pkg;
    console.log(`✅ Accepted: [${appName}] -> "${cleanedText}"`);

    // 5 - Send to backend
    const result = await analyzeOneMessage(cleanedText, pkg, userId);
    if (!result) return;

    // 6 - Extract score
    const label = result.sentiment?.label || 'Neutral';
    let score = parseFloat(result.sentiment?.negative) / 100 || 0.0;
    console.log(`🔍 label=${label}, score=${score.toFixed(2)}`);

    // 6b - Dissonance Override
    // Escalates score when emoji masking detected
    // Research: Felbo et al. (2017), Maity et al. (2022)
    const dissonance = result.dissonance;
    const dissonanceTypes = dissonance?.dissonance_types || [];
    const dissonanceDetected = dissonance?.dissonance_detected === true;
    const dissonanceRisk = dissonance?.risk_level || 'low';

    if (
      dissonanceDetected &&
      (dissonanceRisk === 'high' || dissonanceRisk === 'critical')
    ) {
      const oldScore = score;
      score = Math.max(score, 0.75);
      console.log(`⚠️ Dissonance override! ${dissonanceTypes.join(', ')}`);
      console.log(
        `   Score: ${oldScore.toFixed(2)} -> ${score.toFixed(2)} (escalated)`,
      );
      if (dissonanceRisk === 'critical') {
        score = 1.0;
        console.log('🚨 CRISIS signal -> score forced to 1.0');
      }
    }

    // 7 - Time window
    const windowMs = timeWindowMins * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;

    // 8 - Load buffer
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    let buffer = raw ? JSON.parse(raw) : [];

    // 9 - Deduplication
    // Android fires headless task twice for same notification
    const nowMs = Date.now();
    const isDuplicate = buffer.some(item => {
      const itemTime = new Date(item.time).getTime();
      return (
        item.text === cleanedText &&
        item.app === pkg &&
        Math.abs(nowMs - itemTime) < 5000
      );
    });

    if (isDuplicate) {
      console.log(`🔁 Duplicate skipped: "${cleanedText}"`);
      return;
    }

    buffer.push({
      app: pkg,
      text: cleanedText,
      label,
      score,
      time: new Date().toISOString(),
    });

    // 10 - Trim buffer
    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer = buffer.slice(-MAX_BUFFER_SIZE);
    }

    // 11 - Save buffer
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));

    // 12 - Filter to active window
    const activeBuffer = buffer.filter(item => {
      const msgTime = new Date(item.time).getTime();
      return msgTime >= cutoffTime && typeof item.score === 'number';
    });

    console.log(
      `🕒 Time window: ${timeWindowMins} mins | Active: ${activeBuffer.length} msgs | Min needed: ${minMessages}`,
    );

    // 13 - Not enough messages
    if (activeBuffer.length < minMessages) {
      console.log(
        `📥 Not enough recent messages [${activeBuffer.length}/${minMessages}] — waiting...`,
      );
      return;
    }

    // 14 - Calculate average score
    const scores = activeBuffer.map(item => item.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    console.log(
      `🔢 Scores (active): [${scores.map(s => s.toFixed(2)).join(', ')}]`,
    );

    // 15 - Determine risk level
    let riskLevel = 'LOW';
    if (avgScore >= HIGH_THRESHOLD) riskLevel = 'HIGH';
    else if (avgScore >= MED_THRESHOLD) riskLevel = 'MODERATE';

    // 16 - Print queue
    printQueue(
      activeBuffer,
      buffer,
      avgScore,
      riskLevel,
      timeWindowMins,
      minMessages,
    );

    // 17 - Trigger overlay if HIGH
    if (riskLevel === 'HIGH') {
      const onCooldown = await isCooldownActive();
      if (onCooldown) {
        console.log('⏳ Skipping overlay — cooldown active');
      } else if (!alertHighRisk) {
        console.log('🔕 Skipping overlay — Alert on High Risk is OFF');
      } else {
        await triggerOverlay(avgScore, riskLevel);
      }
    }

    // 18 - Save latest analysis to AsyncStorage
    await AsyncStorage.setItem(
      'latest_sm_analysis',
      JSON.stringify({
        activeBuffer,
        avg_score: avgScore,
        risk_level: riskLevel,
        timestamp: new Date().toISOString(),
        component: 'social_media',
      }),
    );

    // 19 - Save daily snapshot using LOCAL date (fixes UTC timezone bug)
    const todayKey = `sm_daily_${getLocalDateStr()}`;
    const existingRaw = await AsyncStorage.getItem(todayKey);
    const existing = existingRaw
      ? JSON.parse(existingRaw)
      : {
          date: getLocalDateStr(),
          negativeCount: 0,
          positiveCount: 0,
          neutralCount: 0,
          totalCount: 0,
          highRiskCount: 0,
          peakAvgScore: 0,
          lastRiskLevel: 'LOW',
          lastTimestamp: null,
        };

    const negCount = activeBuffer.filter(m => m.label === 'Negative').length;
    const posCount = activeBuffer.filter(m => m.label === 'Positive').length;
    const neuCount = activeBuffer.filter(m => m.label === 'Neutral').length;

    const snapshot = {
      ...existing,
      negativeCount: Math.max(existing.negativeCount, negCount),
      positiveCount: Math.max(existing.positiveCount, posCount),
      neutralCount: Math.max(existing.neutralCount, neuCount),
      totalCount: Math.max(existing.totalCount, activeBuffer.length),
      highRiskCount:
        riskLevel === 'HIGH'
          ? existing.highRiskCount + 1
          : existing.highRiskCount,
      peakAvgScore: Math.max(existing.peakAvgScore, avgScore),
      lastRiskLevel: riskLevel,
      lastTimestamp: new Date().toISOString(),
    };

    await AsyncStorage.setItem(todayKey, JSON.stringify(snapshot));

    console.log(
      `💾 Saved: risk_score=${avgScore.toFixed(2)}, level=${riskLevel}`,
    );
    console.log(`📅 Daily snapshot updated: ${todayKey}`);
  } catch (error) {
    console.log('❌ Headless Task Error:', error);
  }
}
