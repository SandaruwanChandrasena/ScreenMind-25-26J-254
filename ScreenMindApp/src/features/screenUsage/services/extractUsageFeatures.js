const APP_PACKAGE = "com.screenmindapp"; // ✅ Fixed package name

const SOCIAL_APPS = [
  "com.instagram.android",
  "com.facebook.katana",
  "com.facebook.orca",
  "com.zhiliaoapp.musically", // TikTok
  "com.snapchat.android",
  "com.twitter.android",
  "com.reddit.frontpage",
  "com.pinterest",
];

const COMMUNICATION_APPS = [
  "com.whatsapp",
  "com.facebook.orca", // Messenger
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

function isSystemPackage(packageName = "") {
  return (
    packageName.startsWith("com.android.") ||
    packageName.startsWith("com.google.android.") ||
    packageName.startsWith("android.") ||
    packageName.startsWith("com.miui.") ||       // ✅ Xiaomi system UI
    packageName.startsWith("com.xiaomi.") ||     // ✅ Xiaomi apps
    packageName.startsWith("com.qualcomm.") ||   // ✅ Qualcomm system
    packageName.startsWith("com.mediatek.") ||   // ✅ MediaTek system
    packageName.startsWith("com.coloros.") ||    // ✅ OPPO system
    packageName.startsWith("com.oplus.") ||      // ✅ OnePlus system
    packageName.startsWith("com.samsung.") ||    // ✅ Samsung system
    packageName.startsWith("com.sec.") ||        // ✅ Samsung system
    packageName.startsWith("com.huawei.") ||     // ✅ Huawei system
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
    "com.instagram.android": "Instagram",
    "com.facebook.katana": "Facebook",
    "com.facebook.orca": "Messenger",
    "com.zhiliaoapp.musically": "TikTok",
    "com.snapchat.android": "Snapchat",
    "com.twitter.android": "Twitter/X",
    "com.reddit.frontpage": "Reddit",
    "com.whatsapp": "WhatsApp",
    "org.telegram.messenger": "Telegram",
    "com.discord": "Discord",
    "com.google.android.youtube": "YouTube",
    "com.netflix.mediaclient": "Netflix",
    "com.android.chrome": "Chrome",
  };

  if (known[packageName]) return known[packageName];

  const last = packageName.split(".").pop() || packageName;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function getCategory(packageName = "") {
  if (SOCIAL_APPS.includes(packageName)) return "social";
  if (COMMUNICATION_APPS.includes(packageName)) return "communication";
  if (VIDEO_APPS.includes(packageName)) return "video";
  if (packageName === "com.android.chrome") return "browser";
  return "other";
}

export function extractUsageFeatures(rawUsageStats = []) {
  const safeList = Array.isArray(rawUsageStats) ? rawUsageStats : [];

  // keep only meaningful, non-system apps with usage > 0
  const filtered = safeList.filter((item) => {
    const pkg = item?.packageName || "";
    const time = Number(item?.totalTimeInForeground || 0);

    return (
      pkg &&
      time > 0 &&
      !isSystemPackage(pkg) &&
      pkg !== APP_PACKAGE
    );
  });

  // sort by foreground time descending
  const sorted = [...filtered].sort(
    (a, b) =>
      Number(b?.totalTimeInForeground || 0) - Number(a?.totalTimeInForeground || 0)
  );

  let totalTimeMs = 0;
  let socialTimeMs = 0;
  let communicationTimeMs = 0;
  let videoTimeMs = 0;
  let browserTimeMs = 0;

  for (const item of sorted) {
    const pkg = item?.packageName || "";
    const time = Number(item?.totalTimeInForeground || 0);
    const category = getCategory(pkg);

    totalTimeMs += time;

    if (category === "social") socialTimeMs += time;
    else if (category === "communication") communicationTimeMs += time;
    else if (category === "video") videoTimeMs += time;
    else if (category === "browser") browserTimeMs += time;
  }

  const topApps = sorted.slice(0, 5).map((item) => ({
    packageName: item.packageName,
    appName: appLabelFromPackage(item.packageName),
    totalTimeMs: Number(item.totalTimeInForeground || 0),
    totalTimeMin: msToMin(item.totalTimeInForeground || 0),
    category: getCategory(item.packageName),
  }));

  return {
    totalScreenTimeMin: msToMin(totalTimeMs),
    socialMediaMin: msToMin(socialTimeMs),
    communicationMin: msToMin(communicationTimeMs),
    videoMin: msToMin(videoTimeMs),
    browserMin: msToMin(browserTimeMs),
    appCount: sorted.length,
    topApps,
    filteredApps: sorted,
  };
}