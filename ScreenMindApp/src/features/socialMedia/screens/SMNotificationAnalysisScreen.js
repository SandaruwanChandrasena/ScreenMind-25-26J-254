import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import DashboardBackground from '../../../components/DashboardBackground';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import SMSectionTitle from '../components/SMSectionTitle';
import SMMiniCard from '../components/SMMiniCard';
import SMPrivacyStatusCard from '../components/SMPrivacyStatusCard';

export default function SMNotificationAnalysisScreen() {
  // ✅ Master toggle (show/hide advanced settings)
  const [notifAccessEnabled, setNotifAccessEnabled] = useState(false);

  // ✅ Advanced settings (only relevant when master ON)
  const [monitorWhatsApp, setMonitorWhatsApp] = useState(true);
  const [monitorMessenger, setMonitorMessenger] = useState(false);
  const [monitorInstagram, setMonitorInstagram] = useState(false);

  const [alertHighRisk, setAlertHighRisk] = useState(true);
  const [dailyJournalReminder, setDailyJournalReminder] = useState(false);

  // dummy placeholders (later replace from backend)
  const overallTone = 'Mixed';
  const tone = 'high'; // "low" | "moderate" | "high"

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

  const statusUI = useMemo(() => {
    return notifAccessEnabled
      ? { label: 'ON', bg: 'rgba(34,197,94,0.16)', text: '#22C55E' }
      : { label: 'OFF', bg: 'rgba(239,68,68,0.14)', text: '#EF4444' };
  }, [notifAccessEnabled]);

  const SettingRow = ({ title, subtitle, value, onChange }) => {
    return (
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
  };

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

        <SMSectionTitle
          title="Today Summary"
          subtitle="Placeholders until the listener + backend are connected."
        />

        {/* ✅ Premium Today Summary Container */}
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
              tint="rgba(239,68,68,0.24)"
            />
            <SMMiniCard
              label="Positive"
              value="3"
              sub="Msgs detected"
              tint="rgba(34,197,94,0.24)"
            />
          </View>

          <View style={{ height: spacing.md }} />

          <View style={styles.row}>
            <SMMiniCard
              label="Absolutist"
              value="2"
              sub="Markers seen"
              tint="rgba(124,58,237,0.26)"
            />
            <SMMiniCard
              label="Masking"
              value="No"
              sub="Emoji conflict"
              tint="rgba(14,165,233,0.24)"
            />
          </View>
        </View>

        <SMPrivacyStatusCard />

        {/* ✅ Ethics Note (keep visible until master toggle) */}
        <SMSectionTitle
          title="Settings"
          subtitle="Manage notification access and alerts."
        />

        <View style={styles.ethicsCard}>
          {/* ✅ Master toggle row */}
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
              onValueChange={setNotifAccessEnabled}
              trackColor={{
                false: 'rgba(255,255,255,0.14)',
                true: 'rgba(34,197,94,0.35)',
              }}
              thumbColor={notifAccessEnabled ? '#22C55E' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* ✅ Advanced settings (ONLY if enabled) */}
        {notifAccessEnabled && (
          <>
            <View style={{ height: spacing.md }} />

            <View style={styles.settingsCard}>
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

  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
});
