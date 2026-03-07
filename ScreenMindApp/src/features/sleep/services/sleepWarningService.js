// src/features/sleep/services/sleepWarningService.js

import { NativeModules } from 'react-native';
import { loadSleepSchedule, isWithinNightWindow } from './sleepSettingsService';
import { getSessionSummary } from './sleepRepository';

const { SleepEventModule } = NativeModules;

const WARNING_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

let warningIntervalId = null;
let bedtimeReminderTimeoutId = null;
let lastWarningSentAt = null;

// ─────────────────────────────────────────────
// LATE NIGHT USAGE MONITOR
// ─────────────────────────────────────────────

export function startLateNightWarningMonitor(sessionId) {
  stopLateNightWarningMonitor();

  // Check every 5 minutes
  warningIntervalId = setInterval(async () => {
    try {
      await checkAndWarnIfLateNight(sessionId);
    } catch (e) {
      console.log('Late night check error:', e);
    }
  }, 5 * 60 * 1000);

  console.log('⏰ Late night warning monitor started');
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
  if (!isNight) return;

  // Cooldown — don't spam the user
  if (lastWarningSentAt && (now - lastWarningSentAt) < WARNING_COOLDOWN_MS) {
    return;
  }

  // Check if phone is being actively used
  const summary = await getSessionSummary(sessionId);
  if (!summary) return;

  const recentlyActive = (summary.unlockCount ?? 0) > 0;
  if (!recentlyActive) return;

  lastWarningSentAt = now;
  sendLateNightWarning(settings);
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
    if (SleepEventModule && typeof SleepEventModule.sendLocalNotification === 'function') {
      SleepEventModule.sendLocalNotification(title, message);
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