import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "screenmind:isolation:dailyHistory:v1";

function todayKey(date = new Date()) {
  // YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getDailyHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.log("getDailyHistory error:", e);
    return [];
  }
}

export async function upsertTodayBehaviour(payload) {
  /**
   payload example:
   {
     unlocks: 96,
     nightUsageMinutes: 105,
     screenTimeMinutes: 240,
     socialMinutes: 90,
     socialPct: 37,
   }
  */
  const date = todayKey();
  const history = await getDailyHistory();

  // newest-first list
  const idx = history.findIndex((x) => x.date === date);

  const record = {
    date,
    updatedAt: Date.now(),
    ...payload,
  };

  if (idx === -1) {
    history.unshift(record);
  } else {
    history[idx] = { ...history[idx], ...record };
  }

  // keep last 365 days max
  const trimmed = history.slice(0, 365);

  await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  return trimmed;
}

export async function clearDailyHistory() {
  await AsyncStorage.removeItem(KEY);
}
