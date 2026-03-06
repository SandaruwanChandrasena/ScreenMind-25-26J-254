import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'sm_alert_settings';

export const DEFAULT_SETTINGS = {
  sensitivity: 'Medium',
  negativeCount: 5,
  timeWindowMins: 5,
  alertHighRisk: true,
  dailyJournalReminder: false,
  journalReminderInterval: null, // '5s' | '5h' | '12h'
};

export const SENSITIVITY_PRESETS = {
  Low: { negativeCount: 7, timeWindowMins: 15 },
  Medium: { negativeCount: 5, timeWindowMins: 5 },
  High: { negativeCount: 3, timeWindowMins: 3 },
};

export const TIME_WINDOW_OPTIONS = [3, 5, 10, 15];
export const MESSAGE_COUNT_OPTIONS = [3, 4, 5, 6, 7];

export async function saveAlertSettings(settings) {
  try {
    // Merge with existing so we never lose other fields
    const existing = await loadAlertSettings();
    const merged = { ...existing, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    console.log('✅ Settings saved:', merged);
  } catch (e) {
    console.log('❌ Save error:', e);
  }
}

export async function loadAlertSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    // Merge with defaults so new fields always have a fallback value
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.log('❌ Load error:', e);
    return DEFAULT_SETTINGS;
  }
}
