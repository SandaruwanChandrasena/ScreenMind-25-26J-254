import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

function SectionTitle({ title, sub }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.title}>{title}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function ScaleBar({ value, onChange, min = 0, max = 10 }) {
  // segmented slider-like bar (no libs)
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={styles.scaleWrap}>
      {items.map((n) => {
        const active = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.scaleSeg, active && styles.scaleSegActive]}
          />
        );
      })}
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabelText}>{min}</Text>
        <Text style={styles.scaleLabelText}>{max}</Text>
      </View>
    </View>
  );
}

function ChoicePills({ value, setValue, options }) {
  return (
    <View style={styles.pillsRow}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => setValue(opt)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimeChip({ label, value, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.timeChip}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </Pressable>
  );
}

export default function MorningCheckInScreen({ navigation }) {
  // UI-only values (later connect to server)
  const [sleepQuality, setSleepQuality] = useState(7); // 0-10
  const [refreshed, setRefreshed] = useState(6); // 0-10
  const [sleepTime, setSleepTime] = useState("11:30 PM");
  const [wakeTime, setWakeTime] = useState("07:00 AM");
  const [wokeUp, setWokeUp] = useState("No");
  const [headache, setHeadache] = useState("No");
  const [dryMouth, setDryMouth] = useState("No");
  const [snoreUsed, setSnoreUsed] = useState("No");

  const submit = () => {
    Alert.alert("Saved ✅", "Morning check-in recorded (UI only for now).");
    navigation.goBack();
  };

  const showPicker = (field) => {
    Alert.alert("Time Picker", `Later: open a time picker for ${field}`);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <SectionTitle
          title="Morning Check-In"
          sub="Quick survey to validate the model (takes ~30 seconds)."
        />

        {/* Time row */}
        <View style={styles.row}>
          <TimeChip label="Went to bed" value={sleepTime} onPress={() => showPicker("Sleep time")} />
          <TimeChip label="Woke up" value={wakeTime} onPress={() => showPicker("Wake time")} />
        </View>

        <View style={{ height: spacing.md }} />

        {/* Sleep quality */}
        <Card>
          <Text style={styles.cardTitle}>How was your sleep?</Text>
          <Text style={styles.cardHint}>0 = very poor, 10 = excellent</Text>
          <View style={styles.bigValueRow}>
            <Text style={styles.bigValue}>{sleepQuality}</Text>
            <Text style={styles.bigValueSub}>/ 10</Text>
          </View>
          <ScaleBar value={sleepQuality} onChange={setSleepQuality} />
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Refreshed */}
        <Card>
          <Text style={styles.cardTitle}>How refreshed do you feel?</Text>
          <Text style={styles.cardHint}>Your morning energy level</Text>
          <View style={styles.bigValueRow}>
            <Text style={styles.bigValue}>{refreshed}</Text>
            <Text style={styles.bigValueSub}>/ 10</Text>
          </View>
          <ScaleBar value={refreshed} onChange={setRefreshed} />
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Symptoms */}
        <Card>
          <Text style={styles.cardTitle}>How do you feel this morning?</Text>

          <View style={{ height: 12 }} />
          <Text style={styles.fieldLabel}>Headache?</Text>
          <ChoicePills value={headache} setValue={setHeadache} options={["Yes", "No"]} />

          <View style={{ height: 12 }} />
          <Text style={styles.fieldLabel}>Dry mouth?</Text>
          <ChoicePills value={dryMouth} setValue={setDryMouth} options={["Yes", "No"]} />
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Night awakenings + snore */}
        <Card>
          <Text style={styles.cardTitle}>Last night</Text>

          <View style={{ height: 12 }} />
          <Text style={styles.fieldLabel}>Did you wake up during the night?</Text>
          <ChoicePills value={wokeUp} setValue={setWokeUp} options={["Yes", "No"]} />

          <View style={{ height: 12 }} />
          <Text style={styles.fieldLabel}>Did you enable snoring detection?</Text>
          <ChoicePills value={snoreUsed} setValue={setSnoreUsed} options={["Yes", "No"]} />
        </Card>

        <View style={{ height: spacing.lg }} />
        <PrimaryButton title="Save Check-In" onPress={submit} />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 6 },

  row: { flexDirection: "row", gap: spacing.md },

  timeChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.md,
  },
  timeLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  timeValue: { color: colors.text, fontWeight: "900", fontSize: 16, marginTop: 8 },

  bigValueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10, marginBottom: 10 },
  bigValue: { color: colors.text, fontSize: 34, fontWeight: "900" },
  bigValueSub: { color: colors.faint, fontSize: 14, fontWeight: "900", marginLeft: 6, marginBottom: 8 },

  scaleWrap: { marginTop: 10 },
  scaleSeg: {
    height: 10,
    flex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginRight: 6,
  },
  scaleSegActive: {
    backgroundColor: "rgba(34,197,94,0.35)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  scaleLabelText: { color: colors.faint, fontSize: 12, fontWeight: "800" },

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: "rgba(124,58,237,0.22)",
  },
  pillText: { color: colors.muted, fontWeight: "900" },
  pillTextActive: { color: colors.text },

  fieldLabel: { color: colors.muted, fontWeight: "900", fontSize: 12 },
});
