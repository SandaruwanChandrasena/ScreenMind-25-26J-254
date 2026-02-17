import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFS = "isolation_prefs_v1";
const KEY_DAILY = "isolation_daily_v1";

export async function getIsolationPrefs() {
  const raw = await AsyncStorage.getItem(KEY_PREFS);
  return raw
    ? JSON.parse(raw)
    : {
        gps: true,
        calls: true,
        sms: false,
        usage: true,
        bluetooth: false,
        wifi: false,
      };
}

export async function saveIsolationPrefs(prefs) {
  await AsyncStorage.setItem(KEY_PREFS, JSON.stringify(prefs));
}

export async function getDailyIsolationHistory() {
  const raw = await AsyncStorage.getItem(KEY_DAILY);
  return raw ? JSON.parse(raw) : [];
}

export async function upsertDailyIsolationRecord(record) {
  const history = await getDailyIsolationHistory();
  const idx = history.findIndex((r) => r.date === record.date);

  if (idx >= 0) history[idx] = record;
  else history.unshift(record);

  await AsyncStorage.setItem(KEY_DAILY, JSON.stringify(history));
  return history;
}
