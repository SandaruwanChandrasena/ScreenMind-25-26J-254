// // src/features/sleep/services/notificationService.js

// import RNAndroidNotificationListener, { 
//   RNAndroidNotificationListenerHeadlessJsName 
// } from "react-native-android-notification-listener";
// import { logNotificationEvent } from "./sleepRepository";
// import { getActiveSleepSession } from "./sleepRepository";

// // Social media package names to track
// const SOCIAL_MEDIA_PACKAGES = [
//   "com.instagram.android",
//   "com.facebook.katana",
//   "com.whatsapp",
//   "com.twitter.android",
//   "com.zhiliaoapp.musically",    // TikTok
//   "com.snapchat.android",
//   "org.telegram.messenger",
//   "com.google.android.youtube",
// ];

// // This is the headless task handler
// // Called by the library when a notification arrives
// export const notificationHeadlessTask = async (notification) => {
//   try {
//     console.log("📱 Notification received:", notification);

//     // notification object contains:
//     // { app, title, text, time, packageName, ... }

//     const packageName = notification?.app ?? null;
//     const title = notification?.title ?? null;
//     const ts = notification?.time 
//       ? parseInt(notification.time) 
//       : Date.now();

//     // Check if sleep session is active
//     const activeSession = await getActiveSleepSession(null);
    
//     if (!activeSession) {
//       console.log("No active session, skipping notification log");
//       return;
//     }

//     // Check if it is night time (9PM - 9AM)
//     const hour = new Date(ts).getHours();
//     const isNightTime = hour >= 21 || hour < 9;

//     // Categorize the app
//     const isSocialMedia = SOCIAL_MEDIA_PACKAGES
//       .includes(packageName);

//     // Save to SQLite
//     await logNotificationEvent({
//       userId: null,
//       sessionId: activeSession.id,
//       packageName,
//       title,
//       ts,
//       isNight: isNightTime ? 1 : 0,
//       isSocialMedia: isSocialMedia ? 1 : 0,
//     });

//     console.log("✅ Notification saved:", {
//       packageName,
//       isNightTime,
//       isSocialMedia,
//       sessionId: activeSession.id,
//     });

//   } catch (e) {
//     console.log("❌ Notification headless task error:", e);
//   }
// };

// export { RNAndroidNotificationListenerHeadlessJsName };