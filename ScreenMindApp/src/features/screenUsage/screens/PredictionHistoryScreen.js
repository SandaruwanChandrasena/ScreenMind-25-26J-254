import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "screenUsageAssessments"; // must match what we use in Questionnaire screen

export default function PredictionHistoryScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      // newest first
      setItems(Array.isArray(arr) ? arr.slice().reverse() : []);
    } catch (e) {
      console.error("LOAD HISTORY ERROR:", e);
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  async function clearHistory() {
    Alert.alert("Clear history?", "This will remove all saved assessments from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setItems([]);
          } catch (e) {
            console.error("CLEAR HISTORY ERROR:", e);
          }
        },
      },
    ]);
  }

  function openResult(item) {
    // item should already be serializable (no FieldValue)
    navigation.navigate("MentalHealthDashboard", { result: item });
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Prediction History</Text>

        <Pressable onPress={clearHistory} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySub}>Submit an assessment to see it here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item?.submittedAt ?? String(index)}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const phq = item?.phq9?.score ?? "-";
            const gad = item?.gad7?.score ?? "-";
            const risk = item?.combinedRisk?.label ?? "-";
            const date = item?.submittedAt ? new Date(item.submittedAt).toLocaleString() : "";

            return (
              <Pressable onPress={() => openResult(item)} style={styles.card}>
                <Text style={styles.cardTop}>
                  Risk: <Text style={styles.bold}>{risk}</Text>
                </Text>

                <Text style={styles.line}>PHQ-9: {phq}</Text>
                <Text style={styles.line}>GAD-7: {gad}</Text>

                {!!date && <Text style={styles.date}>{date}</Text>}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  title: { fontSize: 20, fontWeight: "900" },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  clearText: { fontWeight: "800" },

  emptyBox: { marginTop: 30, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#ddd" },
  emptyTitle: { fontWeight: "900", fontSize: 16 },
  emptySub: { marginTop: 6, color: "#666" },

  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTop: { fontWeight: "900", marginBottom: 6 },
  bold: { fontWeight: "900" },
  line: { color: "#333", marginTop: 2 },
  date: { marginTop: 8, color: "#666", fontSize: 12, fontWeight: "700" },

  backBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#444",
  },
  backText: { color: "white", fontWeight: "900" },
});