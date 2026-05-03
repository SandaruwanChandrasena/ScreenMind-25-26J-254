import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  // NativeEventEmitter,
  NativeModules,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import { settingsAccess } from "../services/settingsAccess";

///
import {
  startSensorTracking,
  stopSensorTracking
} from "../services/sensorService";

import {
  startSleepEventTracking,
  stopSleepEventTracking
} from "../services/sleepEventService";
///
import {
  getLatestCompletedSession,
  startSleepSession,
  stopSleepSession,
  getSessionSummary,
  logScreenEvent,
  logNotificationEvent,
  debugDumpSleepTables, // optional
  cleanupStaleSessions,
} from "../services/sleepRepository";


import {
  startLateNightWarningMonitor,
  stopLateNightWarningMonitor,
  scheduleBedtimeReminder
} from '../services/sleepWarningService';

import {
  syncPendingSleepSessionsToFirebase,
  syncSleepSessionToFirebase,
} from '../services/sleepFirebaseSync';

const { SleepServiceModule } = NativeModules;

// When starting session:
async function handleStartSession() {
  // ... your existing start logic ...

  // Start foreground service (keeps sensors alive through screen lock)
  SleepServiceModule?.startForegroundService();

  // Start late night monitor
  startLateNightWarningMonitor(newSessionId);
}

// When stopping session:
async function handleStopSession() {
  // ... your existing stop logic ...

  // Stop foreground service
  SleepServiceModule?.stopForegroundService();

  // Stop warning monitor
  stopLateNightWarningMonitor();
}




import {
  computeRiskScore,
  predictSleepRiskML,
  buildFeaturesFromSessions
} from "../services/sleepApiService";
import { getLast7Sessions } from "../services/sleepRepository";

import { computeDisruptionScore } from "../services/sleepScoring";

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function StatRow({ label, value, sub }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.statValue}>{value}</Text>
        {!!sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function normalizeRiskScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value <= 1 ? value * 100 : value;
}

/**
 * SVG donut chart.
 * score: 0–100 (higher = worse disruption risk)
 * risk: "Low" | "Medium" | "High"
 */
