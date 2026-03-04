// import React, { useState } from "react";
// import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
// import DashboardBackground from "../../../components/DashboardBackground";
// import PrimaryButton from "../../../components/PrimaryButton";
// import { colors } from "../../../theme/colors";
// import { spacing } from "../../../theme/spacing";



// // src/features/sleep/screens/SnoringScreen.js
// // Add these imports at top:
// import { 
//   startSnoringDetection, 
//   stopSnoringDetection,
//   getSnoringStats,
//   isSnoringRunning,
//   getSnoringReport,
// } from "../services/snoringService";

// // Update startStop function:
// const startStop = async () => {
//   if (!enabled) {
//     Alert.alert("Enable first", 
//       "Turn on snoring detection to start.");
//     return;
//   }

//   if (!running) {
//     // Need active session
//     const activeSession = await getActiveSleepSession(null);
//     if (!activeSession) {
//       Alert.alert("No session", 
//         "Start a sleep session first from the dashboard.");
//       return;
//     }

//     const success = await startSnoringDetection(activeSession.id);
//     if (success) {
//       setRunning(true);
//       Alert.alert("Started ✅", 
//         "Snoring detection is active. " +
//         "Place phone on bedside table.");
//     }
//   } else {
//     await stopSnoringDetection();
//     setRunning(false);
    
//     // Load real stats
//     const stats = getSnoringStats();
//     // Update your report state with real stats
//     setReport({
//       snoreTime: `${stats.totalSnoringMinutes} min`,
//       intensity: stats.intensity,
//       events: String(stats.episodeCount),
//       breathingIndex: String(
//         Math.round(stats.episodeCount * 2.3)
//       ),
//     });
//   }
// };

// function Card({ children, style }) {
//   return <View style={[styles.card, style]}>{children}</View>;
// }

// function Metric({ label, value, tint = "rgba(124,58,237,0.18)" }) {
//   return (
//     <View style={[styles.metric, { backgroundColor: tint }]}>
//       <Text style={styles.metricLabel}>{label}</Text>
//       <Text style={styles.metricValue}>{value}</Text>
//     </View>
//   );
// }

// function FactorChip({ text }) {
//   return (
//     <View style={styles.factorChip}>
//       <Text style={styles.factorChipText}>{text}</Text>
//     </View>
//   );
// }

// function SnoreBars({ data }) {
//   // data values 0-10 (timeline)
//   return (
//     <View style={styles.snoreBarsWrap}>
//       <Text style={styles.cardTitle}>Snore Intensity</Text>
//       <Text style={styles.cardHint}>Timeline (UI preview)</Text>

//       <View style={{ height: 14 }} />
//       <View style={styles.snoreBarsRow}>
//         {data.map((v, idx) => (
//           <View key={idx} style={styles.snoreBarTrack}>
//             <View style={[styles.snoreBarFill, { height: `${(v / 10) * 100}%` }]} />
//           </View>
//         ))}
//       </View>
//       <View style={styles.timeRow}>
//         <Text style={styles.timeText}>23</Text>
//         <Text style={styles.timeText}>01</Text>
//         <Text style={styles.timeText}>03</Text>
//         <Text style={styles.timeText}>05</Text>
//       </View>
//     </View>
//   );
// }

// export default function SnoringScreen() {
//   const [enabled, setEnabled] = useState(false);
//   const [running, setRunning] = useState(false);

//   const toggleEnabled = () => setEnabled((p) => !p);

//   const startStop = () => {
//     if (!enabled) {
//       Alert.alert("Enable first", "Turn on snoring detection to start.");
//       return;
//     }
//     setRunning((p) => !p);
//     Alert.alert("UI only", "Later: start/stop audio analysis on-device.");
//   };

//   // Dummy report values
//   const report = {
//     snoreTime: "45 min",
//     intensity: "Medium",
//     events: "12",
//     breathingIndex: "32",
//   };

//   const bars = [1,2,1,4,6,3,2,7,5,3,2,1,4,6,8,5,3,2,1,2,4,3,2,1];

//   return (
//     <DashboardBackground>
//       <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
//         <Text style={styles.title}>Snoring Report</Text>
//         <Text style={styles.sub}>Optional feature • On-device processing • No audio stored.</Text>

