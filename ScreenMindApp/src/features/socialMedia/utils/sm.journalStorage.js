import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@screenmind_sm_journal_entries_v1";

export async function loadJournalEntries() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log("Load journal error:", e);
    return [];
  }
}

export async function saveJournalEntries(entries) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(entries));
  } catch (e) {
    console.log("Save journal error:", e);
  }
}

export async function clearJournalEntries() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.log("Clear journal error:", e);
  }
}
