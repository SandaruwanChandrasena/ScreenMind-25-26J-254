const APP_PACKAGE = "com.screenmind.app";

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
  "com.facebook.orca",          // Messenger
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
  "com.microsoft.emmx",         // Edge
  "com.opera.browser",
];

function isSystemPackage(packageName = "") {
  return (
    packageName.startsWith("com.android.") ||
    packageName.startsWith("com.google.android.") ||
    packageName.startsWith("android.") ||
    packageName.includes("systemui") ||
    packageName.includes("provider") ||
    packageName.includes("launcher") ||
    packageName.includes("networkstack") ||
    packageName.includes("inputmethod")
  );
}

function msToMin(ms = 0) {
  return Math.round(ms / 60000);
}

function appLabelFromPackage(packageName = "") {
  const known = {
    "com.instagram.android":              "Instagram",
    "com.facebook.katana":                "Facebook",
    "com.facebook.orca":                  "Messenger",
    "com.zhiliaoapp.musically":           "TikTok",
    "com.snapchat.android":               "Snapchat",
    "com.twitter.android":                "Twitter/X",
    "com.reddit.frontpage":               "Reddit",
    "com.whatsapp":                       "WhatsApp",
    "org.telegram.messenger":             "Telegram",
    "com.discord":                        "Discord",
    "com.google.android.youtube":         "YouTube",
    "com.netflix.mediaclient":            "Netflix",
    "com.android.chrome":                 "Chrome",
    "com.spotify.music":                  "Spotify",
    "com.google.android.apps.messaging":  "Messages",
    "com.pinterest":                      "Pinterest",
    "org.mozilla.firefox":                "Firefox",
    "com.microsoft.emmx":                 "Edge",
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

/**
 * ✅ FIX: safely read time from either field name.
 * Native modules may return totalTimeInForeground OR totalTimeMs.
 */
function getItemTime(item) {
  return Number(item?.totalTimeInForeground ?? item?.totalTimeMs ?? 0);
}

/**
 * Extract categorized usage features from raw Android UsageStats data.
 *
 * @param {Array} rawUsageStats - array of { packageName, totalTimeInForeground }
 * @returns {Object} structured usage features for ML model input
 */
export function extractUsageFeatures(rawUsageStats = []) {
  const safeList = Array.isArray(rawUsageStats) ? rawUsageStats : [];

  // Keep only meaningful, non-system apps with usage > 0
  const filtered = safeList.filter((item) => {
    const pkg  = item?.packageName || "";
    const time = getItemTime(item);

    return (
      pkg &&
      time > 0 &&
      !isSystemPackage(pkg) &&
      pkg !== APP_PACKAGE
    );
  });

  // Sort by foreground time descending
  const sorted = [...filtered].sort(
    (a, b) => getItemTime(b) - getItemTime(a)
  );

  let totalTimeMs         = 0;
  let socialTimeMs        = 0;
  let communicationTimeMs = 0;
  let videoTimeMs         = 0;
  let browserTimeMs       = 0;

  for (const item of sorted) {
    const pkg      = item?.packageName || "";
    const time     = getItemTime(item);
    const category = getCategory(pkg);

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