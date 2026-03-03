import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

const STORAGE_KEY = "screenUsageAssessments";

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function PredictionHistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const data = safeJsonParse(raw, []);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("LOAD HISTORY ERROR:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function persist(nextItems) {
    setItems(nextItems);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  }

  function openDetails(item) {
    navigation.navigate("MentalHealthDashboard", { result: item });
  }

  function onDeleteOne(itemId) {
    Alert.alert("Delete this record?", "This will remove this assessment from local history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const next = items.filter((x) => x?.id !== itemId);
            await persist(next);
          } catch (e) {
            console.error("DELETE ONE ERROR:", e);
            Alert.alert("Error", "Failed to delete the record");
          }
        },
      },
    ]);
  }

  function onClearAll() {
    Alert.alert("Clear all history?", "This will delete all saved assessments on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setItems([]);
          } catch (e) {
            console.error("CLEAR ALL ERROR:", e);
            Alert.alert("Error", "Failed to clear history");
          }
        },
      },
    ]);
  }

  const renderItem = ({ item }) => {
    const label = item?.combinedRisk?.label ?? "—";
    const score = item?.combinedRisk?.score ?? "—";
    const when = item?.submittedAt;

    return (
      <Pressable
        onPress={() => openDetails(item)}
        style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle}>Overall Risk</Text>

          <View style={styles.pill}>
            <Text style={styles.pillText}>{label}</Text>
          </View>
        </View>

        <Text style={styles.itemSub}>
          Submitted: <Text style={styles.bold}>{formatDateTime(when)}</Text>
        </Text>

        <Text style={styles.itemSub}>
          Hybrid score: <Text style={styles.bold}>{score}</Text>
        </Text>

        <View style={styles.itemBottom}>
          <Text style={styles.tapHint}>Tap to view full details</Text>

          <Pressable
            onPress={() => onDeleteOne(item?.id)}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.9 }]}
            hitSlop={10}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.h1}>Prediction History</Text>

        <Pressable
          onPress={onClearAll}
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.clearText}>Clear all</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySub}>Submit an assessment to see it here.</Text>

          <Pressable
            onPress={() => navigation.navigate("QuestionnaireScreen")}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryBtnText}>Go to Questionnaire</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it?.id ?? Math.random())}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        />
      )}

      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1 },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { color: colors.text, fontSize: 22, fontWeight: "900" },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  clearText: { color: colors.text, fontWeight: "900" },

  itemCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemTitle: { color: colors.text, fontWeight: "900" },

  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: colors.text, fontWeight: "900" },

  itemSub: { color: colors.muted, marginTop: 8, fontWeight: "700" },
  bold: { color: colors.text, fontWeight: "900" },

  itemBottom: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tapHint: { color: colors.faint, fontWeight: "800" },

  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.5)",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  deleteText: { color: colors.text, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  loadingText: { color: colors.muted, marginTop: 10, fontWeight: "700" },

  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  emptySub: { color: colors.muted, marginTop: 6, textAlign: "center" },

  primaryBtn: {
    marginTop: spacing.lg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "rgba(124,58,237,0.85)",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  backBtn: { alignItems: "center", paddingVertical: 14 },
  backText: { color: colors.faint, fontWeight: "900" },
});