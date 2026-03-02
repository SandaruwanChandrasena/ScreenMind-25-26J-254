// ✅ THE WHITELIST (Satisfies Panel Comment #1)
const SOCIAL_APP_WHITELIST = [
  "com.whatsapp",
  "com.facebook.katana",
  "com.instagram.android",
  "com.zhiliaoapp.musically"
];

// ✅ Privacy Filter: Removes personal info before AI processing
function sanitizeText(raw = "") {
  let text = String(raw);
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  text = text.replace(/(\+?\d[\d\s-]{7,}\d)/g, "[phone]");
  text = text.replace(/https?:\/\/\S+/gi, "[url]");
  return text.trim();
}

export default async function headlessTask({ notification }) {
  if (notification) {
    try {
      // The library sends a string, so we parse it into a JSON object
      const parsed = typeof notification === 'string' ? JSON.parse(notification) : notification;
      
      const pkg = parsed.app; // This is the ID of the app (e.g., com.whatsapp)
      const title = parsed.title || "";
      const text = parsed.text || "";

      // 1. THE WHITELIST LOGIC
      if (!SOCIAL_APP_WHITELIST.includes(pkg)) {
        console.log(`🚫 Ignored notification from: ${pkg}`);
        return; // Stop processing. Do not send to AI.
      }

      // 2. PROCESS SOCIAL NOTIFICATIONS
      const cleanedText = sanitizeText(text);
      if (!cleanedText) return;

      console.log(`✅ Accepted Social App: [${pkg}]`);
      console.log(`📩 Cleaned Text for AI: ${cleanedText}`);

      // TODO: In Day 3, we will add the fetch() request here to send 'cleanedText' to Python

    } catch (error) {
      console.log("Notification Headless Task Error:", error);
    }
  }
}