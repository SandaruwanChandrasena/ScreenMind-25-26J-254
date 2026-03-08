// ─── Package lists ────────────────────────────────────────────
const SOCIAL_APPS = [
  "com.instagram.android",
  "com.facebook.katana",
  "com.facebook.orca",
  "com.zhiliaoapp.musically",   // TikTok
  "com.snapchat.android",
  "com.twitter.android",
  "com.reddit.frontpage",
  "com.pinterest",
];

const COMMUNICATION_APPS = [
  "com.whatsapp",
  "com.facebook.orca",
  "org.telegram.messenger",
  "com.google.android.apps.messaging",
  "com.viber.voip",
  "com.skype.raider",
  "com.discord",
];

const VIDEO_APPS = [
  "com.google.android.youtube",
  "com.netflix.mediaclient",
  "in.startv.hotstar",
  "com.amazon.avod.thirdpartyclient",
];

const BROWSER_APPS = [
  "com.android.chrome",
  "org.mozilla.firefox",
  "com.microsoft.emmx",
  "com.opera.browser",
];

// ─── User-facing Google apps that must NEVER be filtered ──────
// These start with com.google.android.* or com.android.* but are
// real user apps that Digital Wellbeing counts.
const USER_APP_WHITELIST = new Set([
  "com.google.android.youtube",
  "com.google.android.apps.messaging",
  "com.google.android.gm",              // Gmail
  "com.google.android.apps.maps",       // Maps
  "com.google.android.apps.photos",     // Photos
  "com.google.android.keep",            // Keep Notes
  "com.google.android.apps.docs",       // Docs
  "com.google.android.apps.youtube.music", // YT Music
  "com.android.chrome",                 // Chrome browser
]);

// ─── Own app packages ─────────────────────────────────────────
const OWN_APP_PACKAGES = new Set([
  "com.screenmind.app",
  "com.screenmindapp",
]);

// ─── Launcher packages ────────────────────────────────────────
const LAUNCHER_PACKAGES = new Set([
  "com.miui.home",
  "com.android.launcher",
  "com.android.launcher2",
  "com.android.launcher3",
  "com.google.android.apps.nexuslauncher",
  "com.oneplus.launcher",
  "com.samsung.android.app.launcher",
  "com.huawei.android.launcher",
  "com.oppo.launcher",
  "com.vivo.launcher",
  "com.bbk.launcher2",
  "com.realme.launcher",
]);

// ─── Explicit system-only package blocklist ───────────────────
// ✅ FIX: Instead of broad prefix matching (which blocked YouTube,
// Chrome etc.), we use keyword matching on non-whitelisted packages only.
const SYSTEM_KEYWORDS = [
  "systemui",
  "provider",
  "networkstack",
  "inputmethod",
  "permissioncontroller",
  "securitycenter",
  "deskclock",
  "settings",
  "scanner",
  "fileexplorer",
  "documentsui",
  "wellbeing",
  "gallery",
  "calculator",
  "calendar",
  "dialer",
  "keyguard",
  "wallpaper",
  "packageinstaller",
  "backupconfirm",
  "companiondevicemanager",
  "bluetoothmidiservice",
];

// ─── System package detection ─────────────────────────────────
function isSystemPackage(packageName = "") {
  // Always allow whitelisted user-facing apps
  if (USER_APP_WHITELIST.has(packageName)) return false;

  // Base Android OS
  if (packageName === "android") return true;

  // ✅ FIX: Use keyword matching instead of broad prefix matching.
  // Broad prefixes like "com.android." and "com.google.android." were
  // incorrectly blocking Chrome, YouTube, Gmail etc.
  const lc = packageName.toLowerCase();
  if (SYSTEM_KEYWORDS.some((kw) => lc.includes(kw))) return true;

  // Xiaomi / OEM system services (not user apps)
  if (
    packageName.startsWith("com.miui.")   ||
    packageName.startsWith("com.xiaomi.") ||
    packageName.startsWith("com.mi.")     ||
    packageName.startsWith("com.qualcomm.") ||
    packageName.startsWith("com.qti.")
  ) return true;

  return false;
}

function isOwnApp(packageName = "") {
  return OWN_APP_PACKAGES.has(packageName);
}

function isLauncher(packageName = "") {
  return LAUNCHER_PACKAGES.has(packageName);
}

// ─── Helpers ──────────────────────────────────────────────────
function msToMin(ms = 0) {
  return Math.round(ms / 60000);
}

