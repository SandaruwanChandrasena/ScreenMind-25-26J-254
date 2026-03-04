// src/features/sleep/services/sleepSettingsService.js

import { getDB } from "./db";

// Default values (9PM to 9AM)
const DEFAULTS = {
  bedtimeHour: 21,
  bedtimeMinute: 0,
  waketimeHour: 9,
  waketimeMinute: 0,
};

// In-memory cache so we don't hit DB every time
let cachedSettings = null;

/**
 * Save user's sleep schedule to database
 */
export async function saveSleepSchedule({
  userId = null,
  bedtimeHour,
  bedtimeMinute,
  waketimeHour,
  waketimeMinute,
}) {
  const db = await getDB();

  // Check if settings already exist
  const existing = await db.executeSql(
    `SELECT id FROM user_sleep_settings 
     WHERE user_id IS NULL LIMIT 1;`
  );

  if (existing[0].rows.length > 0) {
    // Update existing
    await db.executeSql(
      `UPDATE user_sleep_settings 
       SET bedtime_hour = ?,
           bedtime_minute = ?,
           waketime_hour = ?,
           waketime_minute = ?,
           updated_at = ?
       WHERE user_id IS NULL;`,
      [
        bedtimeHour,
        bedtimeMinute,
        waketimeHour,
        waketimeMinute,
        Date.now(),
      ]
    );
  } else {
    // Insert new
    await db.executeSql(
      `INSERT INTO user_sleep_settings
       (user_id, bedtime_hour, bedtime_minute,
        waketime_hour, waketime_minute, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        userId,
        bedtimeHour,
        bedtimeMinute,
        waketimeHour,
        waketimeMinute,
        Date.now(),
      ]
    );
  }

  // Update cache
  cachedSettings = {
    bedtimeHour,
    bedtimeMinute,
    waketimeHour,
    waketimeMinute,
  };

  console.log("✅ Sleep schedule saved:", cachedSettings);
  return cachedSettings;
}

/**
 * Load user's sleep schedule from database
 */
export async function loadSleepSchedule() {
  try {
    // Return cache if available
    if (cachedSettings) return cachedSettings;

    const db = await getDB();
    const rs = await db.executeSql(
      `SELECT * FROM user_sleep_settings 
       WHERE user_id IS NULL 
       ORDER BY updated_at DESC LIMIT 1;`
    );

    if (rs[0].rows.length === 0) {
      // No settings saved yet — return defaults
      return DEFAULTS;
    }

    const row = rs[0].rows.item(0);
    cachedSettings = {
      bedtimeHour: row.bedtime_hour,
      bedtimeMinute: row.bedtime_minute,
      waketimeHour: row.waketime_hour,
      waketimeMinute: row.waketime_minute,
    };

    return cachedSettings;

  } catch (e) {
    console.log("Load sleep schedule error:", e);
    return DEFAULTS;
  }
}

/**
 * Clear cache (call when settings update)
 */
export function clearSettingsCache() {
  cachedSettings = null;
}

/**
 * Check if a timestamp falls within user's night window
 * 
 * Handles overnight spans correctly
 * Example: bedtime 10PM, wake 7AM
 *   Night window crosses midnight
 *   11PM → night ✅
 *   3AM  → night ✅
 *   8AM  → not night ❌
 */
export function isWithinNightWindow(timestamp, settings) {
  const s = settings || DEFAULTS;

  const date = new Date(timestamp);
  const currentHour = date.getHours();
  const currentMinute = date.getMinutes();

  // Convert to minutes since midnight for easy comparison
  const currentMins = (currentHour * 60) + currentMinute;
  const bedtimeMins = (s.bedtimeHour * 60) + s.bedtimeMinute;
  const waketimeMins = (s.waketimeHour * 60) + s.waketimeMinute;

  // Night window crosses midnight (most common case)
  // Example: bedtime 22:00 (1320 mins), wake 07:00 (420 mins)
  if (bedtimeMins > waketimeMins) {
    return currentMins >= bedtimeMins || 
           currentMins < waketimeMins;
  }

  // Night window does not cross midnight (unusual)
  // Example: bedtime 01:00, wake 09:00
  return currentMins >= bedtimeMins && 
         currentMins < waketimeMins;
}

/**
 * Format hour and minute to display string
 * Example: formatTime(22, 30) → "10:30 PM"
 */
export function formatTime(hour, minute) {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = String(minute).padStart(2, "0");
  return `${displayHour}:${displayMin} ${period}`;
}

/**
 * Convert 12-hour picker value to 24-hour
 */
export function to24Hour(hour, minute, period) {
  let h = hour;
  if (period === "AM" && hour === 12) h = 0;
  if (period === "PM" && hour !== 12) h = hour + 12;
  return { hour: h, minute };
}

/**
 * Convert 24-hour to 12-hour picker value
 */
export function to12Hour(hour24, minute) {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour: hour12, minute, period };
}