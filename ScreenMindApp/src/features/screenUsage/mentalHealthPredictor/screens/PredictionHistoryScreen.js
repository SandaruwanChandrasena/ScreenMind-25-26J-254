import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function PredictionHistoryScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prediction History</Text>

      <Pressable style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 20 },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#444",
  },
  buttonText: { color: "white", fontWeight: "800" },
});
