import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { getUsageStats, requestUsagePermission } from "../services/usageStatsNative";
import { extractUsageFeatures } from "../services/extractUsageFeatures";

export default function TestUsageScreen() {
  const [features, setFeatures] = useState(null);

  const fetchUsage = async () => {
    const data = await getUsageStats();
    console.log("RAW USAGE DATA:", data);

    const extracted = extractUsageFeatures(data);
    console.log("EXTRACTED FEATURES:", extracted);

    setFeatures(extracted);
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Pressable onPress={requestUsagePermission} style={styles.btn}>
        <Text style={styles.btnText}>Grant Usage Permission</Text>
      </Pressable>

      <Pressable onPress={fetchUsage} style={styles.btn}>
        <Text style={styles.btnText}>Fetch Usage Logs</Text>
      </Pressable>

      {features && (
        <View style={styles.card}>
          <Text style={styles.title}>Extracted Usage Features</Text>

          <Text style={styles.line}>Total screen time: {features.totalScreenTimeMin} min</Text>
          <Text style={styles.line}>Social media: {features.socialMediaMin} min</Text>
          <Text style={styles.line}>Communication: {features.communicationMin} min</Text>
          <Text style={styles.line}>Video: {features.videoMin} min</Text>
          <Text style={styles.line}>Browser: {features.browserMin} min</Text>
          <Text style={styles.line}>Apps counted: {features.appCount}</Text>

          <Text style={[styles.title, { marginTop: 16 }]}>Top Apps</Text>
          {features.topApps.map((app, index) => (
            <Text key={index} style={styles.line}>
              {index + 1}. {app.appName} - {app.totalTimeMin} min ({app.category})
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#6d28d9",
    marginBottom: 16,
    minWidth: 220,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
  card: {
    width: "100%",
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#111827",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },
  line: {
    color: "#e5e7eb",
    marginBottom: 6,
  },
});