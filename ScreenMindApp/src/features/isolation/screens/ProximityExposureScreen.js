import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

export default function ProximityExposureScreen() {
  // ✅ EDIT LATER: replace with Bluetooth/WiFi features
  const p = useMemo(() => ([
    { k: "Bluetooth proximity", v: "Low (avg 1–2 devices/day)" },
    { k: "WiFi diversity", v: "Low (1–2 networks/day)" },
    { k: "Environment variety", v: "Low" },
  ]), []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📡 Proximity & Environment</Text>
        <Text style={styles.sub}>Proxies for face-to-face exposure and environment variety.</Text>

        <GlassCard icon="wifi-outline" title="Exposure signals" subtitle="No identity stored • privacy-safe" style={{ marginTop: spacing.lg }}>
          {p.map((x, i) => (
            <View key={x.k} style={[styles.row, i !== 0 && styles.borderTop]}>
              <Text style={styles.k}>{x.k}</Text>
              <Text style={styles.v}>{x.v}</Text>
            </View>
          ))}
        </GlassCard>

        <Text style={styles.note}>
          We store only aggregated counts/entropy. No MAC addresses or Wi-Fi names are stored.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  k: { color: colors.muted, fontWeight: "800", flex: 1 },
  v: { color: colors.text, fontWeight: "900", textAlign: "right" },

  note: { color: colors.faint, marginTop: spacing.lg, fontSize: 12, lineHeight: 16 },
});
