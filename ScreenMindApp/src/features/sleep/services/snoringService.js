import {
  NativeModules,
  NativeEventEmitter,
  Platform,
} from "react-native";

import {
  saveSnoringEpisode,
  getSnoringReport,
} from "./sleepRepository";

// ── Get native module ──────────────────────────────────
const { SnoringDetectionModule } = NativeModules;

// ── Internal state ─────────────────────────────────────
let isRunning = false;
let currentSessionId = null;
let currentUserId = null;

// Track current episode
let episodeStartTs = null;
let episodeCount = 0;
let totalSnoringSeconds = 0;

// Event subscriptions to clean up later
let subscriptions = [];

// Callbacks for UI updates
let onStatsUpdate = null;
let onAmplitudeUpdate = null;

// ── Public: is detection running ──────────────────────
export function isSnoringDetectionRunning() {
  return isRunning;
}

// ── Public: get live stats ─────────────────────────────
export function getLiveSnoringStats() {
  return {
    episodeCount,
    totalSnoringSeconds,
    totalSnoringMinutes: Math.round(totalSnoringSeconds / 60),
    intensity: calcIntensity(totalSnoringSeconds / 60),
    isCurrentlySnoringNow: episodeStartTs !== null,
  };
}

// ── Public: set UI callback for stat updates ───────────
export function setOnSnoringStatsUpdate(callback) {
  onStatsUpdate = callback;
}

// ── Public: set UI callback for amplitude updates ──────
export function setOnAmplitudeUpdate(callback) {
  onAmplitudeUpdate = callback;
}

// ── Public: start detection ────────────────────────────
export async function startSnoringDetection(
  sessionId, 
  userId = null
) {
  if (Platform.OS !== "android") {
    console.log("Snoring detection: Android only");
    return false;
  }

  if (!SnoringDetectionModule) {
    console.log(
      "⚠️ SnoringDetectionModule not found. " +
      "Check Kotlin module and package registration."
    );
    return false;
  }

  if (isRunning) {
    console.log("Snoring detection already running");
    return true;
  }

  try {
    // Reset state
    currentSessionId = sessionId;
    currentUserId = userId;
    episodeStartTs = null;
    episodeCount = 0;
    totalSnoringSeconds = 0;

    // Set up event emitter
    const emitter = new NativeEventEmitter(SnoringDetectionModule);

    // ── Listen for snoring start/end events ──
    const snoringEventSub = emitter.addListener(
      "SNORING_EVENT",
      async (event) => {
        await handleSnoringEvent(event);
      }
    );

    // ── Listen for amplitude updates (for real-time UI) ──
    const amplitudeSub = emitter.addListener(
      "SNORING_AMPLITUDE",
      (event) => {
        if (onAmplitudeUpdate) {
          onAmplitudeUpdate({
            amplitude: event.amplitude ?? 0,
            soundType: event.soundType ?? "SILENCE",
            isSnoring: event.isSnoring ?? false,
          });
        }
      }
    );

    // ── Listen for status events ──
    const statusSub = emitter.addListener(
      "SNORING_STATUS",
      (event) => {
        console.log("Snoring status:", event.status);
      }
    );

    subscriptions = [snoringEventSub, amplitudeSub, statusSub];

    // Start native recording
    await SnoringDetectionModule.startDetection();

    isRunning = true;
    console.log(
      "✅ Snoring detection started for session:", sessionId
    );
    return true;

  } catch (e) {
    console.log("❌ Snoring start error:", e);
    isRunning = false;
    return false;
  }
}

// ── Public: stop detection ─────────────────────────────
export async function stopSnoringDetection() {
  if (!isRunning) return;

  try {
    // If episode was active when stopped, close it
    if (episodeStartTs !== null) {
      const endTs = Date.now();
      const duration = Math.round(
        (endTs - episodeStartTs) / 1000
      );
      totalSnoringSeconds += duration;

      await saveSnoringEpisode({
        userId: currentUserId,
        sessionId: currentSessionId,
        startTs: episodeStartTs,
        endTs,
        durationSeconds: duration,
        intensity: calcIntensity(duration / 60),
      });

      episodeStartTs = null;
    }

    // Stop native recording
    if (SnoringDetectionModule) {
      await SnoringDetectionModule.stopDetection();
    }

    // Remove all listeners
    subscriptions.forEach(sub => sub.remove());
    subscriptions = [];

    isRunning = false;
    console.log("🛑 Snoring detection stopped");

  } catch (e) {
    console.log("❌ Snoring stop error:", e);
    isRunning = false;
  }
}

// ── Handle snoring events from native ─────────────────
async function handleSnoringEvent(event) {
  const { type, ts, amplitude, confidence } = event;

  console.log("🎤 Snoring event:", type, 
    "amplitude:", amplitude?.toFixed(0));

  if (type === "SNORING_START") {
    episodeStartTs = ts ?? Date.now();
    episodeCount++;

    console.log(
      `😴 Snoring episode ${episodeCount} started`
    );

    // Notify UI
    if (onStatsUpdate) {
      onStatsUpdate(getLiveSnoringStats());
    }
  }

  if (type === "SNORING_END" && episodeStartTs !== null) {
    const endTs = ts ?? Date.now();
    const durationSeconds = Math.round(
      (endTs - episodeStartTs) / 1000
    );

    totalSnoringSeconds += durationSeconds;
    episodeStartTs = null;

    const intensity = calcIntensity(
      totalSnoringSeconds / 60
    );

    console.log(
      `😴 Snoring episode ended: ${durationSeconds}s ` +
      `Total: ${totalSnoringSeconds}s`
    );

    // Save episode to SQLite
    try {
      await saveSnoringEpisode({
        userId: currentUserId,
        sessionId: currentSessionId,
        startTs: endTs - (durationSeconds * 1000),
        endTs,
        durationSeconds,
        intensity,
      });
      console.log("✅ Snoring episode saved to SQLite");
    } catch (e) {
      console.log("❌ Save snoring episode error:", e);
    }

    // Notify UI
    if (onStatsUpdate) {
      onStatsUpdate(getLiveSnoringStats());
    }
  }
}

// ── Calculate intensity from total minutes ─────────────
function calcIntensity(totalMinutes) {
  if (totalMinutes <= 0) return "None";
  if (totalMinutes < 15) return "Mild";
  if (totalMinutes < 45) return "Moderate";
  return "Severe";
}

// ── Public: load report from DB ────────────────────────
export { getSnoringReport };