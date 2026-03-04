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

const SLEEP_TRACKED_PACKAGES = [
  "com.whatsapp",
  "com.facebook.katana",
  "com.instagram.android",
  "com.zhiliaoapp.musically",
  "com.twitter.android",
  "com.snapchat.android",
  "org.telegram.messenger",
  "com.google.android.youtube",
];

function isSocialMedia(packageName) {
  return SLEEP_TRACKED_PACKAGES.includes(packageName);
}

export async function handleSleepNotification(parsed) {
  try {
    const packageName = parsed?.app ?? null;
    const title = parsed?.title ?? null;
    const ts = parsed?.time
      ? parseInt(parsed.time)
      : Date.now();

    // ── Load user's personal sleep schedule ──
    const settings = await loadSleepSchedule();

    // ── Check against USER'S night window ──
    const night = isWithinNightWindow(ts, settings);
    const socialMedia = isSocialMedia(packageName);

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