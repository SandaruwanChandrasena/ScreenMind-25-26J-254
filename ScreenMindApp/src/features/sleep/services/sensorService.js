// src/features/sleep/services/sensorService.js

import { NativeModules, NativeEventEmitter } from "react-native";
import { logSensorSample } from "./sleepRepository";

const { SleepSensorModule } = NativeModules;

let currentSessionId = null;
let userId = null;
let sensorSubscriptions = [];

const MOVEMENT = {
  STILL: 0.02,
  LIGHT: 0.08,
  RESTLESS: 0.30,
};

export function startSensorTracking(sessionId, uid = null) {
  currentSessionId = sessionId;
  userId = uid;

  if (!SleepSensorModule) {
    console.log("⚠️ SleepSensorModule not available");
    return;
  }

  const emitter = new NativeEventEmitter(SleepSensorModule);

  // Listen for accel events pushed from Kotlin background thread
  const accelSub = emitter.addListener("SLEEP_SENSOR_ACCEL", async (event) => {
    try {
      await logSensorSample({
        userId,
        sessionId: currentSessionId,
        sensorType: "ACCELEROMETER",
        x: event.x,
        y: event.y,
        z: event.z,
        value: event.movement,
        ts: event.ts ?? Date.now(),
        meta: JSON.stringify({ classification: event.classification }),
      });
      console.log(`📳 Accel: ${event.classification} (${event.movement?.toFixed(3)})`);
    } catch (e) {
      console.log("Accel log error:", e);
    }
  });

  // Listen for light events pushed from Kotlin background thread
  const lightSub = emitter.addListener("SLEEP_SENSOR_LIGHT", async (event) => {
    try {
      if (event.lux === -1) {
        console.log("💡 Light sensor not available on this device");
        return;
      }
      await logSensorSample({
        userId,
        sessionId: currentSessionId,
        sensorType: "LIGHT",
        value: event.lux,
        ts: event.ts ?? Date.now(),
        meta: JSON.stringify({ lightCategory: event.lightCategory }),
      });
      console.log(`💡 Light: ${event.lightCategory} (${event.lux} lux)`);
    } catch (e) {
      console.log("Light log error:", e);
    }
  });

  sensorSubscriptions = [accelSub, lightSub];

  // Start the Kotlin-side continuous polling
  // This runs on a background HandlerThread — survives screen lock
  SleepSensorModule.startContinuousPolling()
    .then(() => console.log("✅ Sensor polling started (background thread)"))
    .catch(e => console.log("Sensor polling start error:", e));

  console.log("✅ Sensor tracking started for session:", sessionId);
}

export function stopSensorTracking() {
  sensorSubscriptions.forEach(sub => sub.remove());
  sensorSubscriptions = [];
  currentSessionId = null;

  SleepSensorModule?.stopContinuousPolling()
    .then(() => console.log("🛑 Sensor polling stopped"))
    .catch(e => console.log("Sensor polling stop error:", e));
}

// These are still used by sleepScoring.js
export function calculateRestlessnessScore(sensorSamples) {
  if (!sensorSamples || sensorSamples.length === 0) return 0;
  const accelSamples = sensorSamples.filter(s => s.sensor_type === "ACCELEROMETER");
  if (accelSamples.length === 0) return 0;
  const restlessCount = accelSamples.filter(s => {
    const meta = s.meta ? JSON.parse(s.meta) : {};
    return meta.classification === "RESTLESS" || meta.classification === "ACTIVE";
  }).length;
  return Math.round((restlessCount / accelSamples.length) * 100);
}

export function calculateDarknessScore(sensorSamples) {
  if (!sensorSamples || sensorSamples.length === 0) return 0;
  const lightSamples = sensorSamples.filter(s => s.sensor_type === "LIGHT");
  if (lightSamples.length === 0) return 0;
  const darkCount = lightSamples.filter(s => {
    const meta = s.meta ? JSON.parse(s.meta) : {};
    return meta.lightCategory === "DARK" || meta.lightCategory === "DIM";
  }).length;
  return Math.round((darkCount / lightSamples.length) * 100);
}