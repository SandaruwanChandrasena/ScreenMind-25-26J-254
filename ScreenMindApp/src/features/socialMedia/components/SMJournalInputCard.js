import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

const MOODS = [
  { key: "happy", label: "Happy", emoji: "😄" },
  { key: "neutral", label: "Neutral", emoji: "😐" },
  { key: "sad", label: "Sad", emoji: "😞" },
  { key: "angry", label: "Angry", emoji: "😡" },
  { key: "tired", label: "Tired", emoji: "😴" },
];

export default function SMJournalInputCard({
  text,
  onChangeText,
  selectedMood,
  onSelectMood,
  placeholder = "How was your day today?",
  maxLength = 500,
}) {
  const chars = text?.length || 0;

  return (
    <View>
      {/* Mood chips */}
      <View style={styles.moodRow}>
        {MOODS.map((m) => {
          const active = selectedMood?.key === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => onSelectMood(active ? null : m)}
              style={({ pressed }) => [
                styles.moodChip,
                active && styles.moodChipActive,
                pressed && { opacity: 0.92 },
              ]}
              hitSlop={10}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, active && { color: colors.text }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Premium input card */}
      <View style={styles.inputShell}>
        <View style={styles.inputGlow} />

        <View style={styles.inputCard}>
          <TextInput
            value={text}
            onChangeText={(t) => {
              if (t.length <= maxLength) onChangeText(t);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.faint}
            multiline
            style={styles.input}
            textAlignVertical="top"
          />

          <View style={styles.inputFooter}>
            <Text style={styles.hint}>
              {selectedMood
                ? `Mood: ${selectedMood.emoji} ${selectedMood.label}`
                : "Mood: not selected"}
            </Text>

            <Text style={styles.counter}>
              {chars}/{maxLength}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodChipActive: {
    backgroundColor: "rgba(123,77,255,0.14)",
    borderColor: "rgba(123,77,255,0.30)",
  },
  moodEmoji: { fontSize: 16 },
  moodLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },

  inputShell: { position: "relative", marginBottom: spacing.sm },
  inputGlow: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 22,
    backgroundColor: "rgba(123,77,255,0.12)",
  },
  inputCard: {
    backgroundColor: colors.card,
    borderColor: "rgba(123,77,255,0.22)",
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  input: {
    minHeight: 140,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  inputFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  hint: { color: colors.faint, fontSize: 12, fontWeight: "700" },
  counter: { color: colors.muted, fontSize: 12, fontWeight: "900" },
});
