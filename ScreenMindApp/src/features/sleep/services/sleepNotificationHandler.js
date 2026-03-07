// // src/features/sleep/services/sleepNotificationHandler.js

// import { logNotificationEvent } from "./sleepRepository";
// import { getActiveSleepSession } from "./sleepRepository";

// // Apps to track for sleep disruption
// const SLEEP_TRACKED_PACKAGES = [
//   "com.whatsapp",
//   "com.facebook.katana",
//   "com.instagram.android",
//   "com.zhiliaoapp.musically",
//   "com.twitter.android",
//   "com.snapchat.android",
//   "org.telegram.messenger",
//   "com.google.android.youtube",
//   "com.facebook.orca",
//   "com.linkedin.android",
// ];

// function isSocialMedia(packageName) {
//   return SLEEP_TRACKED_PACKAGES.includes(packageName);
// }

// function isNightTime(timestamp) {
//   const hour = new Date(timestamp).getHours();
//   // Night = 9PM (21) to 9AM
//   return hour >= 21 || hour < 9;
// }

// export async function handleSleepNotification(parsed) {
//   try {
//     const packageName = parsed?.app ?? null;
//     const title = parsed?.title ?? null;
//     const ts = parsed?.time
//       ? parseInt(parsed.time)
//       : Date.now();

//     // Check if sleep session is active
//     const activeSession = await getActiveSleepSession(null);

//     if (!activeSession) {
//       // No active sleep session
//       // Still log if it is night time for analysis
//       const night = isNightTime(ts);
//       if (!night) return; // Not night, skip
//     }

//     const sessionId = activeSession?.id ?? null;
//     const night = isNightTime(ts);
//     const socialMedia = isSocialMedia(packageName);

//     // Save to SQLite
//     await logNotificationEvent({
//       userId: null,
//       sessionId,
//       packageName,
//       title,
//       ts,
//       isNight: night ? 1 : 0,
//       isSocialMedia: socialMedia ? 1 : 0,
//     });

//     console.log("😴 Sleep: notification saved →", {
//       packageName,
//       sessionId,
//       isNight: night,
//       isSocialMedia: socialMedia,
//     });

//   } catch (e) {
//     console.log("❌ Sleep notification handler error:", e);
//   }
// }
// src/features/sleep/services/sleepNotificationHandler.js

import { logNotificationEvent } from "./sleepRepository";
import { getActiveSleepSession } from "./sleepRepository";
import {
  loadSleepSchedule,
  isWithinNightWindow,
} from "./sleepSettingsService";

const SLEEP_TRACKED_PACKAGE_PREFIXES = [
  "com.whatsapp",
  "com.instagram.android",
  "com.zhiliaoapp.musically",
  "com.snapchat.android",
  "org.telegram.messenger",
  "com.google.android.youtube",
  "com.facebook.katana", // Facebook
  "com.facebook.lite",   // Facebook Lite
  "com.facebook.orca",   // Messenger
  "com.facebook.mlite",  // Messenger Lite
  "com.twitter.android", // X (Twitter)
];

function normalizePackageName(rawPackageName) {
  return String(rawPackageName || "").trim().toLowerCase();
}

function isSocialMedia(packageName) {
  const normalized = normalizePackageName(packageName);
  return SLEEP_TRACKED_PACKAGE_PREFIXES.some(prefix =>
    normalized === prefix || normalized.startsWith(`${prefix}:`)
  );
}

export async function handleSleepNotification(parsed) {
  try {
    const packageName = normalizePackageName(parsed?.app);
    const title = parsed?.title ?? null;
    const ts = parsed?.time
      ? parseInt(parsed.time)
      : Date.now();

    // ── Only track social media and messaging apps ──
    const socialMedia = isSocialMedia(packageName);
    
    if (!socialMedia) {
      console.log(`🚫 Ignored notification from: ${packageName} (not in tracked apps)`);
      return; // Don't save non-tracked apps
    }

    // ── Load user's personal sleep schedule ──
    const settings = await loadSleepSchedule();

    // ── Check against USER'S night window ──
    const night = isWithinNightWindow(ts, settings);

    const activeSession = await getActiveSleepSession(null);
    const sessionId = activeSession?.id ?? null;

    if (!night && !sessionId) {
      console.log("😴 Sleep: skipping — not in night window");
      return;
    }

    await logNotificationEvent({
      userId: null,
      sessionId,
      packageName,
      title,
      ts,
      isNight: night ? 1 : 0,
      isSocialMedia: socialMedia ? 1 : 0,
    });

    console.log("😴 Sleep notif saved →", {
      packageName,
      isNight: night,
      userBedtime: `${settings.bedtimeHour}:${settings.bedtimeMinute}`,
    });

  } catch (e) {
    console.log("❌ Sleep notification handler error:", e);
  }
}