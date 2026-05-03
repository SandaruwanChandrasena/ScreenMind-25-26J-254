const SOCIAL_APPS = [
  'com.instagram.android',
  'com.facebook.katana',
  'com.facebook.orca',
  'com.zhiliaoapp.musically',
  'com.snapchat.android',
  'com.twitter.android',
  'com.reddit.frontpage',
  'com.pinterest',
];

const COMMUNICATION_APPS = [
  'com.whatsapp',
  'com.facebook.orca',
  'org.telegram.messenger',
  'com.google.android.apps.messaging',
  'com.viber.voip',
  'com.skype.raider',
  'com.discord',
];

const VIDEO_APPS = [
  'com.google.android.youtube',
  'com.netflix.mediaclient',
  'in.startv.hotstar',
  'com.amazon.avod.thirdpartyclient',
];

const BROWSER_APPS = [
  'com.android.chrome',
  'org.mozilla.firefox',
  'com.microsoft.emmx',
  'com.opera.browser',
];

const OWN_APP_PACKAGES = new Set([
  'com.screenmind.app',
  'com.screenmindapp',
]);

const LAUNCHER_PACKAGES = new Set([
  'com.google.android.apps.nexuslauncher',
  'com.android.launcher',
  'com.android.launcher2',
  'com.android.launcher3',
  'com.miui.home',
  'com.samsung.android.app.launcher',
]);

const SYSTEM_KEYWORDS = [
  'systemui',
  'provider',
  'networkstack',
  'inputmethod',
  'permissioncontroller',
  'settings',
  'launcher',
  'wellbeing',
  'keyguard',
  'wallpaper',
  'packageinstaller',
];

function msToMin(ms = 0) {
  return Math.round(ms / 60000);
}

function getItemTime(item) {
  return Number(item?.totalTimeInForeground ?? item?.totalTimeMs ?? 0);
}

function normalize01(value, maxValue) {
  if (!Number.isFinite(value) || maxValue <= 0) return 0;
  return Number(Math.min(value / maxValue, 1).toFixed(2));
}

function isOwnApp(packageName = '') {
  return OWN_APP_PACKAGES.has(packageName);
}

function isLauncher(packageName = '') {
  return LAUNCHER_PACKAGES.has(packageName);
}

function isSystemPackage(packageName = '') {
  if (!packageName) return true;

  const lc = packageName.toLowerCase();

  if (packageName === 'android') return true;
  if (SYSTEM_KEYWORDS.some(keyword => lc.includes(keyword))) return true;

  return false;
}

function getCategory(packageName = '') {
  if (SOCIAL_APPS.includes(packageName)) return 'social';
  if (COMMUNICATION_APPS.includes(packageName)) return 'communication';
  if (VIDEO_APPS.includes(packageName)) return 'video';
  if (BROWSER_APPS.includes(packageName)) return 'browser';
  return 'other';
}

function appLabelFromPackage(packageName = '') {
  const known = {
    'com.instagram.android': 'Instagram',
    'com.facebook.katana': 'Facebook',
    'com.facebook.orca': 'Messenger',
    'com.zhiliaoapp.musically': 'TikTok',
    'com.snapchat.android': 'Snapchat',
    'com.twitter.android': 'Twitter/X',
    'com.reddit.frontpage': 'Reddit',
    'com.whatsapp': 'WhatsApp',
    'org.telegram.messenger': 'Telegram',
    'com.discord': 'Discord',
    'com.google.android.youtube': 'YouTube',
    'com.netflix.mediaclient': 'Netflix',
    'com.android.chrome': 'Chrome',
    'com.spotify.music': 'Spotify',
    'com.google.android.apps.messaging': 'Messages',
    'com.pinterest': 'Pinterest',
    'org.mozilla.firefox': 'Firefox',
    'com.microsoft.emmx': 'Edge',
  };

  if (known[packageName]) return known[packageName];

  const last = packageName.split('.').pop() || 'Unknown App';
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export function extractUsageFeatures(rawUsageStats = []) {
  const safeList = Array.isArray(rawUsageStats) ? rawUsageStats : [];

  const dedupMap = new Map();

  for (const item of safeList) {
    const packageName = item?.packageName || '';
    const time = getItemTime(item);

    if (!packageName || time <= 0) continue;

    dedupMap.set(packageName, (dedupMap.get(packageName) ?? 0) + time);
  }

  const filteredApps = [];

  for (const [packageName, totalTimeInForeground] of dedupMap.entries()) {
    if (
      !isOwnApp(packageName) &&
      !isLauncher(packageName) &&
      !isSystemPackage(packageName)
    ) {
      filteredApps.push({
        packageName,
        totalTimeInForeground,
      });
    }
  }

  const sorted = [...filteredApps].sort(
    (a, b) => getItemTime(b) - getItemTime(a),
  );

  let totalTimeMs = 0;

  for (const item of sorted) {
    totalTimeMs += getItemTime(item);
  }

  const totalScreenTimeMin = msToMin(totalTimeMs);
  const totalSessions = sorted.length;
  const appSwitchingCount = Math.max(sorted.length - 1, 0);

  let repeatedCheckingCount = 0;

  for (const item of sorted) {
    if (msToMin(getItemTime(item)) <= 2) {
      repeatedCheckingCount += 1;
    }
  }

  const usageValues = sorted.map(item => getItemTime(item));

  const avgUsage =
    usageValues.length > 0
      ? usageValues.reduce((sum, value) => sum + value, 0) / usageValues.length
      : 0;

  const variance =
    usageValues.length > 0
      ? usageValues.reduce(
          (sum, value) => sum + Math.pow(value - avgUsage, 2),
          0,
        ) / usageValues.length
      : 0;

  const stdDeviation = Math.sqrt(variance);

  const screenTimeDev = normalize01(stdDeviation, totalTimeMs || 1);

  const sessionFragmentation =
    totalSessions > 0
      ? Number((repeatedCheckingCount / totalSessions).toFixed(2))
      : 0;

  const appSwitching = normalize01(appSwitchingCount, 20);
  const repeatedChecking = normalize01(repeatedCheckingCount, 10);
  const usageIrregularity = normalize01(stdDeviation, totalTimeMs || 1);

  const topApps = sorted.slice(0, 5).map(item => ({
    packageName: item.packageName,
    appName: appLabelFromPackage(item.packageName),
    totalTimeMin: msToMin(getItemTime(item)),
    category: getCategory(item.packageName),
  }));

  return {
    totalScreenTimeMin,
    totalSessions,
    appCount: sorted.length,
    appSwitchingCount,
    repeatedCheckingCount,
    topApps,
    filteredApps: sorted,

    screen_time_dev: screenTimeDev,
    session_fragmentation: sessionFragmentation,
    app_switching: appSwitching,
    repeated_checking: repeatedChecking,
    usage_irregularity: usageIrregularity,

    screenTimeDev,
    sessionFragmentation,
    appSwitching,
    repeatedChecking,
    usageIrregularity,
  };
}