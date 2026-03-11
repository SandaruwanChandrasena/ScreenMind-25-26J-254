import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import {
  saveMorningCheckIn,
  getLatestCompletedSession,
  getMorningCheckInForSession,
} from "../services/sleepRepository";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(date) {
  if (!date) return "--:--";
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
}

// ─── inline time picker (no external library) ────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);  // 1-12
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const AMPM = ["AM", "PM"];

function TimePicker({ visible, initDate, onConfirm, onCancel }) {
  const [hour, setHour] = useState(1);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState("AM");

  useEffect(() => {
    if (visible && initDate) {
      const h = initDate.getHours();
      setHour(h % 12 === 0 ? 12 : h % 12);
      // Round to nearest 5 minutes
      const raw = initDate.getMinutes();
      setMinute(Math.round(raw / 5) * 5 % 60);
      setAmpm(h >= 12 ? "PM" : "AM");
    }
  }, [visible, initDate]);

  const handleConfirm = () => {
    const h = ampm === "PM" ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const d = initDate ? new Date(initDate) : new Date();
    d.setHours(h, minute, 0, 0);
    onConfirm(d);
  };

  const ColPicker = ({ data, selected, onSelect, format = (v) => String(v) }) => (
    <FlatList
      data={data}
      style={styles.pickerCol}
      showsVerticalScrollIndicator={false}
      keyExtractor={(item) => String(item)}
      renderItem={({ item }) => {
        const active = item === selected;
        return (
          <Pressable
            onPress={() => onSelect(item)}
            style={[styles.pickerItem, active && styles.pickerItemActive]}
          >
            <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]}>
              {format(item)}
            </Text>
          </Pressable>
        );
      }}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>Select Time</Text>

          <View style={styles.pickerRow}>
            <ColPicker data={HOURS} selected={hour} onSelect={setHour} format={(v) => String(v).padStart(2, "0")} />
            <Text style={styles.pickerColon}>:</Text>
            <ColPicker data={MINUTES} selected={minute} onSelect={setMinute} format={(v) => String(v).padStart(2, "0")} />
            <ColPicker data={AMPM} selected={ampm} onSelect={setAmpm} />
          </View>

          <View style={styles.pickerActions}>
            <Pressable onPress={onCancel} style={styles.pickerCancel}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={styles.pickerConfirm}>
              <Text style={styles.pickerConfirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Segmented scale bar 0-10 with colour gradient feel */
function ScaleBar({ value, onChange, min = 0, max = 10 }) {
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View>
      <View style={styles.scaleRow}>
        {items.map((n) => {
          const active = n <= value;
          const ratio = n / max;
          let segColor = "rgba(239,68,68,0.70)";
          if (ratio > 0.7) segColor = "rgba(34,197,94,0.70)";
          else if (ratio > 0.4) segColor = "rgba(245,158,11,0.70)";
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[
                styles.scaleSeg,
                active && { backgroundColor: segColor, borderColor: segColor },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabelText}>0 · poor</Text>
        <Text style={[styles.scaleLabelText, { color: colors.text, fontWeight: "900" }]}>
          {value} / {max}
        </Text>
        <Text style={styles.scaleLabelText}>10 · great</Text>
      </View>
    </View>
  );
}

/** Yes / No pills */
function YesNoPills({ value, setValue }) {
  return (
    <View style={styles.pillsRow}>
      {["Yes", "No"].map((opt) => {
        const active = value === opt;
        const activeColor =
          opt === "Yes" ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.22)";
        return (
          <Pressable
            key={opt}
            onPress={() => setValue(opt)}
            style={[
              styles.pill,
              active && { backgroundColor: activeColor, borderColor: "rgba(255,255,255,0.18)" },
            ]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt === "Yes" ? "✓ Yes" : "✗ No"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Emoji mood selector for "feeling refreshed" */
const MOODS = [
  { emoji: "😴", label: "Exhausted", value: 2 },
  { emoji: "😐", label: "Tired", value: 4 },
  { emoji: "🙂", label: "Okay", value: 6 },
  { emoji: "😊", label: "Good", value: 8 },
  { emoji: "😄", label: "Great", value: 10 },
];

function MoodSelector({ value, onChange }) {
  return (
    <View style={styles.moodRow}>
      {MOODS.map((m) => {
        const active = value >= m.value - 1 && value <= m.value + 1;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            style={[styles.moodItem, active && styles.moodItemActive]}
          >
            <Text style={styles.moodEmoji}>{m.emoji}</Text>
            <Text style={[styles.moodLabel, active && { color: colors.text }]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tappable time chip */
function TimeChip({ label, date, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.timeChip} activeOpacity={0.75}>
      <Text style={styles.timeChipLabel}>{label}</Text>
      <Text style={styles.timeChipValue}>{formatTime(date)}</Text>
      <Text style={styles.timeChipEdit}>Tap to change</Text>
    </TouchableOpacity>
  );
}

/** Progress fill dots */
function StepDots({ total, current }) {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < current && styles.dotActive]} />
      ))}
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function MorningCheckInScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);
  const [alreadySaved, setAlreadySaved] = useState(false);

  // Time picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // "sleep" | "wake"
  const [pickerInitDate, setPickerInitDate] = useState(null);

  // Form values
  const [sleepDate, setSleepDate] = useState(null);
  const [wakeDate, setWakeDate] = useState(null);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [refreshed, setRefreshed] = useState(6);
  const [wokeUp, setWokeUp] = useState("No");
  const [headache, setHeadache] = useState("No");
  const [dryMouth, setDryMouth] = useState("No");
  const [snoreUsed, setSnoreUsed] = useState("No");

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await getLatestCompletedSession(null);
      if (latest) {
        setSession(latest);
        setSleepDate(new Date(latest.start_time));
        setWakeDate(new Date(latest.end_time ?? Date.now()));

        const existing = await getMorningCheckInForSession(latest.id);
        if (existing) {
          setAlreadySaved(true);
          setSleepQuality(existing.sleep_quality ?? 7);
          setRefreshed(existing.refreshed ?? 6);
          setWokeUp(existing.woke_up ?? "No");
          setHeadache(existing.headache ?? "No");
          setDryMouth(existing.dry_mouth ?? "No");
          setSnoreUsed(existing.snore_used ?? "No");
        }
      }
    } catch (e) {
      console.log("MorningCheckIn load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  const openPicker = (target) => {
    setPickerTarget(target);
    setPickerInitDate(target === "sleep" ? sleepDate : wakeDate);
    setPickerVisible(true);
  };

  const handlePickerConfirm = (date) => {
    setPickerVisible(false);
    if (pickerTarget === "sleep") setSleepDate(date);
    else setWakeDate(date);
  };

  const submit = async () => {
    if (!session) {
      Alert.alert("No session", "Complete a sleep session first.");
      return;
    }
    setSaving(true);
    try {
      await saveMorningCheckIn({
        userId: null,
        sessionId: session.id,
        sleepQuality, refreshed,
        wokeUp, headache, dryMouth, snoreUsed,
        ts: Date.now(),
      });
      Alert.alert(
        "Saved ✅",
        "Morning check-in saved! Your sleep score has been updated.",
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.log("Check-in save error:", e);
      Alert.alert("Error", "Could not save check-in.");
    } finally {
      setSaving(false);
    }
  };

  // ── render ──────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </DashboardBackground>
    );
  }

  if (!session) {
    return (
      <DashboardBackground>
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>😴</Text>
          <Text style={styles.emptyTitle}>No session found</Text>
          <Text style={styles.emptySub}>
            Start and stop a sleep session before filling in the morning check-in.
          </Text>
          <PrimaryButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </DashboardBackground>
    );
  }

  return (
    <DashboardBackground>
      {/* Inline time picker modal */}
      <TimePicker
        visible={pickerVisible}
        initDate={pickerInitDate}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerVisible(false)}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>MORNING CHECK-IN</Text>
            <Text style={styles.title}>How did you sleep?</Text>
            <Text style={styles.sub}>Takes ~30 seconds · Session #{session.id}</Text>
          </View>
          {alreadySaved && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>✓ Saved</Text>
            </View>
          )}
        </View>

        <StepDots total={4} current={4} />

        <View style={{ height: spacing.lg }} />

        {/* Section 1: Times */}
        <Card style={{ marginBottom: spacing.md }}>
          <SectionHeader icon="🌙" title="Sleep & Wake Times" sub="Tap to adjust if needed" />
          <View style={styles.timeRow}>
            <TimeChip
              label="Went to bed"
              date={sleepDate}
              onPress={() => openPicker("sleep")}
            />
            <TimeChip
              label="Woke up"
              date={wakeDate}
              onPress={() => openPicker("wake")}
            />
          </View>
        </Card>

        {/* Section 2: Sleep quality */}
        <Card style={{ marginBottom: spacing.md }}>
          <SectionHeader
            icon="💤"
            title="Sleep Quality"
            sub="How well did you sleep overall?"
          />
          <View style={styles.bigScoreRow}>
            <Text style={styles.bigScore}>{sleepQuality}</Text>
            <Text style={styles.bigScoreSub}>/ 10</Text>
          </View>
          <ScaleBar value={sleepQuality} onChange={setSleepQuality} />
        </Card>

        {/* Section 3: Morning energy */}
        <Card style={{ marginBottom: spacing.md }}>
          <SectionHeader
            icon="⚡"
            title="Morning Energy"
            sub="How refreshed do you feel right now?"
          />
          <MoodSelector value={refreshed} onChange={setRefreshed} />
          <View style={{ height: spacing.sm }} />
          <ScaleBar value={refreshed} onChange={setRefreshed} />
        </Card>

        {/* Section 4: Symptoms */}
        <Card style={{ marginBottom: spacing.md }}>
          <SectionHeader icon="🤒" title="Symptoms" sub="Any of these this morning?" />

          <View style={{ height: spacing.sm }} />
          <Text style={styles.fieldLabel}>Headache?</Text>
          <YesNoPills value={headache} setValue={setHeadache} />

          <View style={{ height: spacing.sm }} />
          <Text style={styles.fieldLabel}>Dry mouth?</Text>
          <YesNoPills value={dryMouth} setValue={setDryMouth} />
        </Card>

        {/* Section 5: Last night */}
        <Card style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon="🔍" title="Last Night" />

          <View style={{ height: spacing.sm }} />
          <Text style={styles.fieldLabel}>Did you wake up during the night?</Text>
          <YesNoPills value={wokeUp} setValue={setWokeUp} />

          <View style={{ height: spacing.sm }} />
          <Text style={styles.fieldLabel}>Did you enable snoring detection?</Text>
          <YesNoPills value={snoreUsed} setValue={setSnoreUsed} />
        </Card>

        {/* Submit */}
        <PrimaryButton
          title={saving ? "Saving..." : alreadySaved ? "Update Check-In" : "Save Check-In ✓"}
          onPress={submit}
          disabled={saving}
          style={{ backgroundColor: saving ? "rgba(124,58,237,0.4)" : colors.primary }}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  loadingText: { color: colors.muted, marginTop: spacing.md, fontWeight: "700" },
  emptyEmoji: { fontSize: 52, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  emptySub: { color: colors.muted, marginTop: 8, lineHeight: 20, textAlign: "center" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  overline: { color: colors.primary, fontWeight: "900", fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 4, fontSize: 12 },

  savedBadge: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  savedBadgeText: { color: "#22C55E", fontWeight: "900", fontSize: 12 },

  dotRow: { flexDirection: "row", gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)" },
  dotActive: { backgroundColor: colors.primary },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.md },
  sectionIconWrap: {
    width: 40, height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  sectionSub: { color: colors.faint, fontSize: 11, marginTop: 2 },

  timeRow: { flexDirection: "row", gap: spacing.sm },
  timeChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.md,
    alignItems: "center",
  },
  timeChipLabel: { color: colors.faint, fontWeight: "800", fontSize: 11, marginBottom: 6 },
  timeChipValue: { color: colors.text, fontWeight: "900", fontSize: 18 },
  timeChipEdit: { color: colors.primary, fontWeight: "700", fontSize: 11, marginTop: 4 },

  bigScoreRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: spacing.sm },
  bigScore: { color: colors.text, fontSize: 42, fontWeight: "900" },
  bigScoreSub: { color: colors.faint, fontSize: 16, fontWeight: "900", marginLeft: 6, marginBottom: 8 },

  scaleRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  scaleSeg: {
    flex: 1, height: 10, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabelText: { color: colors.faint, fontSize: 11, fontWeight: "700" },

  moodRow: { flexDirection: "row", gap: 6, justifyContent: "space-between" },
  moodItem: {
    flex: 1, alignItems: "center",
    paddingVertical: 10, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
  },
  moodItemActive: {
    backgroundColor: "rgba(124,58,237,0.22)",
    borderColor: "rgba(124,58,237,0.40)",
  },
  moodEmoji: { fontSize: 22 },
  moodLabel: { color: colors.faint, fontSize: 10, fontWeight: "800", marginTop: 4 },

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  pill: {
    flex: 1, height: 44, borderRadius: 14,
    backgroundColor: colors.input,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  pillText: { color: colors.muted, fontWeight: "900" },
  pillTextActive: { color: colors.text },

  fieldLabel: { color: colors.muted, fontWeight: "900", fontSize: 12 },

  // ── Time picker modal ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerBox: {
    width: "85%",
    backgroundColor: "#1A2340",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  pickerTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 200,
  },
  pickerCol: { width: 70, height: 200 },
  pickerItem: { height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  pickerItemActive: { backgroundColor: "rgba(124,58,237,0.30)" },
  pickerItemText: { color: colors.muted, fontWeight: "800", fontSize: 16 },
  pickerItemTextActive: { color: colors.text, fontWeight: "900", fontSize: 18 },
  pickerColon: { color: colors.text, fontSize: 22, fontWeight: "900" },
  pickerActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  pickerCancel: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: colors.border,
  },
  pickerConfirm: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary,
  },
  pickerCancelText: { color: colors.muted, fontWeight: "900" },
  pickerConfirmText: { color: colors.text, fontWeight: "900" },
});
