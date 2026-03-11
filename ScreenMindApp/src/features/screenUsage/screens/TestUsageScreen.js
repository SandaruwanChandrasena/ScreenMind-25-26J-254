import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { getUsageStats, requestUsagePermission, hasUsagePermission } from "../services/usageStatsNative";
import { extractUsageFeatures } from "../services/extractUsageFeatures";

export default function TestUsageScreen() {
  const [features, setFeatures]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [permGranted, setPermGranted] = useState(null);
  const [error, setError]           = useState(null);
  const [isMock, setIsMock]         = useState(false);

  // Check permission status
  const checkPermission = async () => {
    const granted = await hasUsagePermission();
    setPermGranted(granted);
    console.log("[TestUsageScreen] Permission granted:", granted);
  };

  // Fetch and display usage data
  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    setFeatures(null);

    try {
      const data = await getUsageStats();
      console.log("RAW USAGE DATA:", data);

      // Detect if we're using mock data (emulator fallback)
      const usingMock = Platform.OS !== "android" || !data?.[0]?.packageName?.includes("real");
      setIsMock(data === null || (Array.isArray(data) && data.length > 0 && data[0]?.packageName === "com.instagram.android"));

      const extracted = extractUsageFeatures(data);
      console.log("EXTRACTED FEATURES:", extracted);

      setFeatures(extracted);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch usage data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>

      <Text style={styles.heading}>📱 Usage Stats Tester</Text>

      {/* Permission Controls */}
      <View style={styles.row}>
        <Pressable onPress={requestUsagePermission} style={styles.btnSecondary}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>

        <Pressable onPress={checkPermission} style={styles.btnSecondary}>
          <Text style={styles.btnText}>Check Permission</Text>
        </Pressable>
      </View>

      {permGranted !== null && (
        <Text style={[styles.badge, { backgroundColor: permGranted ? "#065f46" : "#7f1d1d" }]}>
          {permGranted ? "✅ Permission Granted" : "❌ Permission Not Granted"}
        </Text>
      )}

      {/* Fetch Button */}
      <Pressable onPress={fetchUsage} style={styles.btnPrimary} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Fetch Usage Data</Text>
        }
      </Pressable>

      {/* Mock data notice */}
      {isMock && features && (
        <View style={styles.mockBadge}>
          <Text style={styles.mockText}>
            🧪 Showing mock data (emulator mode) — real data will load on a physical device
          </Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {features && (
        <View style={styles.card}>
          <Text style={styles.title}>📊 Extracted Usage Features</Text>

          <View style={styles.statGrid}>
            <StatItem label="Total Screen Time" value={`${features.totalScreenTimeMin} min`} />
            <StatItem label="Social Media"       value={`${features.socialMediaMin} min`} />
            <StatItem label="Communication"      value={`${features.communicationMin} min`} />
            <StatItem label="Video"              value={`${features.videoMin} min`} />
            <StatItem label="Browser"            value={`${features.browserMin} min`} />
            <StatItem label="Apps Counted"       value={`${features.appCount}`} />
          </View>

          <Text style={[styles.title, { marginTop: 20 }]}>🏆 Top Apps</Text>
          {features.topApps.map((app, index) => (
            <View key={index} style={styles.appRow}>
              <Text style={styles.appRank}>{index + 1}.</Text>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.appName}</Text>
                <Text style={styles.appMeta}>{app.totalTimeMin} min · {app.category}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#0f172a",
  },
  heading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#6d28d9",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
    minWidth: 220,
    alignSelf: "center",
  },
  btnSecondary: {
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    flex: 1,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  badge: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  mockBadge: {
    backgroundColor: "#1e293b",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  mockText: {
    color: "#f59e0b",
    fontSize: 12,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "#7f1d1d",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
  },
  card: {
    width: "100%",
    marginTop: 10,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statItem: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 12,
    minWidth: "45%",
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#a78bfa",
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  appRank: {
    color: "#64748b",
    fontWeight: "700",
    marginRight: 10,
    width: 20,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: "#e2e8f0",
    fontWeight: "700",
    fontSize: 14,
  },
  appMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
});