//         {/* Toggle + session */}
//         <Card>
//           <View style={styles.row}>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.cardTitle}>Enable Snoring Detection</Text>
//               <Text style={styles.cardHint}>
//                 Helps estimate snoring duration & intensity (not a medical diagnosis).
//               </Text>
//             </View>

//             <Pressable onPress={toggleEnabled} style={[styles.toggle, enabled && styles.toggleOn]}>
//               <Text style={styles.toggleText}>{enabled ? "ON" : "OFF"}</Text>
//             </Pressable>
//           </View>

//           <View style={styles.divider} />

//           <View style={styles.sessionBox}>
//             <Text style={styles.sessionTitle}>{running ? "Analysis in progress…" : "Ready for analysis"}</Text>
//             <Text style={styles.sessionHint}>
//               Start a sleep session before bed. Stop it in the morning.
//             </Text>

//             <View style={{ height: spacing.md }} />
//             <PrimaryButton
//               title={running ? "Stop Analysis" : "Start Analysis"}
//               onPress={startStop}
//               style={{ backgroundColor: running ? colors.danger : colors.primary }}
//             />
//           </View>
//         </Card>

//         <View style={{ height: spacing.md }} />

//         {/* Metrics */}
//         <View style={styles.metricsRow}>
//           <Metric label="Time snoring" value={report.snoreTime} tint="rgba(124,58,237,0.18)" />
//           <Metric label="Intensity" value={report.intensity} tint="rgba(245,158,11,0.16)" />
//         </View>
//         <View style={{ height: spacing.sm }} />
//         <View style={styles.metricsRow}>
//           <Metric label="Events" value={report.events} tint="rgba(34,197,94,0.14)" />
//           <Metric label="Breathing index" value={report.breathingIndex} tint="rgba(239,68,68,0.12)" />
//         </View>

//         <View style={{ height: spacing.md }} />

//         {/* Chart */}
//         <Card>
//           <SnoreBars data={bars} />

//           <View style={styles.divider} />

//           <Text style={styles.cardTitle}>Possible Factors</Text>
//           <Text style={styles.cardHint}>User-entered context (optional)</Text>

//           <View style={{ height: 10 }} />
//           <View style={styles.factorsWrap}>
//             <FactorChip text="Blocked nose" />
//             <FactorChip text="Late caffeine" />
//             <FactorChip text="Exhaustion" />
//             <FactorChip text="Heavy meal" />
//             <FactorChip text="Stress" />
//           </View>
//         </Card>

//         <View style={{ height: spacing.xxl }} />
//       </ScrollView>
//     </DashboardBackground>
//   );
// }

// const styles = StyleSheet.create({
//   container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

//   title: { color: colors.text, fontSize: 26, fontWeight: "900" },
//   sub: { color: colors.muted, marginTop: 6, marginBottom: spacing.lg, lineHeight: 18 },

//   card: {
//     backgroundColor: colors.card,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 24,
//     padding: spacing.lg,
//   },

//   row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },

//   toggle: {
//     width: 64,
//     height: 38,
//     borderRadius: 14,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: colors.input,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   toggleOn: { backgroundColor: "rgba(124,58,237,0.22)" },
//   toggleText: { color: colors.text, fontWeight: "900", fontSize: 12 },

//   divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },

//   cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
//   cardHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

//   sessionBox: {
//     padding: 14,
//     borderRadius: 18,
//     backgroundColor: "rgba(255,255,255,0.06)",
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   sessionTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
//   sessionHint: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

//   metricsRow: { flexDirection: "row", gap: 10 },
//   metric: {
//     flex: 1,
//     borderRadius: 18,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
//   metricValue: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 8 },

//   snoreBarsWrap: {},
//   snoreBarsRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 120, marginBottom: 10 },
//   snoreBarTrack: {
//     flex: 1,
//     height: "100%",
//     borderRadius: 999,
//     backgroundColor: "rgba(255,255,255,0.06)",
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.10)",
//     overflow: "hidden",
//     justifyContent: "flex-end",
//   },
//   snoreBarFill: {
//     width: "100%",
//     borderRadius: 999,
//     backgroundColor: "rgba(245,158,11,0.65)",
//   },

//   timeRow: { flexDirection: "row", justifyContent: "space-between" },
//   timeText: { color: colors.faint, fontSize: 12, fontWeight: "800" },