function DonutChart({ score, risk }) {
  const SIZE = 150;
  const STROKE = 14;
  const normalizedScore = normalizeRiskScore(score);
  const pct = Math.max(0, Math.min(100, normalizedScore));
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // Color based on risk
  const arcColor =
    risk === "High"
      ? "#F87171"
      : risk === "Medium"
        ? "#FBBF24"
        : "#34D399";

  const riskEmoji =
    risk === "High" ? "🔴" : risk === "Medium" ? "🟡" : "🟢";

  return (
    <View style={donutStyles.wrapper}>
      <View style={[donutStyles.ring, { width: SIZE, height: SIZE }]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
            fill="transparent"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            stroke={arcColor}
            strokeWidth={STROKE}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={SIZE / 2}
            originY={SIZE / 2}
          />
        </Svg>

        <View style={donutStyles.inner}>
          <Text style={donutStyles.scoreNum}>
            {Math.round(pct)}%
          </Text>
          <Text style={donutStyles.scoreUnit}>Sleep risk</Text>
          <Text style={donutStyles.riskLabel}>
            {riskEmoji} {risk || "—"}
          </Text>
        </View>
      </View>

      {/* Legend */}
      {/* <View style={donutStyles.legend}>
        <LegendDot color="#34D399" label="Low" />
        <LegendDot color="#FBBF24" label="Med" />
        <LegendDot color="#F87171" label="High" />
      </View> */}

    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={donutStyles.legendItem}>
      <View style={[donutStyles.dot, { backgroundColor: color }]} />
      <Text style={donutStyles.legendText}>{label}</Text>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  wrapper: { alignItems: "center", paddingVertical: 8 },
  ring: { position: "relative", alignItems: "center", justifyContent: "center" },
  inner: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "#12122A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  scoreNum: {
    color: "#E2E8F0",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  scoreUnit: { color: "rgba(148,163,184,0.72)", fontSize: 11, fontWeight: "800", marginTop: 2 },
  riskLabel: { color: "#E2E8F0", fontSize: 11, fontWeight: "900", marginTop: 4 },
  legend: { flexDirection: "row", gap: 12, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "rgba(148,163,184,0.8)", fontSize: 11, fontWeight: "800" },
});

function msToHrsMins(ms) {
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function SleepHomeScreen({ navigation }) {
  const userId = null; // later: set Firebase auth uid

  const [loading, setLoading] = useState(true);

  // ✅ Local running state (do not depend on DB for Start/Stop UI)
  const [runningSessionId, setRunningSessionId] = useState(null);

  const [latestSummary, setLatestSummary] = useState(null);
  const [riskResult, setRiskResult] = useState(null);

  // Prevent logging duplicates (some devices re-post same event)
  const lastNotifKeyRef = useRef(null);

  // ====== 1) Permissions check + bedtime reminder (on app load) ======
  useEffect(() => {
    checkPermissions();
    scheduleBedtimeReminder();
    startLateNightWarningMonitor(); // passive mode: warns if phone used during night window without a session
  }, []);

  const checkPermissions = async () => {
    try {
      const usage = await settingsAccess.hasUsageStatsAccess?.();
      const notif = await settingsAccess.hasNotificationListenerAccess?.();
      const dnd = await settingsAccess.hasDndAccess?.();

      console.log("✅ Permissions checked:");
      console.log("  Usage access:", usage ?? false);
      console.log("  Notification access:", notif ?? false);
      console.log("  DND access:", dnd ?? false);
    } catch (e) {
      console.error("Permission check error:", e.message || e);
      // Non-blocking: permissions check failure doesn't prevent app from running
    }
  };

  // ====== 2) Load dashboard summary ======
  // const loadDashboard = useCallback(async () => {
  //   setLoading(true);
  //   try {
  //     const latest = await getLatestCompletedSession(userId);
  //     console.log("LATEST COMPLETED SESSION:", latest);

  //     if (!latest) {
  //       setLatestSummary(null);
  //       setRiskResult(null);
  //       return;
  //     }

  //     const summary = await getSessionSummary(latest.id);
  //     console.log("LATEST SUMMARY:", summary);

  //     if (!summary) {
  //       setLatestSummary(null);
  //       setRiskResult(null);
  //       return;
  //     }

  //     const score = computeDisruptionScore(summary);
  //     setLatestSummary(summary);
  //     setRiskResult(score);
  //   } catch (e) {
  //     console.log("Sleep dashboard load error:", e);
  //     Alert.alert("Error", "Failed to load sleep data.");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [userId]);

  // Load dashboard: show a fast local score first, then try ML/API in background
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await getLatestCompletedSession(userId);
      if (!latest) {
        setLatestSummary(null);
        setRiskResult(null);
        return;
      }

      const summary = await getSessionSummary(latest.id);
      if (!summary) return;

      setLatestSummary(summary);

      // Immediately compute a local score for fast UX
      try {
        const localScore = computeDisruptionScore(summary);
        localScore.source = 'Local';
        setRiskResult(localScore);
      } catch (e) {
        console.log('Local scoring error:', e);
      }

      // Run ML / API scoring in background with timeouts and update UI if available
      (async () => {
        const withTimeout = (p, ms) => {
          return Promise.race([
            p,
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
          ]);
        };

        try {
          let updated = null;

          const last7 = await getLast7Sessions(userId);

          if (last7 && last7.length === 7) {
            const features = buildFeaturesFromSessions(last7);
            try {
              const mlResult = await withTimeout(predictSleepRiskML(features), 8000);
              if (mlResult && Number(mlResult.risk_score) > 0) {
                updated = {
                  score: mlResult.risk_score,
                  risk: mlResult.risk_category,
                  reasons: [],
                  source: 'ML Model',
                };
              }
            } catch (e) {
              console.log('ML prediction timeout/error:', e.message || e);
            }
          }

          if (!updated) {
            try {
              const apiResult = await withTimeout(
                computeRiskScore({
                  screen_time_after_10pm: summary.screenOnCount * 8,
                  social_media_mins_night: summary.socialNotifCount * 5,
                  last_screen_off_hour: new Date(summary.end || Date.now()).getHours(),
                  unlock_count_night: summary.unlockCount,
                  notification_count_night: summary.nightNotifCount,
                  restlessness_score: 0,
                  snoring_duration_mins: summary.snoringTotalMinutes ?? 0,
                  sleep_quality_rating: summary.checkIn?.sleep_quality,
                }),
                8000
              );

              if (apiResult && Number(apiResult.risk_score) > 0) {
                updated = {
                  score: apiResult.risk_score,
                  risk: apiResult.risk_category,
                  reasons: apiResult.reasons,
                  breakdown: apiResult.breakdown,
                  source: 'Rule-Based',
                };
              }
            } catch (e) {
              console.log('Rule-based prediction timeout/error:', e.message || e);
            }
          }

          if (updated) setRiskResult(updated);
        } catch (e) {
          console.log('Background risk compute error:', e);
        }
      })();

    } catch (e) {
      console.log("Dashboard load error:", e);
    } finally {
      // Ensure loading is false (local score already shown)
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Clean up stale sessions on mount
    cleanupStaleSessions().then(count => {
      if (count > 0) {
        console.log(`✅ Cleaned up ${count} stale session(s)`);
      }
    });

    loadDashboard();

    syncPendingSleepSessionsToFirebase()
      .then(result => {
        if (result?.uploaded > 0) {
          console.log(`✅ Synced ${result.uploaded} sleep session(s) to Firebase`);
        }
      })
      .catch(error => {
        console.log("Sleep Firebase backfill error:", error);
      });
  }, [loadDashboard]);

  const isRunning = !!runningSessionId;

  // ====== 3) STEP 4: Listen for native notifications and save to SQLite ======
  // useEffect(() => {
  //   const { NotificationBridge } = NativeModules;

  //   if (!NotificationBridge) {
  //     console.log(
  //       "⚠️ NativeModules.NotificationBridge not found. Check NotificationBridgePackage is added + rebuild."
  //     );
  //     return;
  //   }

  //   // Test if module is loaded
  //   console.log("✅ NotificationBridge module found");
  //   NotificationBridge.testModule();

  //   const emitter = new NativeEventEmitter(NotificationBridge);

  //   const sub = emitter.addListener("SCREENMIND_NOTIFICATION", async (event) => {
  //     try {
  //       console.log("📱 Received notification event:", event);

  //       // event expected: { packageName, title, ts }
  //       const packageName = event?.packageName ?? null;
  //       const title = event?.title ?? null;
  //       const ts = event?.ts ?? Date.now();

  //       // If session isn't running, ignore OR you can store as sessionId=null
  //       if (!runningSessionId) {
  //         console.log("⚠️ No running session, notification ignored");
  //         // If you want to keep all notifications even without session, uncomment:
  //         // await logNotificationEvent({ userId, sessionId: null, packageName, title, ts });
  //         return;
  //       }

  //       // Optional duplicate guard (package + title + ts)
  //       const key = `${packageName || ""}|${title || ""}|${ts}`;
  //       if (lastNotifKeyRef.current === key) return;
  //       lastNotifKeyRef.current = key;

  //       await logNotificationEvent({
  //         userId,
  //         sessionId: runningSessionId,
  //         packageName,
  //         title,
  //         ts,
  //       });

  //       // For debugging
  //       console.log("✅ Saved notification to SQLite:", {
  //         runningSessionId,
  //         packageName,
  //         title,
  //         ts,
  //       });

  //       // Optional: dump tables
  //       // if (debugDumpSleepTables) await debugDumpSleepTables();
  //     } catch (e) {
  //       console.log("❌ Failed to save native notification event:", e);
  //     }
  //   });

  //   return () => {
  //     sub.remove();
  //   };
  // }, [runningSessionId, userId]);

  // ====== 4) Start / Stop ======
  // const onStartSession = async () => {
  //   try {
  //     if (runningSessionId) {
  //       Alert.alert("Already running", "Sleep session is already active.");
  //       return;
  //     }

  //     const sessionId = await startSleepSession({ userId });
  //     console.log("Started sessionId:", sessionId);

  //     // optional demo screen events (keep if you want)
  //     await logScreenEvent({ userId, sessionId, eventType: "ON" });
  //     await logScreenEvent({ userId, sessionId, eventType: "UNLOCK" });

  //     setRunningSessionId(sessionId);

  //     if (debugDumpSleepTables) await debugDumpSleepTables();

  //     Alert.alert(
  //       "Started ✅",
  //       "Sleep session started. Now any new notifications will be logged automatically."
  //     );
  //   } catch (e) {
  //     console.log("Start error:", e);
  //     Alert.alert("Error", "Could not start session.");
  //   }
  // };


  const onStartSession = async () => {
    try {
      if (runningSessionId) {
        Alert.alert("Already running",
          "Sleep session is already active.");
        return;
      }

      const sessionId = await startSleepSession({ userId });
      console.log("Started sessionId:", sessionId);

      // ── Start real event tracking ──
      startSleepEventTracking(sessionId, userId);
      startSensorTracking(sessionId, userId);
      startLateNightWarningMonitor(sessionId);

      setRunningSessionId(sessionId);
      Alert.alert("Started ✅",
        "Sleep session started. Tracking unlocks, " +
        "notifications and sensors now.");
    } catch (e) {
      console.log("Start error:", e);
      Alert.alert("Error", "Could not start session.");
    }
  };

  const onStopSession = async () => {
    try {
      const sessionId = runningSessionId;
      if (!sessionId) {
        Alert.alert("No active session",
          "Start a sleep session first.");
        return;
      }

      // ── Stop event tracking ──
      stopSleepEventTracking();
      stopSensorTracking();
      startLateNightWarningMonitor(); // downgrade back to passive mode (no session)

      await stopSleepSession({ sessionId });

      try {
        await syncSleepSessionToFirebase(sessionId);
      } catch (syncError) {
        console.log("Sleep Firebase sync error:", syncError);
      }

      setRunningSessionId(null);
      await loadDashboard();
      Alert.alert("Stopped ✅",
        "Sleep session ended. Dashboard updated.");
    } catch (e) {
      console.log("Stop error:", e);
      Alert.alert("Error", "Could not stop session.");
    }
  };

  // const onStopSession = async () => {
  //   try {
  //     const sessionId = runningSessionId;

  //     if (!sessionId) {
  //       Alert.alert("No active session", "Start a sleep session first.");
  //       return;
  //     }

  //     console.log("Stopping sessionId:", sessionId);

  //     // optional demo end event
  //     await logScreenEvent({ userId, sessionId, eventType: "UNLOCK" });

  //     await stopSleepSession({ sessionId });

  //     setRunningSessionId(null);

  //     if (debugDumpSleepTables) await debugDumpSleepTables();

  //     await loadDashboard();

  //     Alert.alert("Stopped ✅", "Sleep session ended. Dashboard updated.");
  //   } catch (e) {
  //     console.log("Stop error:", e);
  //     Alert.alert("Error", "Could not stop session.");
  //   }
  // };

  // ====== 5) UI values ======
  const timeInBed = latestSummary ? msToHrsMins(latestSummary.durationMs) : "—";
  const unlocks = latestSummary ? String(latestSummary.unlockCount) : "—";
  const notifs = latestSummary ? String(latestSummary.notifCount) : "—";
  const score = riskResult ? String(riskResult.score) : "—";
  const risk = riskResult ? riskResult.risk : "—";
  const reasons = riskResult?.reasons?.length ? riskResult.reasons : [];

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header row ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brand}>SLEEP</Text>
              <Text style={styles.title}>Dashboard</Text>
            </View>
            {/* Settings gear – top-right corner */}
            <Pressable
              style={styles.settingsBtn}
              onPress={() => navigation.navigate("SleepPermissions")}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>
            Latest sleep disruption summary from your phone data.
          </Text>
        </View>

        {/* Summary Card */}
        <Card>
          {/* Header row */}
          <View style={styles.topRow}>
            <Text style={styles.smallMuted}>Sleep Risk Score</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Pressable onPress={loadDashboard} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>↻ Refresh</Text>
              </Pressable>
            )}
          </View>

          {/* Donut chart */}
          <DonutChart
            score={riskResult ? riskResult.score : null}
            risk={risk !== "—" ? risk : null}
          />

          <View style={styles.divider} />

          {/* Stats grid */}
          <View style={styles.grid}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>⏱ Time in bed</Text>
              <Text style={styles.tileValue}>{timeInBed}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>🔓 Unlocks</Text>
              <Text style={styles.tileValue}>{unlocks}</Text>
            </View>
          </View>

          <View style={{ height: 10 }} />

          <View style={styles.grid}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>🔔 Notifications</Text>
              <Text style={styles.tileValue}>{notifs}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>📱 Session</Text>
              <Text style={[styles.tileValue, { color: isRunning ? "#34D399" : colors.muted }]}>
                {isRunning ? "● Running" : "Stopped"}
              </Text>
            </View>
          </View>

          {!!reasons.length && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardTitle}>Top reasons</Text>
              <View style={{ height: 10 }} />
              {reasons.map((r, idx) => (
                <View key={idx} style={styles.reasonRow}>
                  <Text style={styles.reasonDot}>•</Text>
                  <Text style={styles.reasonText}>{r}</Text>
                </View>
              ))}
            </>
          )}
        </Card>

        {/* Empty State */}
        {!loading && !latestSummary && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No sleep records yet</Text>
            <Text style={styles.emptyText}>
              Start and stop a sleep session to generate your first report.
            </Text>
          </View>
        )}

        {/* Bottom padding so content clears the tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Fixed bottom tab bar – 4 actions + floating center Start Sleep */}
      <View style={styles.tabBar}>
        {/* Left: Morning Check-In */}
        <Pressable
          style={styles.tabItem}
          onPress={() => navigation.navigate("SleepCheckIn")}
        >
          <Text style={styles.tabIcon}>☀️</Text>
          <Text style={styles.tabLabel}>Check-In</Text>
        </Pressable>

        {/* Left: Sleep Details */}
        <Pressable
          style={styles.tabItem}
          onPress={() =>
            navigation.navigate("SleepDetails", { sessionId: runningSessionId })
          }
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={styles.tabLabel}>Details</Text>
        </Pressable>

        {/* Center empty slot — floating button sits above */}
        <View style={styles.tabCenter} />

        {/* Right: Snoring */}
        <Pressable
          style={styles.tabItem}
          onPress={() => navigation.navigate("SleepSnoring")}
        >
          <Text style={styles.tabIcon}>🎙️</Text>
          <Text style={styles.tabLabel}>Snoring</Text>
        </Pressable>

        {/* Right: Schedule */}
        <Pressable
          style={styles.tabItem}
          onPress={() => navigation.navigate("SleepSchedule")}
        >
          <Text style={styles.tabIcon}>📅</Text>
          <Text style={styles.tabLabel}>Schedule</Text>
        </Pressable>
      </View>

      {/* Floating Start/Stop button – centered above the tab bar */}
      <Pressable
        style={[styles.floatBtn, isRunning && styles.floatBtnStop]}
        onPress={isRunning ? onStopSession : onStartSession}
      >
        <Text style={styles.floatBtnIcon}>{isRunning ? "⏹" : "🌙"}</Text>
        <Text style={styles.floatBtnLabel}>
          {isRunning ? "Stop\nSleep" : "Start\nSleep"}
        </Text>
      </Pressable>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  // Header
  header: { marginBottom: spacing.lg },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 3, marginBottom: 4 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 4, lineHeight: 18 },

  // Settings gear button (top-right)
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  settingsIcon: { fontSize: 20 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  smallMuted: { color: colors.faint, fontWeight: "800", fontSize: 12 },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  refreshText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  riskBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  riskText: { color: colors.text, fontWeight: "900", fontSize: 13 },
  scoreText: { color: colors.muted, fontWeight: "900" },

  grid: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tileLabel: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  tileValue: { color: colors.text, fontWeight: "900", fontSize: 16, marginTop: 8 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  statValue: { color: colors.text, fontWeight: "900", fontSize: 14 },
  statSub: { color: colors.faint, fontWeight: "800", fontSize: 11, marginTop: 2 },

  reasonRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 8 },
  reasonDot: { color: colors.primary2, fontWeight: "900" },
  reasonText: { color: colors.muted, lineHeight: 18, flex: 1, fontSize: 12 },

  emptyBox: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  emptyText: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

  // ── 2×2 action grid ──
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionTile: {
    width: "47%",
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 8,
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  // ══════════════════════════════════
  // Fixed bottom tab bar
  // ══════════════════════════════════
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0D2B",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabCenter: {
    // empty space where the floating button sits
    width: 88,
  },
  tabIcon: { fontSize: 22 },
  tabLabel: {
    color: "rgba(148,163,184,0.7)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  // Floating center Start/Stop button
  floatBtn: {
    position: "absolute",
    bottom: 22,
    alignSelf: "center",
    // center horizontally
    left: "50%",
    marginLeft: -52,
    width: 104,
    height: 86,
    borderRadius: 26,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 4,
    // Blue glow exactly like image
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 2,
    borderColor: "rgba(147,197,253,0.40)",
  },
  floatBtnStop: {
    backgroundColor: "#EF4444",
    shadowColor: "#F87171",
    borderColor: "rgba(252,165,165,0.40)",
  },
  floatBtnIcon: { fontSize: 26 },
  floatBtnLabel: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 17,
  },
});
