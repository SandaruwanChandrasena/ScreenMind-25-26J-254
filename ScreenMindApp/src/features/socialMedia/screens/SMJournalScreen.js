import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";

import DashboardBackground from "../../../components/DashboardBackground";
import PrimaryButton from "../../../components/PrimaryButton";

import SMJournalInputCard from "../components/SMJournalInputCard";
import SMSectionTitle from "../components/SMSectionTitle";
import SMMiniCard from "../components/SMMiniCard";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

import { analyzeJournalText } from "../services/socialMedia.api";
import { toFixedMaybe } from "../utils/sm.formatters";

import {
  loadJournalEntries,
  saveJournalEntries,
  deleteJournalEntry,
} from "../storage/sm.journal.storage";

export default function SMJournalScreen() {
  const [text, setText] = useState("");
  const [selectedMood, setSelectedMood] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const trimmed = text.trim();
  const canAnalyze = useMemo(() => trimmed.length >= 10, [trimmed]);
  const canSave = useMemo(() => trimmed.length >= 3, [trimmed]);

  // ✅ LOAD SAVED ENTRIES
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const saved = await loadJournalEntries();
        if (mounted) setEntries(saved);
      } catch (e) {
        console.log("Load entries failed:", e);
      } finally {
        if (mounted) setLoadingEntries(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const onAnalyze = async () => {
    if (!canAnalyze) {
      Alert.alert("Write a little more", "Please write at least 10 characters.");
      return;
    }

    try {
      setLoading(true);
      const data = await analyzeJournalText(trimmed);
      setResult(data);
    } catch (e) {
      setResult({
        riskLevel: "MODERATE",
        sentimentScore: -0.62,
        sentimentLabel: "NEGATIVE",
        absolutistCount: 1,
        emojiMasking: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ SAVE + PERSIST
  const onSave = async () => {
    if (!canSave) {
      Alert.alert("Nothing to save", "Write something first.");
      return;
    }

    const entry = {
      id: Date.now().toString(),
      text: trimmed,
      mood: selectedMood,
      createdAt: new Date().toISOString(),
    };

    const updated = [entry, ...entries];

    setEntries(updated);               // UI update
    await saveJournalEntries(updated); // PERMANENT SAVE

    Alert.alert("Saved", "Journal entry saved permanently.");

    setText("");
    setSelectedMood(null);
  };

  // ✅ DELETE + PERSIST
  const onDelete = (id) => {
    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // 1) update storage
            await deleteJournalEntry(id);

            // 2) update UI
            setEntries((prev) => prev.filter((e) => e.id !== id));
          } catch (e) {
            Alert.alert("Delete failed", e?.message || "Please try again.");
          }
        },
      },
    ]);
  };

  const onClear = () => {
    setText("");
    setSelectedMood(null);
    setResult(null);
  };

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>DAILY JOURNAL</Text>
        <Text style={styles.title}>Typing Stress Test</Text>
        <Text style={styles.sub}>
          Write a short note. We analyze sentiment and stress indicators.
        </Text>

        <SMSectionTitle title="Journal Input" subtitle="Consent-based user input." />

        <SMJournalInputCard
          text={text}
          onChangeText={setText}
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
        />

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <PrimaryButton
            title={loading ? "Analyzing..." : "Analyze"}
            onPress={onAnalyze}
            disabled={loading || !canAnalyze}
          />

          <View style={styles.actionRow}>
            <Pressable
              onPress={onSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.secondaryBtn,
                !canSave && { opacity: 0.5 },
                pressed && canSave && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.secondaryText}>Save Entry</Text>
            </Pressable>

            <Pressable
              onPress={onClear}
              style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.ghostText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <SMSectionTitle title="Result" subtitle="Extracted signals." />

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <SMMiniCard
            label="Risk"
            value={result?.riskLevel || "—"}
            sub="Overall"
            tint="rgba(124,58,237,0.25)"
          />
          <SMMiniCard
            label="Sentiment"
            value={
              result ? `${toFixedMaybe(result.sentimentScore)} (${result.sentimentLabel})` : "—"
            }
            sub="Journal"
            tint="rgba(14,165,233,0.22)"
          />
        </View>

        <SMSectionTitle
          title="Saved Entries"
          subtitle={
            loadingEntries
              ? "Loading..."
              : entries.length
              ? "Stored permanently on this device."
              : "No saved entries yet."
          }
        />

        {loadingEntries ? (
          <ActivityIndicator />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {entries.map((e) => (
              <View key={e.id} style={styles.entryCard}>
                <View style={styles.entryTop}>
                  <Text style={styles.entryMood}>
                    {e.mood ? `${e.mood.emoji} ${e.mood.label}` : "—"}
                  </Text>

                  <Pressable
                    onPress={() => onDelete(e.id)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>

                <Text style={styles.entryText} numberOfLines={3}>
                  {e.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md },

  actionRow: { flexDirection: "row", gap: spacing.sm },

  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontWeight: "900" },

  ghostBtn: {
    width: 90,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  ghostText: { color: colors.muted, fontWeight: "900" },

  entryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
  },

  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  entryMood: { color: colors.text, fontWeight: "900", fontSize: 12 },
  entryText: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
  },
  deleteText: { color: "#EF4444", fontWeight: "900", fontSize: 11 },
});
