import { NativeModules } from "react-native";

const { BehaviourMetrics } = NativeModules;

export async function ensureUsageAccess() {
  const ok = await BehaviourMetrics.hasUsageAccess();
  if (!ok) {
    BehaviourMetrics.openUsageAccessSettings();
    return false;
  }
  return true;
}

export async function getTodayBehaviourStats() {
  return BehaviourMetrics.getTodayBehaviourStats();
}