//   factorsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
//   factorChip: {
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     borderRadius: 999,
//     backgroundColor: colors.input,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   factorChipText: { color: colors.text, fontWeight: "900", fontSize: 12, opacity: 0.92 },
// });

import React, { 
  useState, useEffect, useRef, useCallback 
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  AppState,
} from "react-native";

import DashboardBackground from 
  "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import {
  startSnoringDetection,
  stopSnoringDetection,
  isSnoringDetectionRunning,
  getLiveSnoringStats,
  setOnSnoringStatsUpdate,
  setOnAmplitudeUpdate,
} from "../services/snoringService";

import {
  getActiveSleepSession,
  getSnoringReport,
  getLatestCompletedSession,
} from "../services/sleepRepository";

// ── Helper components ────────────────────────────────

function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

function Metric({ label, value, tint }) {
  return (
    <View style={[styles.metric, { backgroundColor: tint }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function FactorChip({ text }) {
  return (
    <View style={styles.factorChip}>
      <Text style={styles.factorChipText}>{text}</Text>
    </View>
  );
}

// ── Amplitude visualizer ─────────────────────────────
function AmplitudeBar({ amplitude, maxAmplitude = 3000 }) {
  const percent = Math.min(
    100, 
    (amplitude / maxAmplitude) * 100
  );
  
  const barColor = 
    amplitude > 2500 ? "rgba(239,68,68,0.80)" :
    amplitude > 1200 ? "rgba(245,158,11,0.75)" :
    amplitude > 300  ? "rgba(34,197,94,0.60)" :
                       "rgba(255,255,255,0.15)";

  const label = 
    amplitude > 2500 ? "LOUD SNORING 😴" :
    amplitude > 1200 ? "SNORING 😴" :
    amplitude > 300  ? "Breathing" :
                       "Silence";

  return (
    <View style={styles.ampWrap}>
      <View style={styles.ampBarTrack}>
        <View
          style={[
            styles.ampBarFill,
            { width: `${percent}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={styles.ampLabel}>{label}</Text>
    </View>
  );
}

// ── Snoring timeline bars ─────────────────────────────
function SnoreBars({ episodes, sessionStart }) {
  if (!episodes || episodes.length === 0) {
    return (
      <View style={styles.snoreBarsWrap}>
        <Text style={styles.cardTitle}>
          Snoring Timeline
        </Text>
        <Text style={styles.cardHint}>
          No snoring episodes recorded yet.
        </Text>
      </View>
    );
  }

  const now = Date.now();
  const start = sessionStart ?? (now - 8 * 60 * 60 * 1000);
  const totalDuration = now - start;

  return (
    <View style={styles.snoreBarsWrap}>
      <Text style={styles.cardTitle}>
        Snoring Timeline
      </Text>
      <Text style={styles.cardHint}>
        Each bar = one snoring episode
      </Text>

      <View style={{ height: 14 }} />
      <View style={styles.timelineTrack}>
        {episodes.map((ep, idx) => {
          const leftPercent = 
            ((ep.start_ts - start) / totalDuration) * 100;
          const widthPercent = 
            ((ep.duration_seconds * 1000) / totalDuration) * 100;

          return (
            <View
              key={idx}
              style={[
                styles.timelineEpisode,
                {
                  left: `${Math.max(0, leftPercent)}%`,
                  width: `${Math.max(1, widthPercent)}%`,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>
          {new Date(start).toLocaleTimeString(
            [], { hour: "2-digit", minute: "2-digit" }
          )}
        </Text>
        <Text style={styles.timeText}>Now</Text>
      </View>
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────
export default function SnoringScreen() {
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);

  // Live stats while detection is active
  const [liveStats, setLiveStats] = useState({
    episodeCount: 0,
    totalSnoringMinutes: 0,
    intensity: "None",
    isCurrentlySnoringNow: false,
  });

  // Amplitude for real-time visual
  const [amplitude, setAmplitude] = useState(0);
  const [soundType, setSoundType] = useState("SILENCE");

  // Report from DB (loaded session report)
  const [report, setReport] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [sessionStartTs, setSessionStartTs] = useState(null);

  // ── On mount: sync state with service ──────────────
  useEffect(() => {
    // If detection was already running (e.g. navigated away)
    if (isSnoringDetectionRunning()) {
      setRunning(true);
      setEnabled(true);
      setLiveStats(getLiveSnoringStats());
    }

    // Set up callbacks from service
    setOnSnoringStatsUpdate((stats) => {
      setLiveStats(stats);
    });

    setOnAmplitudeUpdate((data) => {
      setAmplitude(data.amplitude);
      setSoundType(data.soundType);
    });

    // Load any existing report
    loadExistingReport();

    return () => {
      // Clear callbacks on unmount
      setOnSnoringStatsUpdate(null);
      setOnAmplitudeUpdate(null);
    };
  }, []);

  // ── Load existing report from DB ───────────────────
  const loadExistingReport = async () => {
    try {
      const latest = await getLatestCompletedSession(null);
      if (!latest) return;

      const rep = await getSnoringReport(latest.id);
      setReport(rep);
      setEpisodes(rep.episodes ?? []);
      setSessionStartTs(latest.start_time);
    } catch (e) {
      console.log("Load snoring report error:", e);
    }
  };

  // ── Toggle enabled ─────────────────────────────────
  const toggleEnabled = () => setEnabled(prev => !prev);

  // ── Start detection ────────────────────────────────
  const handleStart = async () => {
    if (!enabled) {
      Alert.alert(
        "Enable First",
        "Toggle snoring detection ON first."
      );
      return;
    }

    // Check for active session
    const activeSession = await getActiveSleepSession(null);
    if (!activeSession) {
      Alert.alert(
        "No Sleep Session",
        "Please start a Sleep Session from the " +
        "dashboard first, then enable snoring detection."
      );
      return;
    }

    setSessionStartTs(activeSession.start_time);

    const success = await startSnoringDetection(
      activeSession.id,
      null
    );

    if (success) {
      setRunning(true);
      // Reset UI stats
      setLiveStats({
        episodeCount: 0,
        totalSnoringMinutes: 0,
        intensity: "None",
        isCurrentlySnoringNow: false,
      });
      setEpisodes([]);
      Alert.alert(
        "Started ✅",
        "Snoring detection is active.\n\n" +
        "Place your phone face-down on your\n" +
        "bedside table before sleeping."
      );
    } else {
      Alert.alert(
        "Error",
        "Could not start snoring detection.\n" +
        "Check microphone permission in " +
        "Data & Permissions screen."
      );
    }
  };

  // ── Stop detection ─────────────────────────────────
  const handleStop = async () => {
    await stopSnoringDetection();
    setRunning(false);
    setAmplitude(0);
    setSoundType("SILENCE");

    // Load final report from DB
    const activeSession = await getActiveSleepSession(null);
    const latest = await getLatestCompletedSession(null);
    
    const sessionId = activeSession?.id ?? latest?.id;
    if (sessionId) {
      const rep = await getSnoringReport(sessionId);
      setReport(rep);
      setEpisodes(rep.episodes ?? []);
    }

    Alert.alert("Stopped ✅", "Snoring analysis complete.");
  };

  // ── Render ─────────────────────────────────────────
  const displayEpisodes = running 
    ? episodes 
    : (report?.episodes ?? []);
  
  const displayMinutes = running
    ? liveStats.totalSnoringMinutes
    : (report?.totalMinutes ?? 0);
    
  const displayEpisodeCount = running
    ? liveStats.episodeCount
    : (report?.episodeCount ?? 0);
    
  const displayIntensity = running
    ? liveStats.intensity
    : (report?.intensity ?? "None");

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Snoring Detection</Text>
        <Text style={styles.sub}>
          Optional feature • On-device only • No audio stored
        </Text>

        {/* ── Toggle + Start/Stop ── */}
        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                Enable Snoring Detection
              </Text>
              <Text style={styles.cardHint}>
                Detects snoring patterns using your 
                microphone. Only analysis results are saved
                — no audio recordings stored.
              </Text>
            </View>

            <Pressable
              onPress={toggleEnabled}
              style={[
                styles.toggle,
                enabled && styles.toggleOn,
              ]}
            >
              <Text style={styles.toggleText}>
                {enabled ? "ON" : "OFF"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Status */}
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: running 
                  ? "rgba(34,197,94,0.8)" 
                  : "rgba(255,255,255,0.2)" 
              }
            ]} />
            <Text style={styles.statusText}>
              {running 
                ? (liveStats.isCurrentlySnoringNow
                    ? "🔴 Snoring detected now"
                    : "🟢 Monitoring — no snoring")
                : "Ready to start"
              }
            </Text>
          </View>

          <View style={{ height: spacing.md }} />

          {/* Real-time amplitude bar (only when running) */}
          {running && (
            <AmplitudeBar amplitude={amplitude} />
          )}

          <View style={{ height: spacing.md }} />

          <PrimaryButton
            title={running ? "Stop Analysis" : "Start Analysis"}
            onPress={running ? handleStop : handleStart}
            style={{
              backgroundColor: running
                ? colors.danger
                : colors.primary,
            }}
          />

          {!running && (
            <Text style={styles.tipText}>
              💡 Tip: Start a Sleep Session first, 
              then enable snoring detection.
              Place phone face-down on bedside table.
            </Text>
          )}
        </Card>

        <View style={{ height: spacing.md }} />

        {/* ── Live / Report metrics ── */}
        <View style={styles.metricsRow}>
          <Metric
            label="Time snoring"
            value={`${displayMinutes} min`}
            tint="rgba(124,58,237,0.18)"
          />
          <Metric
            label="Intensity"
            value={displayIntensity}
            tint={
              displayIntensity === "Severe"
                ? "rgba(239,68,68,0.18)"
                : displayIntensity === "Moderate"
                ? "rgba(245,158,11,0.16)"
                : "rgba(34,197,94,0.14)"
            }
          />
        </View>

        <View style={{ height: spacing.sm }} />

        <View style={styles.metricsRow}>
          <Metric
            label="Episodes"
            value={String(displayEpisodeCount)}
            tint="rgba(34,197,94,0.14)"
          />
          <Metric
            label="Status"
            value={running ? "Active 🔴" : "Idle"}
            tint="rgba(255,255,255,0.06)"
          />
        </View>

        <View style={{ height: spacing.md }} />

        {/* ── Timeline chart ── */}
        <Card>
          <SnoreBars
            episodes={displayEpisodes}
            sessionStart={sessionStartTs}
          />

          <View style={styles.divider} />

          <Text style={styles.cardTitle}>
            Possible Contributing Factors
          </Text>
          <Text style={styles.cardHint}>
            Common factors that increase snoring
          </Text>

          <View style={{ height: 10 }} />
          <View style={styles.factorsWrap}>
            <FactorChip text="Blocked nose" />
            <FactorChip text="Late screen use" />
            <FactorChip text="Sleep position" />
            <FactorChip text="Exhaustion" />
            <FactorChip text="Heavy meal" />
          </View>
        </Card>

        {/* ── Privacy note ── */}
        <View style={{ height: spacing.md }} />
        <Card style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>
            🔒 Privacy Guarantee
          </Text>
          <Text style={styles.privacyText}>
            Your microphone audio is analyzed locally 
            on your device every 2 seconds. Only the 
            results (timestamps, duration, intensity) 
            are saved. Raw audio is never recorded, 
            stored, or uploaded.
          </Text>
        </Card>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    flexGrow: 1,
  },

  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  sub: {
    color: colors.muted,
    marginTop: 6,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },

  toggle: {
    width: 64,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: {
    backgroundColor: "rgba(124,58,237,0.30)",
  },
  toggleText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
    opacity: 0.7,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  cardHint: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  statusText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
  },

  // Amplitude bar
  ampWrap: { marginBottom: 8 },
  ampBarTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  ampBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  ampLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },

  tipText: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
    textAlign: "center",
  },

  metricsRow: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },

  // Timeline
  snoreBarsWrap: {},
  timelineTrack: {
    height: 24,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    overflow: "hidden",
  },
  timelineEpisode: {
    position: "absolute",
    top: 0,
    height: "100%",
    backgroundColor: "rgba(245,158,11,0.70)",
    borderRadius: 4,
    minWidth: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: "800",
  },

  factorsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  factorChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factorChipText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 12,
  },

  privacyCard: {
    backgroundColor: "rgba(34,197,94,0.06)",
    borderColor: "rgba(34,197,94,0.20)",
  },
  privacyTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 8,
  },
  privacyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});