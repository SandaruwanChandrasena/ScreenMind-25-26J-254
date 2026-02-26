import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { NativeModules } from "react-native";
import { getDailyIsolationHistory } from "../services/isolationStorage";

const { IsolationMetricsBridge } = NativeModules;

export default function MobilityInsightsScreen() {
  const [gpsFeatures, setGpsFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState([]);

  const loadMobilityData = async () => {
    setLoading(true);
    setError(false);

    try {
      // Load historical data from storage
      const savedHistory = await getDailyIsolationHistory();
      setHistory(savedHistory || []);

      // Try to get today's GPS features from native bridge
      if (Platform.OS === "android" && IsolationMetricsBridge) {
        try {
          const features = await IsolationMetricsBridge.getGpsFeaturesToday();
          setGpsFeatures(features);
        } catch (err) {
          console.warn("GPS features error:", err);
          // Try to use latest saved data
          if (savedHistory && savedHistory.length > 0) {
            const latest = savedHistory[0];
            if (latest.features) {
              setGpsFeatures({
                dailyDistanceMeters: latest.features.dailyDistanceMeters || 0,
                timeAtHomePct: latest.features.timeAtHomePct || 0,
                locationEntropy: latest.features.locationEntropy || 0,
                transitions: latest.features.transitions || 0,
              });
            }
          }
        }
      } else {
        // iOS or bridge not available - try to use saved data
        if (savedHistory && savedHistory.length > 0) {
          const latest = savedHistory[0];
          if (latest.features) {
            setGpsFeatures({
              dailyDistanceMeters: latest.features.dailyDistanceMeters || 0,
              timeAtHomePct: latest.features.timeAtHomePct || 0,
              locationEntropy: latest.features.locationEntropy || 0,
              transitions: latest.features.transitions || 0,
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to load mobility data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMobilityData();
  }, []);

  // Format distance in km
  const formatDistance = (meters) => {
    if (!meters || meters === 0) return "--";
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  };

  // Format time at home as percentage
  const formatTimeAtHome = (pct) => {
    if (!pct && pct !== 0) return "--";
    return `${Math.round(pct)}%`;
  };

  // Format entropy as qualitative label
  const formatEntropy = (entropy) => {
    if (!entropy && entropy !== 0) return "--";
    if (entropy < 0.5) return "Very Low";
    if (entropy < 1.0) return "Low";
    if (entropy < 1.5) return "Medium";
    return "High";
  };

  // Format transitions
  const formatTransitions = (trans) => {
    if (!trans && trans !== 0) return "--";
    return `${trans}`;
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🚶 Mobility Insights</Text>
        <Text style={styles.sub}>
          GPS-based movement patterns analyzed for isolation indicators.
        </Text>

        {loading ? (
          <Text style={styles.helper}>Loading mobility data…</Text>
        ) : error ? (
          <Text style={styles.warn}>
            Unable to load mobility data. Make sure location tracking is enabled.
          </Text>
        ) : !gpsFeatures ? (
          <Text style={styles.helper}>
            No mobility data available yet. Start location tracking from the Privacy screen.
          </Text>
        ) : (
          <Text style={styles.helper}>Mobility metrics loaded ✅</Text>
        )}

        <Text style={styles.smallMeta}>
          Historical records: {history.length} {history.length === 0 ? "(no stored data yet)" : ""}
        </Text>

        <View style={styles.card}>
          <Row 
            label="Daily distance" 
            value={formatDistance(gpsFeatures?.dailyDistanceMeters)} 
          />
          <Row 
            label="Time at home" 
            value={formatTimeAtHome(gpsFeatures?.timeAtHomePct)} 
          />
          <Row 
            label="Location entropy" 
            value={formatEntropy(gpsFeatures?.locationEntropy)} 
          />
          <Row 
            label="Transitions/day" 
            value={formatTransitions(gpsFeatures?.transitions)} 
          />
        </View>

        <Pressable 
          onPress={loadMobilityData} 
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  helper: { color: colors.muted, marginTop: 10, fontWeight: "800" },
  warn: { color: "#ffb4b4", marginTop: 10, fontWeight: "900", lineHeight: 18 },
  smallMeta: { color: colors.muted, marginTop: 8, fontWeight: "800", fontSize: 12 },

  card: {
    marginTop: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: { color: colors.muted, fontWeight: "800" },
  value: { color: colors.text, fontWeight: "900" },

  refreshBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: { color: colors.text, fontWeight: "900" },
});
