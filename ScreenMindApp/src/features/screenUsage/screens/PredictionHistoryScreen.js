import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

// ✅ Must match QuestionnaireScreen STORAGE_KEY
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
    return "";
  }
}

export default function PredictionHistoryScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const data = safeJsonParse(raw, []);
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const onClear = useCallback(() => {
    Alert.alert("Clear History", "Remove all saved assessments?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setItems([]);
        },
      },
    ]);
  }, []);

  // ✅ Header button: Clear only
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 10, marginRight: 10 }}>
          <Pressable onPress={onClear} style={styles.headerBtnSecondary}>
            <Text style={styles.headerBtnSecondaryText}>Clear</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, onClear]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Prediction History</Text>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySub}>Submit an assessment to see it here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id || it.submittedAt)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const label = item?.combinedRisk?.label ?? "—";
            const score = item?.combinedRisk?.score ?? item?.aiPrediction?.score01 ?? "—";
            const phq = item?.phq9?.score ?? "—";
            const gad = item?.gad7?.score ?? "—";
            const time = item?.submittedAt ? formatDateTime(item.submittedAt) : "";

            return (
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>Risk: {label}</Text>
                  <Text style={styles.cardScore}>Score: {score}</Text>
                </View>

                <Text style={styles.cardLine}>PHQ-9: {phq}</Text>
                <Text style={styles.cardLine}>GAD-7: {gad}</Text>
                {!!time && <Text style={styles.cardTime}>{time}</Text>}

                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => navigation.navigate("MentalHealthDashboard", { result: item })}
                    style={styles.smallBtnPrimary}
                  >
                    <Text style={styles.smallBtnPrimaryText}>Open</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg1, padding: spacing.lg },
  title: { fontSize: 20, fontWeight: "900", marginBottom: spacing.md, color: colors.text },

  headerBtnSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnSecondaryText: { fontWeight: "900", color: colors.text },

  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.card,
  },
  emptyTitle: { fontWeight: "900", marginBottom: 4, color: colors.text },
  emptySub: { color: colors.muted },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.card,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "900", marginBottom: 6, color: colors.text },
  cardScore: { fontWeight: "800", color: colors.faint },

  cardLine: { color: colors.muted, marginBottom: 2, fontWeight: "700" },
  cardTime: { marginTop: 6, color: colors.faint, fontSize: 12, fontWeight: "700" },

  cardActions: { flexDirection: "row", gap: 10, marginTop: 12 },

  smallBtnPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(124,58,237,0.85)",
  },
  smallBtnPrimaryText: { color: "#fff", fontWeight: "900" },

  backBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: { color: colors.text, fontWeight: "900" },
});