function getItemTime(item) {
  return Number(item?.totalTimeInForeground ?? item?.totalTimeMs ?? 0);
}

function appLabelFromPackage(packageName = "") {
  const known = {
    "com.instagram.android":                  "Instagram",
    "com.facebook.katana":                    "Facebook",
    "com.facebook.orca":                      "Messenger",
    "com.zhiliaoapp.musically":               "TikTok",
    "com.snapchat.android":                   "Snapchat",
    "com.twitter.android":                    "Twitter/X",
    "com.reddit.frontpage":                   "Reddit",
    "com.whatsapp":                           "WhatsApp",
    "org.telegram.messenger":                 "Telegram",
    "com.discord":                            "Discord",
    "com.google.android.youtube":             "YouTube",
    "com.netflix.mediaclient":                "Netflix",
    "com.android.chrome":                     "Chrome",
    "com.spotify.music":                      "Spotify",
    "com.google.android.apps.messaging":      "Messages",
    "com.pinterest":                          "Pinterest",
    "org.mozilla.firefox":                    "Firefox",
    "com.microsoft.emmx":                     "Edge",
    "com.google.android.gm":                  "Gmail",
    "com.google.android.apps.maps":           "Maps",
    "com.google.android.apps.photos":         "Photos",
    "com.google.android.keep":                "Keep",
    "com.google.android.apps.docs":           "Docs",
    "com.google.android.apps.youtube.music":  "YT Music",
  };

  if (known[packageName]) return known[packageName];
  const last = packageName.split(".").pop() || packageName;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function getCategory(packageName = "") {
  if (SOCIAL_APPS.includes(packageName))        return "social";
  if (COMMUNICATION_APPS.includes(packageName)) return "communication";
  if (VIDEO_APPS.includes(packageName))         return "video";
  if (BROWSER_APPS.includes(packageName))       return "browser";
  return "other";
}

// ─── Main export ──────────────────────────────────────────────
/**
 * Extract categorized usage features from raw Android UsageStats data.
 * Handles: deduplication, system/launcher/own-app filtering.
 *
 * @param {Array} rawUsageStats - [{ packageName, totalTimeInForeground }]
 * @returns {Object} structured usage features
 */
export function extractUsageFeatures(rawUsageStats = []) {
  const safeList = Array.isArray(rawUsageStats) ? rawUsageStats : [];

  // ✅ STEP 1: Deduplicate by packageName — sum times for same package
  const dedupMap = new Map();
  for (const item of safeList) {
    const pkg  = item?.packageName || "";
    const time = getItemTime(item);
    if (!pkg) continue;

    dedupMap.set(pkg, (dedupMap.get(pkg) ?? 0) + time);
  }

  // ✅ STEP 2: Filter out system, launcher, own app, zero-time entries
  const filtered = [];
  for (const [pkg, time] of dedupMap.entries()) {
    if (
      time > 0              &&
      !isSystemPackage(pkg) &&
      !isOwnApp(pkg)        &&
      !isLauncher(pkg)
    ) {
      filtered.push({ packageName: pkg, totalTimeInForeground: time });
    }
  }

  // ✅ STEP 3: Sort by time descending
  const sorted = [...filtered].sort(
    (a, b) => getItemTime(b) - getItemTime(a)
  );

  // ✅ STEP 4: Aggregate category times
  let totalTimeMs         = 0;
  let socialTimeMs        = 0;
  let communicationTimeMs = 0;
  let videoTimeMs         = 0;
  let browserTimeMs       = 0;

  for (const item of sorted) {
    const time     = getItemTime(item);
    const category = getCategory(item.packageName);

    totalTimeMs += time;

    if      (category === "social")        socialTimeMs        += time;
    else if (category === "communication") communicationTimeMs += time;
    else if (category === "video")         videoTimeMs         += time;
    else if (category === "browser")       browserTimeMs       += time;
  }

  const topApps = sorted.slice(0, 5).map((item) => ({
    packageName:  item.packageName,
    appName:      appLabelFromPackage(item.packageName),
    totalTimeMs:  getItemTime(item),
    totalTimeMin: msToMin(getItemTime(item)),
    category:     getCategory(item.packageName),
  }));

  return {
    totalScreenTimeMin:  msToMin(totalTimeMs),
    socialMediaMin:      msToMin(socialTimeMs),
    communicationMin:    msToMin(communicationTimeMs),
    videoMin:            msToMin(videoTimeMs),
    browserMin:          msToMin(browserTimeMs),
    appCount:            sorted.length,
    topApps,
    filteredApps:        sorted,
  };
}