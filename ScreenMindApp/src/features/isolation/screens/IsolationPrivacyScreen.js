import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

export default function IsolationPrivacyScreen() {
  // ✅ EDIT LATER: save to AsyncStorage / backend user profile
  const [gps, setGps] = useState(true);
  const [calls, setCalls] = useState(true);
  const [sms, setSms] = useState(false);
  const [usage, setUsage] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [wifi, setWifi] = useState(false);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Privacy & Consent</Text>
        <Text style={styles.sub}>
          You control what data is used. We store aggregated metrics only (no content, no precise location history).
        </Text>

        <GlassCard icon="shield-checkmark-outline" title="Data collection controls" subtitle="Toggle anytime" style={{ marginTop: spacing.lg }}>
          <Row label="GPS mobility (distance/entropy)" value={gps} onChange={setGps} />
          <Row label="Call metadata (counts/duration)" value={calls} onChange={setCalls} />
          <Row label="SMS metadata (counts only)" value={sms} onChange={setSms} />
          <Row label="Phone usage (screen/unlocks)" value={usage} onChange={setUsage} />
          <Row label="Bluetooth proximity (counts)" value={bluetooth} onChange={setBluetooth} />
          <Row label="Wi-Fi diversity (entropy)" value={wifi} onChange={setWifi} />
        </GlassCard>

        <View style={{ height: spacing.lg }} />

        <GlassCard icon="information-circle-outline" title="What we do NOT collect" subtitle="For user trust">
          <Text style={styles.note}>• No message text or call audio</Text>
          <Text style={styles.note}>• No contact names</Text>
          <Text style={styles.note}>• No storing raw GPS trails</Text>
          <Text style={styles.note}>• No social media private messages</Text>
        </GlassCard>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({ label, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowText: { color: colors.text, fontWeight: "800", flex: 1, paddingRight: 10 },
  note: { color: colors.faint, marginTop: 8, lineHeight: 18 },
});
