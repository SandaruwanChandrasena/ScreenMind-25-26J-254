import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import ScreenBackground from "../../../components/ScreenBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import GlassCard from "../components/GlassCard";

export default function IsolationSuggestionsScreen({ navigation }) {
  // ✅ EDIT LATER: personalize based on detected features
  const suggestions = useMemo(() => ([
    { t: "Take a short walk", d: "Try 10–15 minutes to increase mobility and location variety." },
    { t: "Connect with one friend", d: "A short message/call helps improve social exposure." },
    { t: "Reduce phone use after midnight", d: "Improves daily rhythm and energy." },
    { t: "Spend time in a new place", d: "Environmental diversity (Wi-Fi variety) supports wellbeing." },
  ]), []);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Suggestions</Text>
        <Text style={styles.sub}>Preventive nudges (not diagnosis).</Text>

        <GlassCard icon="heart-outline" title="Recommended actions" subtitle="Small steps matter" style={{ marginTop: spacing.lg }}>
          {suggestions.map((s, i) => (
            <View key={s.t} style={[styles.item, i !== 0 && styles.borderTop]}>
              <Text style={styles.itemTitle}>✅ {s.t}</Text>
              <Text style={styles.itemDetail}>{s.d}</Text>
            </View>
          ))}
        </GlassCard>

        <View style={{ height: spacing.lg }} />

        {/* <Pressable style={styles.bigBtn} onPress={() => navigation.navigate("IsolationPrivacy")}>
          <Text style={styles.bigBtnText}>Privacy & Data Controls</Text>
          <Icon name="chevron-forward" size={18} color={colors.text} />
        </Pressable> */}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  item: { paddingVertical: 10 },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10 },
  itemTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  itemDetail: { color: colors.faint, marginTop: 6, lineHeight: 18 },

  bigBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: colors.border,
  },
  bigBtnText: { color: colors.text, fontWeight: "900" },
});
