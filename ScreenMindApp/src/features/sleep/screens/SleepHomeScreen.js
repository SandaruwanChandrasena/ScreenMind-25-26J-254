import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import ScreenBackground from "../../../components/ScreenBackground";
import PrimaryButton from "../../../components/PrimaryButton";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function TabPill({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatRow({ label, value, sub }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.statValue}>{value}</Text>
        {!!sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function BarTimeline({ data, labels }) {
  // data: [0..10], labels: e.g. ["23","01","03","05","07"]
  return (
    <View>
      <View style={styles.timelineRow}>
        {data.map((v, idx) => (
          <View key={idx} style={styles.barTrack}>
            <View style={[styles.barFill, { height: `${(v / 10) * 100}%` }]} />
          </View>
        ))}
      </View>

      <View style={styles.timelineLabels}>
        {labels.map((t) => (
          <Text key={t} style={styles.timelineLabelText}>
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Suggestion({ title, subtitle, icon = "✨", onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sugRow, pressed && { opacity: 0.92 }]}>
      <View style={styles.sugIcon}>
        <Text style={styles.sugIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sugTitle}>{title}</Text>
        <Text style={styles.sugSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={styles.sugArrow}>›</Text>
    </Pressable>
  );
}

export default function SleepHomeScreen({ navigation }) {
  const [tab, setTab] = useState("Day"); // Day | Week | Month

  // Dummy data (later replace with real logs / model output)
  const summary = useMemo(() => {
    if (tab === "Day") {
      return {
        dateLabel: "Last night",
        timeInBed: "7h 15m",
        timeAsleep: "6h 30m",
        timeToSleep: "0h 16m",
        quality: "68%",
        mood: "🙂",
        note: "Late-night usage increased sleep delay.",
        // 24 bars represent roughly 23:00 -> 07:00 (UI-only)
        bars: [1,2,1,4,6,3,2,7,5,3,2,1,4,6,8,5,3,2,1,2,4,3,2,1],
        labels: ["23", "01", "03", "05", "07"],
      };
    }
    if (tab === "Week") {
      return {
        dateLabel: "Last 7 days",
        timeInBed: "7h 02m (avg)",
        timeAsleep: "6h 18m (avg)",
        timeToSleep: "0h 21m (avg)",
        quality: "64% (avg)",
        mood: "😐",
        note: "Notifications after bedtime spiked on 2 nights.",
        bars: [2,3,2,4,5,3,2,6,4,3,2,2,3,4,6,4,3,2,2,3,4,3,2,2],
        labels: ["Mon", "Wed", "Fri", "Sun", ""],
      };
    }
    return {
      dateLabel: "Last 30 days",
      timeInBed: "6h 55m (avg)",
      timeAsleep: "6h 05m (avg)",
      timeToSleep: "0h 24m (avg)",
      quality: "61% (avg)",
      mood: "😕",
      note: "Consistency improved slightly in the last 10 days.",
      bars: [2,2,3,3,4,3,2,4,5,4,3,2,3,4,5,4,3,3,2,3,4,4,3,2],
      labels: ["W1", "W2", "W3", "W4", ""],
    };
  }, [tab]);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>SLEEP</Text>
          <Text style={styles.title}>Sleep Summary</Text>
          <Text style={styles.sub}>Bar-chart view of sleep disruption & behavior signals.</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          {["Day", "Week", "Month"].map((t) => (
            <TabPill key={t} label={t} active={tab === t} onPress={() => setTab(t)} />
          ))}
        </View>

        <View style={{ height: spacing.md }} />

        {/* Main Chart Card */}
        <Card>
          <View style={styles.chartTop}>
            <View>
              <Text style={styles.smallMuted}>{summary.dateLabel}</Text>
              <Text style={styles.bigLine}>Quality {summary.quality} • Mood {summary.mood}</Text>
            </View>
            <View style={styles.pillTag}>
              <Text style={styles.pillText}>{tab}</Text>
            </View>
          </View>

          <View style={{ height: 12 }} />
          <BarTimeline data={summary.bars} labels={summary.labels} />

          <View style={{ height: spacing.md }} />

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Insight</Text>
            <Text style={styles.noteText}>{summary.note}</Text>
          </View>
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Stats Card */}
        <Card>
          <Text style={styles.cardTitle}>Sleep Stats</Text>
          <Text style={styles.cardHint}>Based on device behavior + self-report (future)</Text>

          <View style={{ height: 14 }} />
          <StatRow label="Time in bed" value={summary.timeInBed} />
          <Divider />
          <StatRow label="Time asleep" value={summary.timeAsleep} />
          <Divider />
          <StatRow label="Time to sleep" value={summary.timeToSleep} />
          <Divider />
          <StatRow label="Quality" value={summary.quality} sub="Estimated" />
        </Card>

        <View style={{ height: spacing.md }} />

        {/* Suggestions */}
        <Card>
          <View style={styles.sugHeader}>
            <Text style={styles.cardTitle}>AI Suggestions</Text>
            <Pressable onPress={() => navigation.navigate("SleepDetails")}>
              <Text style={styles.link}>See all</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />
          <Suggestion
            icon="📵"
            title="Limit exposure to screens"
            subtitle="Reduce phone use 30–60 mins before bed"
            onPress={() => navigation.navigate("SleepDetails")}
          />
          <Suggestion
            icon="🔕"
            title="Enable Do Not Disturb"
            subtitle="Reduce night notifications"
            onPress={() => navigation.navigate("SleepPermissions")}
          />
          <Suggestion
            icon="⏰"
            title="Set a consistent bedtime"
            subtitle="Try a fixed sleep window for 5 days"
            onPress={() => navigation.navigate("SleepDetails")}
          />
        </Card>

        <View style={{ height: spacing.lg }} />

        {/* Actions */}
        <PrimaryButton
          title="Morning Check-In"
          onPress={() => navigation.navigate("SleepCheckIn")}
        />
        <View style={{ height: spacing.sm }} />
        <PrimaryButton
          title="Snoring (Optional)"
          onPress={() => navigation.navigate("SleepSnoring")}
          style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
        />

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </ScreenBackground>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },

  header: { marginBottom: spacing.lg },
  brand: { color: colors.muted, fontWeight: "900", letterSpacing: 3, marginBottom: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  sub: { color: colors.muted, marginTop: 6, lineHeight: 18 },

  tabsWrap: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "rgba(124,58,237,0.22)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabText: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  tabTextActive: { color: colors.text },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
  },

  chartTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  smallMuted: { color: colors.faint, fontWeight: "800", fontSize: 12 },
  bigLine: { color: colors.text, fontWeight: "900", fontSize: 14, marginTop: 6 },

  pillTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  timelineRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 120 },
  barTrack: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.55)",
  },
  timelineLabels: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timelineLabelText: { color: colors.faint, fontSize: 12, fontWeight: "900" },

  noteBox: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
  noteText: { color: colors.muted, marginTop: 6, lineHeight: 18, fontSize: 12 },

  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardHint: { color: colors.faint, fontSize: 12, marginTop: 6, lineHeight: 16 },

  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { color: colors.muted, fontWeight: "900", fontSize: 12 },
  statValue: { color: colors.text, fontWeight: "900", fontSize: 14 },
  statSub: { color: colors.faint, fontWeight: "800", fontSize: 11, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, opacity: 0.7 },

  sugHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: colors.primary2, fontWeight: "900" },

  sugRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  sugIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sugIconText: { fontSize: 16 },
  sugTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
  sugSub: { color: colors.muted, marginTop: 4, fontSize: 12 },
  sugArrow: { color: colors.faint, fontSize: 22, fontWeight: "900", marginLeft: 6 },
});
