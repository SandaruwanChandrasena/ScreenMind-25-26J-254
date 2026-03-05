// src/features/sleep/services/sensorService.js

import { NativeModules, NativeEventEmitter } from "react-native";
import { logSensorSample } from "./sleepRepository";

// Sample interval in milliseconds
const ACCEL_INTERVAL_MS = 30000;  // every 30 seconds
const LIGHT_INTERVAL_MS = 300000; // every 5 minutes

let accelInterval = null;
let lightInterval = null;
let currentSessionId = null;
let userId = null;

// Movement classification thresholds
const MOVEMENT = {
  STILL: 0.02,
  LIGHT: 0.08,
  RESTLESS: 0.30,
};

export function startSensorTracking(sessionId, uid = null) {
  currentSessionId = sessionId;
  userId = uid;

  startAccelerometerTracking();
  startLightTracking();

  console.log("✅ Sensor tracking started for session:", sessionId);
}

export function stopSensorTracking() {
  if (accelInterval) {
    clearInterval(accelInterval);
    accelInterval = null;
  }
  if (lightInterval) {
    clearInterval(lightInterval);
    lightInterval = null;
  }
  currentSessionId = null;
  console.log("🛑 Sensor tracking stopped");
}

// function startAccelerometerTracking() {
//   const { SleepSensorModule } = NativeModules;

//   if (!SleepSensorModule) {
//     console.log("⚠️ SleepSensorModule not available");
//     return;
//   }

//   accelInterval = setInterval(async () => {
//     try {
//       // Only track during night hours (9PM - 9AM)
//       const hour = new Date().getHours();
//       const isNight = hour >= 21 || hour < 9;
//       if (!isNight) return;

//       // Get accelerometer reading from native module
//       const reading = await SleepSensorModule.getAccelerometerReading();
      
//       const { x, y, z } = reading;
      
//       // Calculate movement magnitude (remove gravity ~9.8)
//       const magnitude = Math.sqrt(x * x + y * y + z * z);
//       const movement = Math.abs(magnitude - 9.8);

//       // Classify movement
//       let classification = "ACTIVE";
//       if (movement < MOVEMENT.STILL) classification = "STILL";
//       else if (movement < MOVEMENT.LIGHT) classification = "LIGHT";
//       else if (movement < MOVEMENT.RESTLESS) classification = "RESTLESS";

//       await logSensorSample({
//         userId,
//         sessionId: currentSessionId,
//         sensorType: "ACCELEROMETER",
//         x,
//         y,
//         z,
//         value: movement,
//         ts: Date.now(),
//         meta: JSON.stringify({ classification }),
//       });

//       console.log(`📳 Accel: ${classification} (${movement.toFixed(3)})`);

//     } catch (e) {
//       console.log("Accelerometer sample error:", e);
//     }
//   }, ACCEL_INTERVAL_MS);
// }

function startAccelerometerTracking() {
  const { SleepSensorModule } = NativeModules;

  if (!SleepSensorModule) {
    console.log("⚠️ SleepSensorModule not available");
    return;
  }

  accelInterval = setInterval(async () => {
    try {
      // 🚨 REMOVED THE DAY/NIGHT CHECK HERE 🚨
      // Now it will track anytime the session is active!

      // Get accelerometer reading from native module
      const reading = await SleepSensorModule.getAccelerometerReading();
      
      const { x, y, z } = reading;
      
      // Calculate movement magnitude (remove gravity ~9.8)
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const movement = Math.abs(magnitude - 9.8);

      // Classify movement
      let classification = "ACTIVE";
      if (movement < MOVEMENT.STILL) classification = "STILL";
      else if (movement < MOVEMENT.LIGHT) classification = "LIGHT";
      else if (movement < MOVEMENT.RESTLESS) classification = "RESTLESS";

      await logSensorSample({
        userId,
        sessionId: currentSessionId,
        sensorType: "ACCELEROMETER",
        x,
        y,
        z,
        value: movement,
        ts: Date.now(),
        meta: JSON.stringify({ classification }),
      });

      console.log(`📳 Accel: ${classification} (${movement.toFixed(3)})`);

    } catch (e) {
      console.log("Accelerometer sample error:", e);
    }
  }, ACCEL_INTERVAL_MS);
}

function startLightTracking() {
  const { SleepSensorModule } = NativeModules;

  if (!SleepSensorModule) return;

  lightInterval = setInterval(async () => {
    try {
      const hour = new Date().getHours();
      const isNight = hour >= 21 || hour < 9;
      if (!isNight) return;

      const lux = await SleepSensorModule.getLightReading();

      // Classify light level
      let lightCategory = "BRIGHT";
      if (lux < 5) lightCategory = "DARK";
      else if (lux < 20) lightCategory = "DIM";
      else if (lux < 50) lightCategory = "MODERATE";

      await logSensorSample({
        userId,
        sessionId: currentSessionId,
        sensorType: "LIGHT",
        value: lux,
        ts: Date.now(),
        meta: JSON.stringify({ lightCategory }),
      });

      console.log(`💡 Light: ${lightCategory} (${lux} lux)`);

    } catch (e) {
      console.log("Light sample error:", e);
    }
  }, LIGHT_INTERVAL_MS);
}

// Calculate restlessness score from sensor samples
export function calculateRestlessnessScore(sensorSamples) {
  if (!sensorSamples || sensorSamples.length === 0) return 0;

  const accelSamples = sensorSamples.filter(
    s => s.sensor_type === "ACCELEROMETER"
  );
  
  if (accelSamples.length === 0) return 0;

  const restlessCount = accelSamples.filter(s => {
    const meta = s.meta ? JSON.parse(s.meta) : {};
    return meta.classification === "RESTLESS" || 
           meta.classification === "ACTIVE";
  }).length;

  return Math.round((restlessCount / accelSamples.length) * 100);
}

// Calculate room darkness percentage
export function calculateDarknessScore(sensorSamples) {
  if (!sensorSamples || sensorSamples.length === 0) return 0;

  const lightSamples = sensorSamples.filter(
    s => s.sensor_type === "LIGHT"
  );
  
  if (lightSamples.length === 0) return 0;

  const darkCount = lightSamples.filter(s => {
    const meta = s.meta ? JSON.parse(s.meta) : {};
    return meta.lightCategory === "DARK" || 
           meta.lightCategory === "DIM";
  }).length;

  return Math.round((darkCount / lightSamples.length) * 100);
}