// src/features/sleep/services/sleepWarningService.js

import { NativeModules } from 'react-native';
import { loadSleepSchedule, isWithinNightWindow } from './sleepSettingsService';
import { getSessionSummary, isScreenCurrentlyOn } from './sleepRepository';

const { SleepEventModule } = NativeModules;

function getNotificationModule() {
  const eventModule = NativeModules?.SleepEventModule;
  if (eventModule && typeof eventModule.sendLocalNotification === 'function') {
    return eventModule;
  }

  const sensorModule = NativeModules?.SleepSensorModule;
  if (sensorModule && typeof sensorModule.sendLocalNotification === 'function') {
    return sensorModule;
  }

  return null;
}

// const WARNING_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_COOLDOWN_MS = 0;

let warningIntervalId = null;
let bedtimeReminderTimeoutId = null;
let lastWarningSentAt = null;

// ─────────────────────────────────────────────
// LATE NIGHT USAGE MONITOR
// ─────────────────────────────────────────────

export function startLateNightWarningMonitor(sessionId = null) {
  stopLateNightWarningMonitor();

  // Check every 5 minutes
  warningIntervalId = setInterval(async () => {
    try {
      await checkAndWarnIfLateNight(sessionId);
    } catch (e) {
      console.log('Late night check error:', e);
    }
  }, 10 * 1000);

  //  }, 5 * 60 * 1000);

  console.log('⏰ Late night warning monitor started', sessionId ? `(session ${sessionId})` : '(passive)');
}

export function stopLateNightWarningMonitor() {
  if (warningIntervalId) {
    clearInterval(warningIntervalId);
    warningIntervalId = null;
  }
}

async function checkAndWarnIfLateNight(sessionId) {
  const now = Date.now();
  const settings = await loadSleepSchedule();

  // Only warn during the user's night window
  const isNight = isWithinNightWindow(now, settings);
  // if (!isNight) return;

  // Cooldown — don't spam the user
  if (lastWarningSentAt && (now - lastWarningSentAt) < WARNING_COOLDOWN_MS) {
    return;
  }

  if (sessionId) {
    // Session active: use tracked data to send a smarter, specific warning
    const summary = await getSessionSummary(sessionId);
    if (!summary) return;

    const usingSocialMedia = (summary.socialNotifCount ?? 0) > 0;
    const recentlyActive = (summary.unlockCount ?? 0) > 0;

    if (!recentlyActive && !usingSocialMedia) return;

    lastWarningSentAt = now;

    if (usingSocialMedia) {
      sendSocialMediaWarning(settings);
    } else {
      sendLateNightWarning(settings);
    }
  } else {
    // No active session: foreground service keeps JS alive, so verify screen
    // state from SQLite before warning to avoid ghost notifications.
    const screenOn = await isScreenCurrentlyOn();
    if (!screenOn) return;

    lastWarningSentAt = now;
    sendLateNightWarning(settings);
  }
}

function sendSocialMediaWarning(settings) {
  const bedtimeStr = formatTime(settings.bedtimeHour, settings.bedtimeMinute);

  sendLocalNotification(
    '📵 Put the Phone Down',
    `You should be asleep by ${bedtimeStr}. Scrolling social media now will delay your sleep and reduce deep sleep quality.`
  );

  console.log('📳 Social media bedtime warning sent. Usual bedtime:', bedtimeStr);
}

function sendLateNightWarning(settings) {
  const bedtimeStr = formatTime(settings.bedtimeHour, settings.bedtimeMinute);

  sendLocalNotification(
    '😴 Time to Sleep',
    `You are usually asleep by ${bedtimeStr}. Late phone use reduces deep sleep tonight.`
  );

  console.log('📳 Late night warning sent. Usual bedtime:', bedtimeStr);
}

// ─────────────────────────────────────────────
// BEDTIME REMINDER (30 min before bedtime)
// ─────────────────────────────────────────────

export async function scheduleBedtimeReminder() {
  // Clear any existing reminder
  if (bedtimeReminderTimeoutId) {
    clearTimeout(bedtimeReminderTimeoutId);
    bedtimeReminderTimeoutId = null;
  }

  try {
    const settings = await loadSleepSchedule();

    // Calculate reminder time = bedtime minus 30 minutes
    let fireHour = settings.bedtimeHour;
    let fireMinute = settings.bedtimeMinute - 30;

    if (fireMinute < 0) {
      fireMinute += 60;
      fireHour = (fireHour - 1 + 24) % 24;
    }

    const now = new Date();
    const fireTime = new Date();
    fireTime.setHours(fireHour, fireMinute, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (fireTime.getTime() <= now.getTime()) {
      fireTime.setDate(fireTime.getDate() + 1);
    }

    const msUntilReminder = fireTime.getTime() - now.getTime();
    const minutesUntil = Math.round(msUntilReminder / 60000);

    bedtimeReminderTimeoutId = setTimeout(() => {
      const bedtimeStr = formatTime(
        settings.bedtimeHour,
        settings.bedtimeMinute
      );

      sendLocalNotification(
        '🌙 Bedtime Soon',
        `Your bedtime is at ${bedtimeStr}. Start winding down for better sleep.`
      );

      console.log('🌙 Bedtime reminder sent');

      // Reschedule for tomorrow
      scheduleBedtimeReminder();

    }, msUntilReminder);

    console.log(`⏰ Bedtime reminder scheduled in ${minutesUntil} minutes`);

  } catch (e) {
    console.log('Schedule bedtime reminder error:', e);
  }
}

// ─────────────────────────────────────────────
// SEND NOTIFICATION via native module
// ─────────────────────────────────────────────

function sendLocalNotification(title, message) {
  try {
    const notificationModule = getNotificationModule();
    if (notificationModule) {
      notificationModule.sendLocalNotification(title, message);
    } else {
      // Fallback: just log if native module not ready
      console.log(`[NOTIFICATION] ${title}: ${message}`);
    }
  } catch (e) {
    console.log('sendLocalNotification error:', e);
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatTime(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}