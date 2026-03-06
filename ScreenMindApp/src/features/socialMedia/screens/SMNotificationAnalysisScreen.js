import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  AppState,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DashboardBackground from '../../../components/DashboardBackground';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import SMSectionTitle from '../components/SMSectionTitle';
import SMMiniCard from '../components/SMMiniCard';
import SMPrivacyStatusCard from '../components/SMPrivacyStatusCard';
import {
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
} from '../services/notificationListener.service';
import {
  loadAlertSettings,
  saveAlertSettings,
  SENSITIVITY_PRESETS,
  TIME_WINDOW_OPTIONS,
  MESSAGE_COUNT_OPTIONS,
} from '../services/smSettings.service';

const BUFFER_KEY = 'sm_message_buffer';

export default function SMNotificationAnalysisScreen() {
  const [notifAccessEnabled, setNotifAccessEnabled] = useState(false);
  const [monitorWhatsApp, setMonitorWhatsApp] = useState(true);
  const [monitorMessenger, setMonitorMessenger] = useState(false);
  const [monitorInstagram, setMonitorInstagram] = useState(false);
  const [alertHighRisk, setAlertHighRisk] = useState(true);
  const [dailyJournalReminder, setDailyJournalReminder] = useState(false);
  const [sensitivity, setSensitivity] = useState('Medium');
  const [negativeCount, setNegativeCount] = useState(5);
  const [timeWindowMins, setTimeWindowMins] = useState(5);

  // ── Live Window State ──────────────────────────────────────────
  const [activeCount, setActiveCount] = useState(0);
  const [oldestMsgAge, setOldestMsgAge] = useState(null);
  const [windowSecsLeft, setWindowSecsLeft] = useState(0);
  const timerRef = useRef(null);

  // ── Cooldown State ─────────────────────────────────────────────
  const [cooldownSecsLeft, setCooldownSecsLeft] = useState(0); // seconds remaining
  const [cooldownActive, setCooldownActive] = useState(false);

  const overallTone = 'Mixed';
  const tone = 'high';
  const toneConfig = {
    low: {
      bg: 'rgba(34,197,94,0.18)',
      text: '#22C55E',
      label: 'Low risk detected today.',
    },
    moderate: {
      bg: 'rgba(255,184,0,0.18)',
      text: '#FFB800',
      label: 'Mixed emotional signals detected.',
    },
    high: {
      bg: 'rgba(239,68,68,0.18)',
      text: '#EF4444',
      label: 'Higher negative signals detected today.',
    },
  };
  const toneUI = toneConfig[tone];
  const statusUI = useMemo(
    () =>
      notifAccessEnabled
        ? { label: 'ON', bg: 'rgba(34,197,94,0.16)', text: '#22C55E' }
        : { label: 'OFF', bg: 'rgba(239,68,68,0.14)', text: '#EF4444' },
    [notifAccessEnabled],
  );

  // ── Check notification permission ──────────────────────────────
  useEffect(() => {
    const checkPermission = async () => {
      const isGranted = await isNotificationAccessEnabled();
      setNotifAccessEnabled(isGranted);
    };
    checkPermission();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') checkPermission();
    });
    return () => subscription.remove();
  }, []);

  // ── Load saved settings ────────────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      const saved = await loadAlertSettings();
      setSensitivity(saved.sensitivity);
      setNegativeCount(saved.negativeCount);
      setTimeWindowMins(saved.timeWindowMins);
    };
    loadSettings();
  }, []);

  // ── Live Window + Cooldown Timer ───────────────────────────────
  // Reads buffer + cooldown every second
  useEffect(() => {
    const tick = async () => {
      try {
        // ── Buffer / window logic ──
        const raw = await AsyncStorage.getItem(BUFFER_KEY);
        if (!raw) {
          setActiveCount(0);
          setOldestMsgAge(null);
          setWindowSecsLeft(0);
        } else {
          const buffer = JSON.parse(raw);
          const windowMs = timeWindowMins * 60 * 1000;
          const cutoffTime = Date.now() - windowMs;
          const active = buffer.filter(item => {
            const msgTime = new Date(item.time).getTime();
            return msgTime >= cutoffTime;
          });
          setActiveCount(active.length);
          if (active.length > 0) {
            const oldestTime = Math.min(
              ...active.map(item => new Date(item.time).getTime()),
            );
            const ageMs = Date.now() - oldestTime;
            const secsLeft = Math.max(0, Math.round((windowMs - ageMs) / 1000));
            setOldestMsgAge(ageMs);
            setWindowSecsLeft(secsLeft);
          } else {
            setOldestMsgAge(null);
            setWindowSecsLeft(0);
          }
        }

        // ── Cooldown logic ──
        const cooldownRaw = await AsyncStorage.getItem('sm_alert_cooldown');
        if (cooldownRaw) {
          const { until } = JSON.parse(cooldownRaw);
          const secsLeft = Math.max(0, Math.round((until - Date.now()) / 1000));
          if (secsLeft > 0) {
            setCooldownActive(true);
            setCooldownSecsLeft(secsLeft);
          } else {
            setCooldownActive(false);
            setCooldownSecsLeft(0);
          }
        } else {
          setCooldownActive(false);
          setCooldownSecsLeft(0);
        }
      } catch (e) {}
    };

    tick(); // run immediately
    timerRef.current = setInterval(tick, 1000); // update every second
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeWindowMins]); // re-run if timeWindowMins changes

  // ── Format seconds as MM:SS ────────────────────────────────────
  const formatTime = secs => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Handlers ───────────────────────────────────────────────────
  const handleToggleAccess = async () => {
    await openNotificationAccessSettings();
  };

  const handleSensitivityChange = async level => {
    const preset = SENSITIVITY_PRESETS[level];
    setSensitivity(level);
    setNegativeCount(preset.negativeCount);
    setTimeWindowMins(preset.timeWindowMins);
    await saveAlertSettings({
      sensitivity: level,
      negativeCount: preset.negativeCount,
      timeWindowMins: preset.timeWindowMins,
    });
  };

  const handleCountChange = async count => {
    setNegativeCount(count);
    setSensitivity('Custom');
    await saveAlertSettings({
      sensitivity: 'Custom',
      negativeCount: count,
      timeWindowMins,
    });
  };

  const handleTimeChange = async mins => {
    setTimeWindowMins(mins);
    setSensitivity('Custom');
    await saveAlertSettings({
      sensitivity: 'Custom',
      negativeCount,
      timeWindowMins: mins,
    });
  };

  // ── Reset Cooldown ─────────────────────────────────────────────
  const handleResetCooldown = async () => {
    try {
      await AsyncStorage.removeItem('sm_alert_cooldown');
      setCooldownActive(false);
      setCooldownSecsLeft(0);
      console.log('🔓 Cooldown reset manually');
    } catch (e) {
      console.log('❌ Reset error:', e);
    }
  };

  // ── Overlay Permission ─────────────────────────────────────────
  const [overlayPermission, setOverlayPermission] = useState(false);

  useEffect(() => {
    const { OverlayModule } = require('react-native').NativeModules;
    if (OverlayModule) {
      OverlayModule.hasPermission(granted => {
        setOverlayPermission(granted);
      });
    }
  }, []);

  const handleRequestOverlayPermission = () => {
    const { OverlayModule } = require('react-native').NativeModules;
    if (OverlayModule) {
      OverlayModule.requestPermission();
    }
  };

  // ── Sub-components ─────────────────────────────────────────────
  const SettingRow = ({ title, subtitle, value, onChange }) => (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.settingSub}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: 'rgba(255,255,255,0.14)',
          true: 'rgba(34,197,94,0.35)',
        }}
        thumbColor={value ? '#22C55E' : '#9CA3AF'}
      />
    </View>
  );

  const PillButton = ({ label, active, onPress }) => (
    <TouchableOpacity
      style={[styles.pillBtn, active && styles.pillBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.pillBtnText, active && styles.pillBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // ── Progress bar fill % ────────────────────────────────────────
  const windowFillPct = Math.min(100, (activeCount / negativeCount) * 100);
  const windowTimePct =
    windowSecsLeft > 0
      ? Math.min(100, (windowSecsLeft / (timeWindowMins * 60)) * 100)
      : 0;
  const isWindowCritical = activeCount >= negativeCount;

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>EMOTIONAL FILTER</Text>
        <Text style={styles.title}>Notification Analysis</Text>
        <Text style={styles.sub}>
          Summarizes emotional exposure from incoming social notifications (no
          raw messages shown).
        </Text>

        <SMSectionTitle title="Today Summary" subtitle="" />
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Overall Tone</Text>
              <Text style={styles.summaryValue}>{overallTone}</Text>
              <View style={[styles.toneBadge, { backgroundColor: toneUI.bg }]}>
                <Text
                  style={[styles.toneText, { color: toneUI.text }]}
                  numberOfLines={2}
                >
                  {toneUI.label}
                </Text>
              </View>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Today</Text>
            </View>
          </View>
          <View style={{ height: spacing.md }} />
          <View style={styles.row}>
            <SMMiniCard
              label="Negative"
              value="6"
              sub="Msgs detected"
              tint="rgba(233, 12, 12, 0.24)"
            />
            <SMMiniCard
              label="Positive"
              value="3"
              sub="Msgs detected"
              tint="rgba(10, 235, 92, 0.24)"
            />
          </View>
          <View style={{ height: spacing.md }} />
          <View style={styles.row}>
            <SMMiniCard
              label="Absolutist"
              value="2"
              sub="Markers seen"
              tint="rgba(109, 30, 247, 0.26)"
            />
            <SMMiniCard
              label="Masking"
              value="No"
              sub="Emoji conflict"
              tint="rgba(6, 173, 250, 0.33)"
            />
          </View>
        </View>

        <SMPrivacyStatusCard />

        <SMSectionTitle
          title="Settings"
          subtitle="Manage notification access and alerts."
        />

        <View style={styles.ethicsCard}>
          <View style={styles.masterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>
                Enable notification analysis
              </Text>
              <Text style={styles.masterSub}>
                Turn on to monitor selected apps and allow risk alerts.
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusUI.bg }]}
            >
              <Text style={[styles.statusText, { color: statusUI.text }]}>
                {statusUI.label}
              </Text>
            </View>
            <Switch
              value={notifAccessEnabled}
              onValueChange={handleToggleAccess}
              trackColor={{
                false: 'rgba(255,255,255,0.14)',
                true: 'rgba(34,197,94,0.35)',
              }}
              thumbColor={notifAccessEnabled ? '#22C55E' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* ── Overlay Permission Card ── */}
        <View style={{ height: spacing.md }} />
        <View
          style={[
            styles.ethicsCard,
            {
              borderColor: overlayPermission
                ? 'rgba(34,197,94,0.35)'
                : 'rgba(239,68,68,0.35)',
            },
          ]}
        >
          <View style={styles.masterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>🪟 Draw Over Other Apps</Text>
              <Text style={styles.masterSub}>
                Required to show emotional alerts on top of any app or home
                screen.
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: overlayPermission
                    ? 'rgba(34,197,94,0.16)'
                    : 'rgba(239,68,68,0.14)',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: overlayPermission ? '#22C55E' : '#EF4444' },
                ]}
              >
                {overlayPermission ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
          {!overlayPermission && (
            <>
              <View style={{ height: spacing.sm }} />
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleRequestOverlayPermission}
              >
                <Text style={styles.resetBtnText}>
                  ⚙️ Grant Permission — Draw Over Apps
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {notifAccessEnabled && (
          <>
            <View style={{ height: spacing.md }} />
            <View style={styles.settingsCard}>
              {/* ── App Monitor Toggles ── */}
              <Text style={styles.groupTitle}>Control Access</Text>
              <Text style={styles.groupSub}>
                Choose which apps to monitor for risk signals.
              </Text>
              <View style={{ height: spacing.sm }} />
              <SettingRow
                title="Monitor WhatsApp"
                subtitle="Analyze notification tone & frequency"
                value={monitorWhatsApp}
                onChange={setMonitorWhatsApp}
              />
              <SettingRow
                title="Monitor Messenger"
                subtitle="Analyze notification tone & frequency"
                value={monitorMessenger}
                onChange={setMonitorMessenger}
              />
              <SettingRow
                title="Monitor Instagram"
                subtitle="Analyze notification tone & frequency"
                value={monitorInstagram}
                onChange={setMonitorInstagram}
              />

              <View style={styles.divider} />

              {/* ── Push Notifications ── */}
              <Text style={styles.groupTitle}>Push Notifications</Text>
              <Text style={styles.groupSub}>
                Personal reminders and safety alerts.
              </Text>
              <View style={{ height: spacing.sm }} />
              <SettingRow
                title="Alert me on High Risk"
                subtitle="Get notified when risk goes above threshold"
                value={alertHighRisk}
                onChange={setAlertHighRisk}
              />
              <SettingRow
                title="Daily Journal Reminder"
                subtitle="Gentle daily prompt to reflect"
                value={dailyJournalReminder}
                onChange={setDailyJournalReminder}
              />

              <View style={styles.divider} />

              {/* ── Alert Threshold ── */}
              <Text style={styles.groupTitle}>Alert Threshold</Text>
              <Text style={styles.groupSub}>
                Customize when to trigger a mental health alert.
              </Text>
              <View style={{ height: spacing.sm }} />

              <Text style={styles.settingTitle}>Sensitivity Level</Text>
              <Text style={styles.settingSub}>
                {sensitivity === 'Low' &&
                  'Triggers after 7 negative msgs in 15 mins'}
                {sensitivity === 'Medium' &&
                  'Triggers after 5 negative msgs in 5 mins'}
                {sensitivity === 'High' &&
                  'Triggers after 3 negative msgs in 3 mins'}
                {sensitivity === 'Custom' &&
                  `Custom: ${negativeCount} msgs in ${timeWindowMins} mins`}
              </Text>
              <View style={styles.pillRow}>
                {['Low', 'Medium', 'High'].map(level => (
                  <PillButton
                    key={level}
                    label={level}
                    active={sensitivity === level}
                    onPress={() => handleSensitivityChange(level)}
                  />
                ))}
              </View>

              <View style={{ height: spacing.md }} />
              <Text style={styles.settingTitle}>
                Time Window:{' '}
                <Text style={{ color: '#00E0FF' }}>{timeWindowMins} mins</Text>
              </Text>
              <Text style={styles.settingSub}>
                How far back to count negative messages.
              </Text>
              <View style={styles.pillRow}>
                {TIME_WINDOW_OPTIONS.map(mins => (
                  <PillButton
                    key={mins}
                    label={`${mins}m`}
                    active={timeWindowMins === mins}
                    onPress={() => handleTimeChange(mins)}
                  />
                ))}
              </View>

              <View style={{ height: spacing.md }} />
              <Text style={styles.settingTitle}>
                Negative Messages:{' '}
                <Text style={{ color: '#00E0FF' }}>{negativeCount}</Text>
              </Text>
              <Text style={styles.settingSub}>
                How many negative messages trigger an alert.
              </Text>
              <View style={styles.pillRow}>
                {MESSAGE_COUNT_OPTIONS.map(count => (
                  <PillButton
                    key={count}
                    label={`${count}`}
                    active={negativeCount === count}
                    onPress={() => handleCountChange(count)}
                  />
                ))}
              </View>

              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  🔔 Alert triggers after{' '}
                  <Text style={{ color: '#EF4444', fontWeight: '900' }}>
                    {negativeCount} negative
                  </Text>{' '}
                  messages in{' '}
                  <Text style={{ color: '#00E0FF', fontWeight: '900' }}>
                    {timeWindowMins} mins
                  </Text>
                </Text>
              </View>

              <View style={styles.divider} />

              {/* ── ⏱️ LIVE WINDOW MONITOR ── */}
              <Text style={styles.groupTitle}>⏱️ Live Window Monitor</Text>
              <Text style={styles.groupSub}>
                Real-time view of your active message window. Resets
                automatically as messages expire.
              </Text>
              <View style={{ height: spacing.sm }} />

              {/* Message count progress bar */}
              <View style={styles.liveRow}>
                <Text style={styles.liveLabel}>Messages in window</Text>
                <Text
                  style={[
                    styles.liveValue,
                    { color: isWindowCritical ? '#EF4444' : '#00E0FF' },
                  ]}
                >
                  {activeCount} / {negativeCount}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${windowFillPct}%`,
                      backgroundColor: isWindowCritical ? '#EF4444' : '#00E0FF',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressSub}>
                {activeCount === 0
                  ? '✅ Window is empty — no active messages'
                  : isWindowCritical
                  ? '🚨 Threshold reached — alert triggered!'
                  : `📨 ${
                      negativeCount - activeCount
                    } more negative msg(s) needed to trigger`}
              </Text>

              <View style={{ height: spacing.md }} />

              {/* Time countdown bar */}
              <View style={styles.liveRow}>
                <Text style={styles.liveLabel}>Window resets in</Text>
                <Text style={[styles.liveValue, { color: '#FFB800' }]}>
                  {activeCount > 0 ? formatTime(windowSecsLeft) : '--:--'}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${windowTimePct}%`,
                      backgroundColor: '#FFB800',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressSub}>
                {activeCount > 0
                  ? `🕒 Oldest message expires in ${formatTime(windowSecsLeft)}`
                  : '✅ No messages — window is clear'}
              </Text>
            </View>

            {/* ── ⏸️ COOLDOWN TIMER CARD ── */}
            <View style={{ height: spacing.md }} />
            <View
              style={[
                styles.settingsCard,
                cooldownActive && styles.cooldownCardActive,
              ]}
            >
              <View style={styles.cooldownHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupTitle}>⏸️ Alert Cooldown</Text>
                  <Text style={styles.groupSub}>
                    Active after tapping "I Manage It" on the alert overlay. No
                    new alerts will fire during this period.
                  </Text>
                </View>
                {/* Status badge */}
                <View
                  style={[
                    styles.cooldownBadge,
                    {
                      backgroundColor: cooldownActive
                        ? 'rgba(255,184,0,0.15)'
                        : 'rgba(34,197,94,0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cooldownBadgeText,
                      { color: cooldownActive ? '#FFB800' : '#22C55E' },
                    ]}
                  >
                    {cooldownActive ? '⏸ PAUSED' : '▶ ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={{ height: spacing.md }} />

              {cooldownActive ? (
                <>
                  {/* Countdown display */}
                  <View style={styles.countdownBox}>
                    <Text style={styles.countdownLabel}>Alerts resume in</Text>
                    <Text style={styles.countdownValue}>
                      {formatTime(cooldownSecsLeft)}
                    </Text>
                    <Text style={styles.countdownSub}>mm : ss</Text>
                  </View>

                  <View style={{ height: spacing.md }} />

                  {/* Cooldown progress bar */}
                  <View style={styles.liveRow}>
                    <Text style={styles.liveLabel}>Time remaining</Text>
                    <Text
                      style={[
                        styles.liveValue,
                        { color: '#FFB800', fontSize: 16 },
                      ]}
                    >
                      {Math.ceil(cooldownSecsLeft / 60)} min left
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${(cooldownSecsLeft / (30 * 60)) * 100}%`,
                          backgroundColor: '#FFB800',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressSub}>
                    ⏸ Overlay alerts are paused — you said you'll manage it 💪
                  </Text>

                  <View style={{ height: spacing.md }} />

                  {/* Reset button */}
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={handleResetCooldown}
                  >
                    <Text style={styles.resetBtnText}>
                      🔓 Reset Cooldown — Re-enable Alerts Now
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.cooldownClearBox}>
                  <Text style={styles.cooldownClearIcon}>✅</Text>
                  <Text style={styles.cooldownClearTitle}>
                    Alerts are active
                  </Text>
                  <Text style={styles.cooldownClearSub}>
                    No cooldown running. You will receive overlay alerts when
                    high risk is detected.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: '900', letterSpacing: 2.5 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  sub: {
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start' },
  summaryTitle: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  toneBadge: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  toneText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,224,255,0.10)',
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.md,
  },
  pillText: { color: colors.text, fontWeight: '900', fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.md },
  ethicsCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: spacing.md,
  },
  masterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  masterTitle: { color: colors.text, fontWeight: '900', fontSize: 13 },
  masterSub: {
    color: colors.faint,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statusText: { fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  settingsCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  groupTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  groupSub: { color: colors.muted, marginTop: 6, fontSize: 12, lineHeight: 16 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  settingSub: {
    color: colors.faint,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillBtnActive: {
    backgroundColor: 'rgba(0,224,255,0.15)',
    borderColor: '#00E0FF',
  },
  pillBtnText: { color: '#9CA3AF', fontWeight: '700', fontSize: 13 },
  pillBtnTextActive: { color: '#00E0FF' },
  summaryBadge: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  summaryBadgeText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  // ── Live Window Monitor styles ──
  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  liveValue: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 999 },
  progressSub: {
    color: colors.faint,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },

  // ── Cooldown Timer styles ──
  cooldownCardActive: {
    borderColor: 'rgba(255,184,0,0.35)',
    backgroundColor: 'rgba(255,184,0,0.04)',
  },
  cooldownHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cooldownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 2,
  },
  cooldownBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  countdownBox: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.25)',
  },
  countdownLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  countdownValue: {
    color: '#FFB800',
    fontSize: 52,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  countdownSub: {
    color: colors.faint,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 4,
  },
  resetBtn: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  resetBtnText: { color: '#22C55E', fontWeight: '900', fontSize: 13 },
  cooldownClearBox: { alignItems: 'center', paddingVertical: 20 },
  cooldownClearIcon: { fontSize: 32, marginBottom: 8 },
  cooldownClearTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 6,
  },
  cooldownClearSub: {
    color: colors.faint,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
