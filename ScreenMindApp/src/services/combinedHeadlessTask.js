// // src/shared/services/combinedHeadlessTask.js

// import { handleSocialMediaNotification } 
//   from "../features/socialMedia/services/headlessTask";
// import { handleSleepNotification } 
//   from "../features/sleep/services/sleepNotificationHandler";

// /**
//  * COMBINED HEADLESS TASK
//  * 
//  * This is the single entry point for ALL notifications.
//  * It routes each notification to the correct component handler.
//  * 
//  * Component 1 (Social Media) → handleSocialMediaNotification
//  * Component 3 (Sleep)        → handleSleepNotification
//  */
// export default async function combinedHeadlessTask({ notification }) {
//   if (!notification) return;

//   try {
//     // Parse notification (library sends as string)
//     const parsed = typeof notification === "string"
//       ? JSON.parse(notification)
//       : notification;

//     console.log("📱 Combined task received:", parsed?.app);

//     // ── Run BOTH handlers in parallel ──
//     // Each handler decides independently what to do
//     await Promise.allSettled([
//       handleSocialMediaNotification(parsed),
//       handleSleepNotification(parsed),
//     ]);

//   } catch (error) {
//     console.log("❌ Combined headless task error:", error);
//   }
// }

import friendHeadlessTask
  from "../features/socialMedia/services/headlessTask";

import { handleSleepNotification }
  from "../features/sleep/services/sleepNotificationHandler";

export default async function combinedHeadlessTask(
  { notification }
) {
  if (!notification) return;

  try {
    console.log("📱 Combined task triggered");

    // ✅ Call friend's task exactly as registered before
    // Passes { notification } exactly as their function expects
    // Their code runs 100% unchanged internally
    await friendHeadlessTask({ notification });

    // ✅ Also run your sleep handler
    const parsed = typeof notification === "string"
      ? JSON.parse(notification)
      : notification;

    await handleSleepNotification(parsed);

  } catch (error) {
    console.log("❌ Combined task error:", error);
  }
}