// src/features/sleep/services/sleepEventService.js

import { NativeModules, NativeEventEmitter } from "react-native";
import { logScreenEvent } from "./sleepRepository";

const { SleepEventModule } = NativeModules;

let eventSubscriptions = [];
let currentSessionId = null;
let userId = null;

export function startSleepEventTracking(sessionId, uid = null) {
  currentSessionId = sessionId;
  userId = uid;

  if (!SleepEventModule) {
    console.log("⚠️ SleepEventModule not found");
    return;
  }

  const emitter = new NativeEventEmitter(SleepEventModule);

  // Start listening for Android broadcasts
  SleepEventModule.startListening();

  // Handle unlock events
  const unlockSub = emitter.addListener(
    "SLEEP_UNLOCK", 
    async (event) => {
      try {
        const ts = event?.ts ?? Date.now();
        const hour = new Date(ts).getHours();
        const isNight = hour >= 21 || hour < 9 ? 1 : 0;

        await logScreenEvent({
          userId,
          sessionId: currentSessionId,
          eventType: "UNLOCK",
          ts,
          meta: JSON.stringify({ isNight }),
        });
        console.log("🔓 Unlock logged:", ts, "isNight:", isNight);
      } catch (e) {
        console.log("Unlock log error:", e);
      }
    }
  );

  // Handle screen ON
  const screenOnSub = emitter.addListener(
    "SLEEP_SCREEN_ON",
    async (event) => {
      try {
        const ts = event?.ts ?? Date.now();
        await logScreenEvent({
          userId,
          sessionId: currentSessionId,
          eventType: "ON",
          ts,
        });
        console.log("📱 Screen ON logged:", ts);
      } catch (e) {
        console.log("Screen ON log error:", e);
      }
    }
  );

  // Handle screen OFF
  const screenOffSub = emitter.addListener(
    "SLEEP_SCREEN_OFF",
    async (event) => {
      try {
        const ts = event?.ts ?? Date.now();
        await logScreenEvent({
          userId,
          sessionId: currentSessionId,
          eventType: "OFF",
          ts,
        });
        console.log("📴 Screen OFF logged:", ts);
      } catch (e) {
        console.log("Screen OFF log error:", e);
      }
    }
  );

  // Handle charging events (proxy for bedtime)
  // const chargingStartSub = emitter.addListener(
  //   "SLEEP_CHARGING_START",
  //   async (event) => {
  //     try {
  //       const ts = event?.ts ?? Date.now();
  //       await logScreenEvent({
  //         userId,
  //         sessionId: currentSessionId,
  //         eventType: "CHARGING_START",
  //         ts,
  //       });
  //       console.log("🔌 Charging start logged:", ts);
  //     } catch (e) {
  //       console.log("Charging start log error:", e);
  //     }
  //   }
  // );

  // const chargingStopSub = emitter.addListener(
  //   "SLEEP_CHARGING_STOP",
  //   async (event) => {
  //     try {
  //       const ts = event?.ts ?? Date.now();
  //       await logScreenEvent({
  //         userId,
  //         sessionId: currentSessionId,
  //         eventType: "CHARGING_STOP",
  //         ts,
  //       });
  //       console.log("🔋 Charging stop logged:", ts);
  //     } catch (e) {
  //       console.log("Charging stop log error:", e);
  //     }
  //   }
  // );

// In sleepEventService.js — update the chargingStartSub handler:

const chargingStartSub = emitter.addListener(
  "SLEEP_CHARGING_START",
  async (event) => {
    try {
      const ts = event?.ts ?? Date.now();
      await logScreenEvent({
        userId,
        sessionId: currentSessionId,
        eventType: "CHARGING_START",
        ts,
        meta: JSON.stringify({
          batteryLevel: event?.batteryLevel,
          isLikelyBedtime: event?.isLikelyBedtime,
        }),
      });

      // Also log to charging_events table
      await logChargingEvent({
        userId,
        sessionId: currentSessionId,
        eventType: 'CHARGING_START',
        ts,
        batteryLevel: event?.batteryLevel,
        isLikelyBedtime: event?.isLikelyBedtime,
      });

      console.log("🔌 Charging start logged, bedtime?:", event?.isLikelyBedtime);
    } catch (e) {
      console.log("Charging start log error:", e);
    }
  }
);

const chargingStopSub = emitter.addListener(
  "SLEEP_CHARGING_STOP",
  async (event) => {
    try {
      const ts = event?.ts ?? Date.now();
      await logScreenEvent({
        userId,
        sessionId: currentSessionId,
        eventType: "CHARGING_STOP",
        ts,
        meta: JSON.stringify({
          batteryLevel: event?.batteryLevel,
          isLikelyWakeTime: event?.isLikelyWakeTime,
        }),
      });

      await logChargingEvent({
        userId,
        sessionId: currentSessionId,
        eventType: 'CHARGING_STOP',
        ts,
        batteryLevel: event?.batteryLevel,
        isLikelyWakeTime: event?.isLikelyWakeTime,
      });

      console.log("🔋 Charging stop logged, wake time?:", event?.isLikelyWakeTime);
    } catch (e) {
      console.log("Charging stop log error:", e);
    }
  }
);


  eventSubscriptions = [
    unlockSub,
    screenOnSub,
    screenOffSub,
    chargingStartSub,
    chargingStopSub,
  ];

  console.log("✅ Sleep event tracking started for session:", sessionId);
}

export function stopSleepEventTracking() {
  eventSubscriptions.forEach(sub => sub.remove());
  eventSubscriptions = [];
  currentSessionId = null;

  if (SleepEventModule) {
    SleepEventModule.stopListening();
  }

  console.log("🛑 Sleep event tracking stopped");
}