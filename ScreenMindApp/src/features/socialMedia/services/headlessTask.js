import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PYTHON_BACKEND_URL } from '@env';

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
const BUFFER_SIZE = 5;
const BUFFER_KEY = 'sm_message_buffer';
const COOLDOWN_KEY = 'sm_alert_cooldown';
const OVERLAY_KEY = 'sm_overlay_trigger';
const HIGH_THRESHOLD = 0.7;
const MED_THRESHOLD = 0.4;

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
function printQueue(buffer, avgScore, riskLevel) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📬 MESSAGE QUEUE  [${buffer.length}/${BUFFER_SIZE} filled]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  buffer.forEach((item, index) => {
    const appName = APP_NAMES[item.app] || item.app;
    const emoji = sentimentEmoji(item.label);
    const score =
      typeof item.score === 'number' ? item.score.toFixed(2) : '0.00';
    console.log(
      `  [${index + 1}] ${appName.padEnd(10)} → "${item.text}"`.padEnd(55) +
        `${emoji} ${item.label} (${score})`,
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
// Saves to AsyncStorage → screen reads and shows overlay
// ─────────────────────────────────────────────
async function triggerOverlay(avgScore, riskLevel) {
  try {
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
    // 1️⃣ Parse
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

    // 4️⃣ Filter summaries
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

    // 7️⃣ Load & clean buffer
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    let buffer = raw ? JSON.parse(raw) : [];
    buffer = buffer.filter(
      item => item.score !== undefined && item.score !== null,
    );

    // 8️⃣ Sliding window
    buffer.push({
      app: pkg,
      text: cleanedText,
      label,
      score,
      time: new Date().toISOString(),
    });
    if (buffer.length > BUFFER_SIZE) buffer = buffer.slice(-BUFFER_SIZE);

    // 9️⃣ Save buffer
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));

    // Wait for full buffer
    if (buffer.length < BUFFER_SIZE) {
      console.log(`📥 Buffer filling: [${buffer.length}/${BUFFER_SIZE}]`);
      return;
    }

    // 🔟 Average score
    const validScores = buffer.map(item =>
      typeof item.score === 'number' ? item.score : 0,
    );
    const avgScore = validScores.reduce((sum, s) => sum + s, 0) / BUFFER_SIZE;
    console.log(
      `🔢 Scores: [${validScores.map(s => s.toFixed(2)).join(', ')}]`,
    );

    // 1️⃣1️⃣ Risk level
    let riskLevel = 'LOW';
    if (avgScore >= HIGH_THRESHOLD) riskLevel = 'HIGH';
    else if (avgScore >= MED_THRESHOLD) riskLevel = 'MODERATE';

    // 1️⃣2️⃣ Print queue
    printQueue(buffer, avgScore, riskLevel);

    // 1️⃣3️⃣ Trigger overlay only for HIGH + no cooldown
    if (riskLevel === 'HIGH') {
      const onCooldown = await isCooldownActive();
      if (!onCooldown) {
        await triggerOverlay(avgScore, riskLevel);
      }
    }

    // 1️⃣4️⃣ Save analysis
    await AsyncStorage.setItem(
      'latest_sm_analysis',
      JSON.stringify({
        buffer,
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
