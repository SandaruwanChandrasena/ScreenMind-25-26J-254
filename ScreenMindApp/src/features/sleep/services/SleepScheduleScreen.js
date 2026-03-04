// src/features/sleep/screens/SleepScheduleScreen.js

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import {
  saveSleepSchedule,
  loadSleepSchedule,
  formatTime,
  to12Hour,
  to24Hour,
  clearSettingsCache,
} from "../services/sleepSettingsService";

// Hour options for picker (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Minute options (00, 15, 30, 45)
const MINUTES = [0, 15, 30, 45];

// AM/PM options
const PERIODS = ["AM", "PM"];

function TimeSelector({ label, hour24, minute, onChange }) {
  const { hour, period } = to12Hour(hour24, minute);

  function selectHour(h) {
    const result = to24Hour(h, minute, period);
    onChange(result.hour, result.minute);
  }

  function selectMinute(m) {
    const result = to24Hour(hour, m, period);
    onChange(result.hour, result.minute);
  }

  function selectPeriod(p) {
    const result = to24Hour(hour, minute, p);
    onChange(result.hour, result.minute);
  }

  return (
    <View style={styles.timeSelectorWrap}>
      <Text style={styles.timeSelectorLabel}>{label}</Text>

      <Text style={styles.timeDisplay}>
        {formatTime(hour24, minute)}
      </Text>

      {/* Hour picker */}
      <Text style={styles.pickerLabel}>Hour</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pickerRow}
      >
        {HOURS.map((h) => (
          <Pressable
            key={h}
            onPress={() => selectHour(h)}
            style={[
              styles.pickerChip,
              hour === h && styles.pickerChipActive,
            ]}
          >
            <Text
              style={[
                styles.pickerChipText,
                hour === h && styles.pickerChipTextActive,
              ]}
            >
              {h}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Minute picker */}
      <Text style={styles.pickerLabel}>Minute</Text>
      <View style={styles.minuteRow}>
        {MINUTES.map((m) => (
          <Pressable
            key={m}
            onPress={() => selectMinute(m)}
            style={[
              styles.pickerChip,
              minute === m && styles.pickerChipActive,
            ]}
          >
            <Text
              style={[
                styles.pickerChipText,
                minute === m && styles.pickerChipTextActive,
              ]}
            >
              {String(m).padStart(2, "0")}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* AM/PM picker */}
      <Text style={styles.pickerLabel}>AM / PM</Text>
      <View style={styles.minuteRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => selectPeriod(p)}
            style={[
              styles.pickerChip,
              styles.periodChip,
              period === p && styles.pickerChipActive,
            ]}
          >
            <Text
              style={[
                styles.pickerChipText,
                period === p && styles.pickerChipTextActive,
              ]}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SleepScheduleScreen({ navigation }) {
  const [bedtimeHour, setBedtimeHour] = useState(22);
  const [bedtimeMinute, setBedtimeMinute] = useState(0);
  const [waketimeHour, setWaketimeHour] = useState(7);
  const [waketimeMinute, setWaketimeMinute] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    loadExistingSettings();
  }, []);

  async function loadExistingSettings() {
    try {
      const settings = await loadSleepSchedule();
      setBedtimeHour(settings.bedtimeHour);
      setBedtimeMinute(settings.bedtimeMinute);
      setWaketimeHour(settings.waketimeHour);
      setWaketimeMinute(settings.waketimeMinute);
    } catch (e) {
      console.log("Load settings error:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleBedtimeChange(hour, minute) {
    setBedtimeHour(hour);
    setBedtimeMinute(minute);
  }

  function handleWaketimeChange(hour, minute) {
    setWaketimeHour(hour);
    setWaketimeMinute(minute);
  }

  async function handleSave() {
    try {
      setSaving(true);

      await saveSleepSchedule({
        userId: null,
        bedtimeHour,
        bedtimeMinute,
        waketimeHour,
        waketimeMinute,
      });

      clearSettingsCache();

      Alert.alert(
        "Saved ✅",
        `Your sleep window is now:\n` +
        `Bedtime: ${formatTime(bedtimeHour, bedtimeMinute)}\n` +
        `Wake time: ${formatTime(waketimeHour, waketimeMinute)}\n\n` +
        `The app will use these times to track your ` +
        `night-time phone usage accurately.`
      );

      navigation.goBack();

    } catch (e) {
      console.log("Save schedule error:", e);
      Alert.alert("Error", "Could not save your sleep schedule.");
    } finally {
      setSaving(false);
    }
  }

  // Calculate night window duration for display
  function getNightWindowDuration() {
    const bedMins = bedtimeHour * 60 + bedtimeMinute;
    const wakeMins = waketimeHour * 60 + waketimeMinute;

    let duration;
    if (bedMins > wakeMins) {
      // Crosses midnight
      duration = (24 * 60 - bedMins) + wakeMins;
    } else {
      duration = wakeMins - bedMins;
    }

    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h ${mins > 0 ? mins + "m" : ""}`;
  }

  if (loading) {
    return (
      <DashboardBackground>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </DashboardBackground>
    );
  }

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Sleep Schedule</Text>
        <Text style={styles.sub}>
          Set your personal bedtime and wake time.{"\n"}
          The app tracks night-time phone usage based
          on YOUR schedule, not a fixed time.
        </Text>

        {/* Night window summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            Your night window
          </Text>
          <Text style={styles.summaryValue}>
            {formatTime(bedtimeHour, bedtimeMinute)}
            {"  →  "}
            {formatTime(waketimeHour, waketimeMinute)}
          </Text>
          <Text style={styles.summaryDuration}>
            Duration: {getNightWindowDuration()}
          </Text>
        </View>

        <View style={{ height: spacing.md }} />

        {/* Bedtime selector */}
        <View style={styles.card}>
          <Text style={styles.sectionIcon}>🌙</Text>
          <TimeSelector
            label="Bedtime"
            hour24={bedtimeHour}
            minute={bedtimeMinute}
            onChange={handleBedtimeChange}
          />
        </View>

        <View style={{ height: spacing.md }} />

        {/* Wake time selector */}
        <View style={styles.card}>
          <Text style={styles.sectionIcon}>☀️</Text>
          <TimeSelector
            label="Wake Time"
            hour24={waketimeHour}
            minute={waketimeMinute}
            onChange={handleWaketimeChange}
          />
        </View>

        <View style={{ height: spacing.md }} />

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            💡 How this affects your data
          </Text>
          <Text style={styles.infoText}>
            • Notifications received during your night
            window are marked as night notifications
          </Text>
          <Text style={styles.infoText}>
            • Phone unlocks during this window count
            as sleep interruptions
          </Text>
          <Text style={styles.infoText}>
            • Screen time during this window contributes
            to your sleep disruption risk score
          </Text>
          <Text style={styles.infoText}>
            • Evening reminders will be sent 30 minutes
            before your bedtime
          </Text>
        </View>

        <View style={{ height: spacing.lg }} />

        <PrimaryButton
          title={saving ? "Saving..." : "Save Schedule"}
          onPress={handleSave}
          disabled={saving}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.muted,
    fontWeight: "800",
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
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.30)",
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: "center",
  },
  summaryLabel: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 12,
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 22,
    marginTop: 8,
  },
  summaryDuration: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 12,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },
  sectionIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  timeSelectorWrap: {},
  timeSelectorLabel: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 6,
  },
  timeDisplay: {
    color: "rgba(124,58,237,0.9)",
    fontWeight: "900",
    fontSize: 32,
    marginBottom: spacing.md,
  },
  pickerLabel: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  pickerRow: {
    marginBottom: 4,
  },
  minuteRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  pickerChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  periodChip: {
    width: 72,
  },
  pickerChipActive: {
    backgroundColor: "rgba(124,58,237,0.30)",
    borderColor: "rgba(124,58,237,0.50)",
  },
  pickerChipText: {
    color: colors.muted,
    fontWeight: "900",
    fontSize: 14,
  },
  pickerChipTextActive: {
    color: colors.text,
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.lg,
    gap: 10,
  },
  infoTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
    marginBottom: 4,
  },
  infoText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});