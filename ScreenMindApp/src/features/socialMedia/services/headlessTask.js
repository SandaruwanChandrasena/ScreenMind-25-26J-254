import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PYTHON_BACKEND_URL } from '@env';
import notifee, { AndroidImportance } from '@notifee/react-native';

// ─────────────────────────────────────────────
// ✅ WHITELIST — only these apps are monitored
// ─────────────────────────────────────────────
const SOCIAL_APP_WHITELIST = [
  'com.whatsapp',
  'com.facebook.katana',
  'com.instagram.android',
  'com.zhiliaoapp.musically',
];

// Friendly names for console output
const APP_NAMES = {
  'com.whatsapp': 'WhatsApp',
  'com.facebook.katana': 'Messenger',
  'com.instagram.android': 'Instagram',
  'com.zhiliaoapp.musically': 'TikTok',
};

// ─────────────────────────────────────────────
// ✅ SLIDING WINDOW BUFFER — size 5
// ─────────────────────────────────────────────
const BUFFER_SIZE = 5;
const BUFFER_KEY = 'sm_message_buffer';
const HIGH_THRESHOLD = 0.7; // above this = HIGH risk
const MED_THRESHOLD = 0.4; // above this = MODERATE risk

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
// ✅ SEND ONE MESSAGE TO ROBERTA BACKEND
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
    return response.data; // { sentiment: { label, score }, ... }
  } catch (error) {
    console.log('❌ Backend Error:', error.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// ✅ EMOJI HELPER for console output
// ─────────────────────────────────────────────
function sentimentEmoji(label) {
  if (label === 'Negative') return '😡';
  if (label === 'Positive') return '😊';
  return '😐';
}

// ─────────────────────────────────────────────
// ✅ PRINT QUEUE — clean console output
// ─────────────────────────────────────────────
function printQueue(buffer, avgScore, riskLevel) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📬 MESSAGE QUEUE  [${buffer.length}/${BUFFER_SIZE} filled]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  buffer.forEach((item, index) => {
    const appName = APP_NAMES[item.app] || item.app;
    const emoji = sentimentEmoji(item.label);
    const score =
      typeof item.score === 'number' ? item.score.toFixed(2) : '?.??';
    console.log(
      `  [${index + 1}] ${appName.padEnd(10)} → "${item.text}"`.padEnd(55) +
        `${emoji} ${item.label} (${score})`,
    );
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Average Risk Score : ${avgScore.toFixed(2)}`);
  console.log(`🎯 Risk Level         : ${riskLevel}`);
  if (riskLevel === 'HIGH') {
    console.log('🚨 WARNING SENT TO USER!');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ─────────────────────────────────────────────
// ✅ SEND WARNING NOTIFICATION TO USER
// ─────────────────────────────────────────────
async function sendWarningNotification(avgScore, riskLevel) {
  try {
    // Create notification channel (required for Android)
    await notifee.createChannel({
      id: 'screenmind_alerts',
      name: 'ScreenMind Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    const messages = {
      HIGH: {
        title: '⚠️ ScreenMind Alert',
        body: `High emotional stress detected (score: ${avgScore.toFixed(
          2,
        )}). Please take a break and breathe. 💙`,
      },
      MODERATE: {
        title: '🟡 ScreenMind Notice',
        body: `Moderate stress detected (score: ${avgScore.toFixed(
          2,
        )}). Consider stepping away for a moment. 😊`,
      },
    };

    const msg = messages[riskLevel];
    if (!msg) return; // LOW risk → no notification

    await notifee.displayNotification({
      title: msg.title,
      body: msg.body,
      android: {
        channelId: 'screenmind_alerts',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
      },
    });

    console.log(`📱 Notification sent: ${riskLevel}`);
  } catch (error) {
    console.log('❌ Notification Error:', error.message);
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

    // 3️⃣ Sanitize text
    const cleanedText = sanitizeText(text);
    if (!cleanedText) return;

    // ✅ Filter out WhatsApp summary notifications
    if (/^\d+\s+new\s+messages?$/i.test(cleanedText)) {
      console.log(`🚫 Filtered summary: "${cleanedText}"`);
      return;
    }

    const appName = APP_NAMES[pkg] || pkg;
    console.log(`✅ Accepted: [${appName}] → "${cleanedText}"`);

    // 4️⃣ Send ONE message to backend → get score
    const result = await analyzeOneMessage(cleanedText, pkg);
    if (!result) return;

    // 🔍 DEBUG — see exact backend response
    console.log('🔍 RAW RESULT:', JSON.stringify(result));

    const label = result.sentiment?.label || 'Neutral';
    const score = parseFloat(result.sentiment?.negative) / 100 || 0.0;

    console.log(`🔍 label=${label}, score=${score}`);

    // 5️⃣ Load existing buffer from AsyncStorage
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    let buffer = raw ? JSON.parse(raw) : [];

    // ✅ Clear any old buffer items that have no valid score
    buffer = buffer.filter(
      item => item.score !== undefined && item.score !== null,
    );

    // 6️⃣ Add new message to buffer (sliding window)
    buffer.push({
      app: pkg,
      text: cleanedText,
      label: label,
      score: score,
      time: new Date().toISOString(),
    });

    // Keep only LAST 5 messages (sliding window)
    if (buffer.length > BUFFER_SIZE) {
      buffer = buffer.slice(-BUFFER_SIZE); // drop oldest
    }

    // 7️⃣ Save updated buffer
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));

    // 8️⃣ Only analyze when buffer is full (5 messages)
    if (buffer.length < BUFFER_SIZE) {
      console.log(`📥 Buffer filling: [${buffer.length}/${BUFFER_SIZE}]`);
      return;
    }

    // 9️⃣ Calculate average risk score (safely handle undefined scores)
    const validScores = buffer.map(item =>
      typeof item.score === 'number' ? item.score : 0,
    );
    const avgScore = validScores.reduce((sum, s) => sum + s, 0) / BUFFER_SIZE;
    console.log(
      `🔢 Scores: [${validScores.map(s => s.toFixed(2)).join(', ')}]`,
    );

    // 🔟 Determine risk level
    let riskLevel = 'LOW';
    if (avgScore >= HIGH_THRESHOLD) riskLevel = 'HIGH';
    else if (avgScore >= MED_THRESHOLD) riskLevel = 'MODERATE';

    // 1️⃣1️⃣ Print clean queue to console
    printQueue(buffer, avgScore, riskLevel);

    // 1️⃣2️⃣ Send warning notification if HIGH or MODERATE
    if (riskLevel === 'HIGH' || riskLevel === 'MODERATE') {
      await sendWarningNotification(avgScore, riskLevel);
    }

    // 1️⃣3️⃣ Save analysis result to AsyncStorage (for dashboard)
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
      `💾 Saved to AsyncStorage: risk_score=${avgScore.toFixed(
        2,
      )}, level=${riskLevel}`,
    );
  } catch (error) {
    console.log('❌ Headless Task Error:', error);
  }
}
