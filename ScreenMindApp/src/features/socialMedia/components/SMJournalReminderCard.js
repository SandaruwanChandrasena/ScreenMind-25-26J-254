import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { TriggerType } from '@notifee/react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { saveAlertSettings } from '../services/smSettings.service';

// ─────────────────────────────────────────────
// ✅ Interval options
// ─────────────────────────────────────────────
const INTERVAL_OPTIONS = [
  { key: '5s',  label: '5 Sec',   ms: 5 * 1000,             display: 'Demo'    },
  { key: '5h',  label: '5 Hours', ms: 5  * 60 * 60 * 1000,  display: 'After 5h' },
  { key: '12h', label: '12 Hours',ms: 12 * 60 * 60 * 1000,  display: 'After 12h'},
];

// AsyncStorage key for reminder state
const REMINDER_STATE_KEY = 'sm_journal_reminder_state';

// ─────────────────────────────────────────────
// ✅ Check if user saved a journal entry today
// Reads from Firebase journal saved flag
// ─────────────────────────────────────────────
async function hasJournalEntryToday() {
  try {
    const raw = await AsyncStorage.getItem('sm_journal_saved_today');
    if (!raw) return false;
    const { date } = JSON.parse(raw);
    // Compare with local date
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return date === todayStr;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────
// ✅ SMJournalReminderCard
// Props:
//   enabled          : bool   — whether reminder toggle is ON
//   intervalKey      : string — '5s' | '5h' | '12h' | null
//   onIntervalChange : fn(key) — called when user picks interval
// ─────────────────────────────────────────────
export default function SMJournalReminderCard({
  enabled,
  intervalKey,
  onIntervalChange,
}) {
  const [secsLeft,    setSecsLeft]    = useState(0);
  const [totalSecs,   setTotalSecs]   = useState(0);
  const [isRunning,   setIsRunning]   = useState(false);
  const [cycleCount,  setCycleCount]  = useState(0);
  const [skippedLast, setSkippedLast] = useState(false);

  const barAnim    = useRef(new Animated.Value(1)).current; // 1 = full, 0 = empty
  const timerRef   = useRef(null);
  const endTimeRef = useRef(null); // absolute timestamp when timer ends

  // ── Load saved timer state on mount ─────────────────────────
  useEffect(() => {
    if (!enabled || !intervalKey) {
      stopTimer();
      return;
    }
    restoreOrStartTimer(intervalKey);
    return () => stopTimer();
  }, [enabled, intervalKey]);

  // ── Restore saved state or start fresh ──────────────────────
  const restoreOrStartTimer = async (key) => {
    try {
      const raw = await AsyncStorage.getItem(REMINDER_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Only restore if same interval and timer hasn't expired
        if (saved.intervalKey === key && saved.endTime > Date.now()) {
          endTimeRef.current = saved.endTime;
          const option = INTERVAL_OPTIONS.find(o => o.key === key);
          setTotalSecs(Math.round(option.ms / 1000));
          setCycleCount(saved.cycleCount || 0);
          startCountdown();
          return;
        }
      }
    } catch (e) {}
    // No valid saved state — start fresh
    startFreshTimer(key);
  };

  // ── Start a fresh timer cycle ────────────────────────────────
  const startFreshTimer = async (key) => {
    const option = INTERVAL_OPTIONS.find(o => o.key === key);
    if (!option) return;

    const durationSecs = Math.round(option.ms / 1000);
    const endTime      = Date.now() + option.ms;

    endTimeRef.current = endTime;
    setTotalSecs(durationSecs);
    setIsRunning(true);

    // Save state
    await AsyncStorage.setItem(REMINDER_STATE_KEY, JSON.stringify({
      intervalKey: key,
      endTime,
      cycleCount,
    }));

    startCountdown();
  };

  // ── Countdown tick ───────────────────────────────────────────
  const startCountdown = () => {
    stopTimer(); // clear any existing interval
    setIsRunning(true);

    timerRef.current = setInterval(async () => {
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setSecsLeft(remaining);

      // Animate bar: shrinks from 1 → 0 over the full duration
      if (totalSecs > 0) {
        barAnim.setValue(remaining / totalSecs);
      }

      // Timer finished
      if (remaining <= 0) {
        stopTimer();
        await onTimerFinished();
      }
    }, 500);
  };

  // ── Called when timer reaches 0 ──────────────────────────────
  const onTimerFinished = async () => {
    const savedToday = await hasJournalEntryToday();

    if (savedToday) {
      // User already saved journal today → skip, reset, start again
      console.log('📓 Journal already saved today — skipping notification');
      setSkippedLast(true);
      setCycleCount(c => c + 1);
      startFreshTimer(intervalKey);
      return;
    }

    // Send notification
    setSkippedLast(false);
    setCycleCount(c => c + 1);
    await sendJournalNotification();

    // Restart timer for next cycle
    startFreshTimer(intervalKey);
  };

  // ── Send push notification ───────────────────────────────────
  const sendJournalNotification = async () => {
    try {
      const channelId = await notifee.createChannel({
        id:   'journal_reminder',
        name: 'Journal Reminder',
      });

      await notifee.displayNotification({
        id:    'journal_reminder',
        title: '📓 Time to Journal',
        body:  'Take a moment to reflect on your day. How are you feeling? 💙',
        android: {
          channelId,
          smallIcon:   'ic_launcher',
          pressAction: { id: 'default' },
        },
      });

      console.log('📓 Journal reminder notification sent');
    } catch (e) {
      console.log('❌ Notification error:', e);
    }
  };

  // ── Stop timer ───────────────────────────────────────────────
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  };

  // ── Format seconds MM:SS or HH:MM:SS ────────────────────────
  const formatTime = (secs) => {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60).toString().padStart(2,'0');
      const s = (secs % 60).toString().padStart(2,'0');
      return `${h}:${m}:${s}`;
    }
    const m = Math.floor(secs / 60).toString().padStart(2,'0');
    const s = (secs % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };

  // ── Bar color based on time left ────────────────────────────
  const pct = totalSecs > 0 ? secsLeft / totalSecs : 0;
  const barColor =
    pct > 0.5 ? '#22C55E' :
    pct > 0.2 ? '#FFB800' :
    '#EF4444';

  // ── If not enabled, don't render ────────────────────────────
  if (!enabled) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Remind me after</Text>
      <Text style={styles.sub}>Choose when to receive your journal reminder.</Text>

      {/* ── Interval pills ── */}
      <View style={styles.pillRow}>
        {INTERVAL_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.pill, intervalKey === opt.key && styles.pillActive]}
            onPress={() => onIntervalChange(opt.key)}
          >
            <Text style={[styles.pillText, intervalKey === opt.key && styles.pillTextActive]}>
              {opt.label}
            </Text>
            <Text style={[styles.pillSub, intervalKey === opt.key && { color: '#22C55E' }]}>
              {opt.display}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Timer bar — only show when interval is selected ── */}
      {intervalKey && (
        <View style={styles.timerBox}>

          {/* Header row */}
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>
              {isRunning ? '⏱ Next reminder in' : '⏸ Paused'}
            </Text>
            <Text style={[styles.timerValue, { color: barColor }]}>
              {formatTime(secsLeft)}
            </Text>
          </View>

          {/* Animated progress bar */}
          <View style={styles.barBg}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: barAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: barColor,
                },
              ]}
            />
          </View>

          {/* Status text */}
          <Text style={styles.timerStatus}>
            {skippedLast
              ? `⏭ Last cycle skipped — journal already saved today`
              : cycleCount > 0
              ? `✅ Reminder sent ${cycleCount} time${cycleCount > 1 ? 's' : ''} — repeating`
              : `🔄 Repeats every ${INTERVAL_OPTIONS.find(o => o.key === intervalKey)?.label}`}
          </Text>

          {/* Cycle count badge */}
          {cycleCount > 0 && (
            <View style={styles.cycleBadge}>
              <Text style={styles.cycleText}>
                🔁 Cycle {cycleCount + 1} running
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── No interval selected yet ── */}
      {!intervalKey && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            👆 Select an interval above to start the reminder timer
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.20)',
  },
  title: { color: colors.text,  fontWeight: '800', fontSize: 13 },
  sub:   { color: colors.faint, fontSize: 12, marginTop: 4, marginBottom: spacing.sm },

  // ── Pills ──
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: spacing.sm },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    minWidth: 80,
  },
  pillActive: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: '#22C55E',
  },
  pillText:       { color: '#9CA3AF', fontWeight: '800', fontSize: 13 },
  pillTextActive: { color: '#22C55E' },
  pillSub:        { color: '#4B5563', fontSize: 10, marginTop: 2, fontWeight: '600' },

  // ── Timer ──
  timerBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  timerValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },

  barBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: { height: '100%', borderRadius: 999 },

  timerStatus: {
    color: colors.faint,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  cycleBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  cycleText: { color: '#22C55E', fontSize: 11, fontWeight: '800' },

  hintBox: {
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  hintText: { color: colors.faint, fontSize: 12, textAlign: 'center' },
});