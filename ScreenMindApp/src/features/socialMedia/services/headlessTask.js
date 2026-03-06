import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PYTHON_BACKEND_URL } from '@env';
import { NativeModules } from 'react-native';

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
const MAX_BUFFER_SIZE = 20; // store up to 20 messages, filter by time
const HIGH_THRESHOLD = 0.7;
const MED_THRESHOLD = 0.4;

// Default settings (used if user hasn't customized)
const DEFAULT_TIME_WINDOW_MINS = 10; // messages older than this are expired
const DEFAULT_MIN_MESSAGES = 3; // minimum messages needed to trigger alert

// ─────────────────────────────────────────────
// ✅ LOAD USER SETTINGS
// Reads timeWindowMins and negativeCount from UI settings
// ─────────────────────────────────────────────
async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw)
      return {
        timeWindowMins: DEFAULT_TIME_WINDOW_MINS,
        minMessages: DEFAULT_MIN_MESSAGES,
      };
    const saved = JSON.parse(raw);
    return {
      timeWindowMins: saved.timeWindowMins || DEFAULT_TIME_WINDOW_MINS,
      minMessages: saved.negativeCount || DEFAULT_MIN_MESSAGES,
    };
  } catch (e) {
    return {
      timeWindowMins: DEFAULT_TIME_WINDOW_MINS,
      minMessages: DEFAULT_MIN_MESSAGES,
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
async function analyzeOneMessage(cleanedText, appSource) {
  try {
    const response = await axios.post(
      `${PYTHON_BACKEND_URL}/api/v1/social-media/analyze`,
      {
        user_id: 'test_user_123',
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
      `  [${index + 1}] ${appName.padEnd(10)} → "${item.text}"`.padEnd(55) +
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
// 1. Calls native OverlayModule → shows over ALL apps
// 2. Also saves to AsyncStorage → shows inside app (fallback)
// ─────────────────────────────────────────────
async function triggerOverlay(avgScore, riskLevel) {
  try {
    // ✅ Native system overlay — works outside app
    const { OverlayModule } = NativeModules;
    if (OverlayModule) {
      OverlayModule.showOverlay(avgScore);
      console.log(
        `🚨 Native overlay shown → ${riskLevel} (${avgScore.toFixed(2)})`,
      );
    } else {
      console.log(
        '⚠️ OverlayModule not available — falling back to AsyncStorage',
      );
    }

    // ✅ AsyncStorage fallback — shows inside app
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
      `📲 Overlay trigger saved → ${riskLevel} (${avgScore.toFixed(2)})`,
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
    // 1️⃣ Parse notification
    const parsed =
      typeof notification === 'string'
        ? JSON.parse(notification)
        : notification;

    const pkg = parsed.app;
    const text = parsed.text || '';

    // 2️⃣ Whitelist check
    if (!SOCIAL_APP_WHITELIST.includes(pkg)) {
      console.log(`🚫 Ignored: ${pkg}`);
      return;
    }

    // 3️⃣ Sanitize
    const cleanedText = sanitizeText(text);
    if (!cleanedText) return;

    // 4️⃣ Filter summaries ("5 new messages" etc.)
    if (/^\d+\s+new\s+messages?$/i.test(cleanedText)) {
      console.log(`🚫 Filtered summary: "${cleanedText}"`);
      return;
    }

    const appName = APP_NAMES[pkg] || pkg;
    console.log(`✅ Accepted: [${appName}] → "${cleanedText}"`);

    // 5️⃣ Send to backend
    const result = await analyzeOneMessage(cleanedText, pkg);
    if (!result) return;

    // 6️⃣ Extract score
    const label = result.sentiment?.label || 'Neutral';
    const score = parseFloat(result.sentiment?.negative) / 100 || 0.0;
    console.log(`🔍 label=${label}, score=${score.toFixed(2)}`);

    // 7️⃣ Load settings from UI (timeWindowMins + minMessages)
    const { timeWindowMins, minMessages } = await loadSettings();
    const windowMs = timeWindowMins * 60 * 1000; // convert to milliseconds
    const cutoffTime = Date.now() - windowMs;

    // 8️⃣ Load full buffer from storage
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    let buffer = raw ? JSON.parse(raw) : [];

    // 9️⃣ Add new message to buffer
    buffer.push({
      app: pkg,
      text: cleanedText,
      label,
      score,
      time: new Date().toISOString(),
    });

    // 🔟 Trim buffer to MAX_BUFFER_SIZE (keep latest 20)
    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer = buffer.slice(-MAX_BUFFER_SIZE);
    }

    // 1️⃣1️⃣ Save full buffer back to storage
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));

    // 1️⃣2️⃣ Filter: only messages within the time window
    const activeBuffer = buffer.filter(item => {
      const msgTime = new Date(item.time).getTime();
      return msgTime >= cutoffTime && typeof item.score === 'number';
    });

    console.log(
      `🕒 Time window: ${timeWindowMins} mins | Active: ${activeBuffer.length} msgs | Min needed: ${minMessages}`,
    );

    // 1️⃣3️⃣ Not enough messages in window → skip
    if (activeBuffer.length < minMessages) {
      console.log(
        `📥 Not enough recent messages [${activeBuffer.length}/${minMessages}] — waiting...`,
      );
      return;
    }

    // 1️⃣4️⃣ Calculate average score from active window only
    const scores = activeBuffer.map(item => item.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    console.log(
      `🔢 Scores (active): [${scores.map(s => s.toFixed(2)).join(', ')}]`,
    );

    // 1️⃣5️⃣ Determine risk level
    let riskLevel = 'LOW';
    if (avgScore >= HIGH_THRESHOLD) riskLevel = 'HIGH';
    else if (avgScore >= MED_THRESHOLD) riskLevel = 'MODERATE';

    // 1️⃣6️⃣ Print queue
    printQueue(
      activeBuffer,
      buffer,
      avgScore,
      riskLevel,
      timeWindowMins,
      minMessages,
    );

    // 1️⃣7️⃣ Trigger overlay only for HIGH + no cooldown
    if (riskLevel === 'HIGH') {
      const onCooldown = await isCooldownActive();
      if (!onCooldown) {
        await triggerOverlay(avgScore, riskLevel);
      }
    }

    // 1️⃣8️⃣ Save latest analysis result
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

    console.log(
      `💾 Saved: risk_score=${avgScore.toFixed(2)}, level=${riskLevel}`,
    );
  } catch (error) {
    console.log('❌ Headless Task Error:', error);
  }
}
