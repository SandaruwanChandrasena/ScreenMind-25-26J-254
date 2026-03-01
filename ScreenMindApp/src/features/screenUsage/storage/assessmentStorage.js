import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "screenUsageAssessments";

export async function saveAssessment(assessment) {
  const raw = await AsyncStorage.getItem(KEY);
  const list = raw ? JSON.parse(raw) : [];

  const newItem = {
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    ...assessment,
  };

  list.unshift(newItem); // newest first
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return newItem;
}

export async function getAssessments() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearAssessments() {
  await AsyncStorage.removeItem(KEY);
}