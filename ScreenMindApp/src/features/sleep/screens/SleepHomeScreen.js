import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  NativeEventEmitter,
  NativeModules,
} from "react-native";

import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import { settingsAccess } from "../services/settingsAccess";

import {
  getLatestCompletedSession,
  startSleepSession,
  stopSleepSession,
  getSessionSummary,
  logScreenEvent,
  logNotificationEvent,
  debugDumpSleepTables, // optional
} from "../services/sleepRepository";

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

function RiskBadge({ risk }) {
  const bg =
    risk === "High"
      ? "rgba(239,68,68,0.18)"
      : risk === "Medium"
      ? "rgba(245,158,11,0.16)"
      : "rgba(34,197,94,0.14)";

  return (
    <View style={[styles.riskBadge, { backgroundColor: bg }]}>
      <Text style={styles.riskText}>{risk || "—"}</Text>
    </View>
  );
}

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

  // ====== 1) Permissions check (optional) ======
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const usage = await settingsAccess.hasUsageStatsAccess();
      const notif = await settingsAccess.hasNotificationListenerAccess();
      const dnd = await settingsAccess.hasDndAccess();

      console.log("Usage access:", usage);
      console.log("Notification access:", notif);
      console.log("DND access:", dnd);
    } catch (e) {
      console.log("Permission check error:", e);
    }
  };

  // ====== 2) Load dashboard summary ======
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await getLatestCompletedSession(userId);
      console.log("LATEST COMPLETED SESSION:", latest);

      if (!latest) {
        setLatestSummary(null);
        setRiskResult(null);
        return;
      }

      const summary = await getSessionSummary(latest.id);
      console.log("LATEST SUMMARY:", summary);

      if (!summary) {
        setLatestSummary(null);
        setRiskResult(null);
        return;
      }

      const score = computeDisruptionScore(summary);
      setLatestSummary(summary);
      setRiskResult(score);
    } catch (e) {
      console.log("Sleep dashboard load error:", e);
      Alert.alert("Error", "Failed to load sleep data.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const isRunning = !!runningSessionId;

  // ====== 3) STEP 4: Listen for native notifications and save to SQLite ======
  useEffect(() => {
    const { NotificationBridge } = NativeModules;

    if (!NotificationBridge) {
      console.log(
        "⚠️ NativeModules.NotificationBridge not found. Check NotificationBridgePackage is added + rebuild."
      );
      return;
    }

    // Test if module is loaded
    console.log("✅ NotificationBridge module found");
    NotificationBridge.testModule();

    const emitter = new NativeEventEmitter(NotificationBridge);

    const sub = emitter.addListener("SCREENMIND_NOTIFICATION", async (event) => {
      try {
        console.log("📱 Received notification event:", event);
        
        // event expected: { packageName, title, ts }
        const packageName = event?.packageName ?? null;
        const title = event?.title ?? null;
        const ts = event?.ts ?? Date.now();

        // If session isn't running, ignore OR you can store as sessionId=null
        if (!runningSessionId) {
          console.log("⚠️ No running session, notification ignored");
          // If you want to keep all notifications even without session, uncomment:
          // await logNotificationEvent({ userId, sessionId: null, packageName, title, ts });
          return;
        }

        // Optional duplicate guard (package + title + ts)
        const key = `${packageName || ""}|${title || ""}|${ts}`;
        if (lastNotifKeyRef.current === key) return;
        lastNotifKeyRef.current = key;

        await logNotificationEvent({
          userId,
          sessionId: runningSessionId,
          packageName,
          title,
          ts,
        });

        // For debugging
        console.log("✅ Saved notification to SQLite:", {
          runningSessionId,
          packageName,
          title,
          ts,
        });

        // Optional: dump tables
        // if (debugDumpSleepTables) await debugDumpSleepTables();
      } catch (e) {
        console.log("❌ Failed to save native notification event:", e);
      }
    });

    return () => {
      sub.remove();
    };
  }, [runningSessionId, userId]);

  // ====== 4) Start / Stop ======
  const onStartSession = async () => {
    try {
      if (runningSessionId) {
        Alert.alert("Already running", "Sleep session is already active.");
        return;
      }

      const sessionId = await startSleepSession({ userId });
      console.log("Started sessionId:", sessionId);

      // optional demo screen events (keep if you want)
      await logScreenEvent({ userId, sessionId, eventType: "ON" });
      await logScreenEvent({ userId, sessionId, eventType: "UNLOCK" });

      setRunningSessionId(sessionId);

      if (debugDumpSleepTables) await debugDumpSleepTables();

      Alert.alert(
        "Started ✅",
        "Sleep session started. Now any new notifications will be logged automatically."
      );
    } catch (e) {
      console.log("Start error:", e);
      Alert.alert("Error", "Could not start session.");
    }
  };

  const onStopSession = async () => {
    try {
      const sessionId = runningSessionId;

      if (!sessionId) {
        Alert.alert("No active session", "Start a sleep session first.");
        return;
      }

      console.log("Stopping sessionId:", sessionId);

      // optional demo end event
      await logScreenEvent({ userId, sessionId, eventType: "UNLOCK" });

      await stopSleepSession({ sessionId });

      setRunningSessionId(null);

      if (debugDumpSleepTables) await debugDumpSleepTables();

      await loadDashboard();

      Alert.alert("Stopped ✅", "Sleep session ended. Dashboard updated.");
    } catch (e) {
      console.log("Stop error:", e);
      Alert.alert("Error", "Could not stop session.");
    }
  };

  // ====== 5) UI values ======
  const timeInBed = latestSummary ? msToHrsMins(latestSummary.durationMs) : "—";
  const unlocks = latestSummary ? String(latestSummary.unlockCount) : "—";
  const notifs = latestSummary ? String(latestSummary.notifCount) : "—";
  const score = riskResult ? String(riskResult.score) : "—";
  const risk = riskResult ? riskResult.risk : "—";
  const reasons = riskResult?.reasons?.length ? riskResult.reasons : [];

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>SLEEP</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.sub}>
            Latest sleep disruption summary from your phone data.
          </Text>
        </View>

        {/* Summary Card */}
        <Card>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.smallMuted}>Latest Risk</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <RiskBadge risk={risk} />
                <Text style={styles.scoreText}>Score: {score}</Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator />
            ) : (
              <Pressable onPress={loadDashboard} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            )}
          </View>

          <View style={{ height: spacing.md }} />

          <View style={styles.grid}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Time in bed</Text>
              <Text style={styles.tileValue}>{timeInBed}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Unlocks</Text>
              <Text style={styles.tileValue}>{unlocks}</Text>
            </View>
          </View>

          <View style={{ height: 10 }} />

          <View style={styles.grid}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Notifications</Text>
              <Text style={styles.tileValue}>{notifs}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Session</Text>
              <Text style={styles.tileValue}>
                {isRunning ? "Running" : "Stopped"}
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

        <View style={{ height: spacing.md }} />

        {/* Stats card */}
        <Card>
          <Text style={styles.cardTitle}>Sleep Stats</Text>
          <Text style={styles.cardHint}>
            From SQLite logs (real data pipeline)
          </Text>

          <View style={{ height: 14 }} />
          <StatRow label="Time in bed" value={timeInBed} />
          <Divider />
          <StatRow label="Unlock count" value={unlocks} />
          <Divider />
          <StatRow label="Notification count" value={notifs} />
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Actions */}
        <PrimaryButton
          title={isRunning ? "Stop Sleep Session" : "Start Sleep Session"}
          onPress={isRunning ? onStopSession : onStartSession}
          style={{
            backgroundColor: isRunning ? colors.danger : colors.primary,
          }}
        />

        <View style={{ height: spacing.sm }} />

        <PrimaryButton
          title="Morning Check-In"
          onPress={() => navigation.navigate("SleepCheckIn")}
          style={{ backgroundColor: colors.primary2 }}
        />

        <View style={{ height: spacing.sm }} />

        <PrimaryButton
          title="View Details"
          onPress={() =>
            navigation.navigate("SleepDetails", { sessionId: runningSessionId })
          }
          style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
        />

        <View style={{ height: spacing.sm }} />

        <PrimaryButton
          title="Snoring Analysis"
          onPress={() => navigation.navigate("SleepSnoring")}
          style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
        />

        <View style={{ height: spacing.sm }} />

        <PrimaryButton
          title="Data & Permissions"
          onPress={() => navigation.navigate("SleepPermissions")}
          style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  header: { marginBottom: spacing.lg },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 3, marginBottom: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, lineHeight: 18 },

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
});
