import React, { useState } from "react";
import { Text, StyleSheet, ScrollView, View, TouchableOpacity } from "react-native";
import DashboardBackground from "../../../components/DashboardBackground";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import SMSectionTitle from "../components/SMSectionTitle";

function ExpandableCard({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.expandCard}>
      <TouchableOpacity style={styles.expandHeader} onPress={() => setOpen(v => !v)}>
        <Text style={styles.expandIcon}>{icon}</Text>
        <Text style={styles.expandTitle}>{title}</Text>
        <Text style={styles.expandChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.expandBody}>{children}</View>}
    </View>
  );
}

function InfoRow({ icon, label, desc }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
    </View>
  );
}

function StepCard({ number, title, desc }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

export default function SMPrivacyScreen() {
  return (
    <DashboardBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={styles.brand}>PRIVACY</Text>
        <Text style={styles.title}>Ethics & Privacy</Text>
        <Text style={styles.sub}>
          ScreenMind is designed to be privacy-preserving and non-diagnostic.
          All analysis stays on your device and in your private Firebase account.
        </Text>

        {/* ── HOW TO USE ── */}
        <SMSectionTitle
          title="How to Use ScreenMind"
          subtitle="A quick guide to each feature."
        />

        <StepCard
          number="1"
          title="Enable Notification Monitoring"
          desc="Go to Settings → turn on 'Monitor Social Apps'. ScreenMind will read incoming notification text from selected apps and run sentiment analysis in the background."
        />
        <StepCard
          number="2"
          title="Review Your Dashboard"
          desc="The Home screen shows today's risk level, negative message count, and a sentiment breakdown. Check it once a day to spot patterns in your social media exposure."
        />
        <StepCard
          number="3"
          title="Use the Analysis Screen"
          desc="The Analysis screen lets you pick any day from the past 7 days and see a full breakdown — negative %, peak score, dissonance events, and app-by-app counts."
        />
        <StepCard
          number="4"
          title="Write a Daily Journal"
          desc="Open the Journal tab and write how you're feeling. The app will analyze your text and store it privately in Firebase. Set a reminder interval so you don't forget."
        />
        <StepCard
          number="5"
          title="Review History"
          desc="The History tab shows your risk timeline across 7 days. Tap any day to expand and see every analyzed message with its label, score, and source app."
        />
        <StepCard
          number="6"
          title="Understand Risk Levels"
          desc="LOW (green) = average negative score below 40%. MODERATE (yellow) = 40–69%. HIGH (red) = 70%+. These are awareness signals — not clinical conclusions."
        />

        {/* ── COMPONENT PRIVACY ── */}
        <SMSectionTitle
          title="Component Privacy Guide"
          subtitle="What each part of the app reads and stores."
        />

        <ExpandableCard title="Notification Monitor" icon="📡" defaultOpen>
          <InfoRow icon="✅" label="Reads notification text"           desc="Only the visible notification body — the same text you see in your pull-down shade." />
          <InfoRow icon="✅" label="Records app package name"          desc="e.g. com.whatsapp — used to group stats by app." />
          <InfoRow icon="✅" label="Stores sentiment score + label"    desc="A number (0–100) and label (Positive / Neutral / Negative) saved to your Firebase." />
          <InfoRow icon="✅" label="Timestamps each notification"      desc="Used for response-latency analysis and day grouping." />
          <InfoRow icon="🚫" label="Does NOT store raw message text"   desc="Notification text is analyzed and discarded. The original text is NOT saved to Firebase." />
          <InfoRow icon="🚫" label="Does NOT access contacts"          desc="Contact names are never read or stored." />
          <InfoRow icon="🚫" label="Does NOT monitor unselected apps"  desc="Only the apps you whitelist in Settings are monitored." />
        </ExpandableCard>

        <ExpandableCard title="Journal" icon="📓">
          <InfoRow icon="✅" label="Stores your journal text"          desc="Text you type is saved to your private Firebase account under your user ID. Only you can access it." />
          <InfoRow icon="✅" label="Runs sentiment analysis on text"   desc="Your entry is sent to the local backend (your own device's Python server) — not to any third-party API." />
          <InfoRow icon="✅" label="Saves sentiment alongside entry"   desc="Risk level, sentiment score, and label are stored with each journal entry." />
          <InfoRow icon="🚫" label="Does NOT send text to the cloud"   desc="Analysis runs on your local FastAPI server (192.168.x.x). Text never leaves your local network." />
          <InfoRow icon="🚫" label="Does NOT share with third parties" desc="No advertising, analytics, or external tracking services receive journal data." />
        </ExpandableCard>

        <ExpandableCard title="Dissonance Detection" icon="🎭">
          <InfoRow icon="✅" label="Detects emoji masking patterns"    desc="Flags when positive emojis appear alongside highly negative text — a research-backed wellbeing signal." />
          <InfoRow icon="✅" label="Stores a boolean flag only"        desc="Firebase stores true/false — not the specific emojis or text that triggered the flag." />
          <InfoRow icon="✅" label="Based on 5 research-backed types"  desc="Crisis emojis, joy masking, minimization, deflection, and fragmentation. See README for citations." />
          <InfoRow icon="🚫" label="Does NOT diagnose anything"        desc="A dissonance flag is a pattern signal only. It has no clinical meaning on its own." />
        </ExpandableCard>

        <ExpandableCard title="History & Analysis Screens" icon="📊">
          <InfoRow icon="✅" label="Reads from your Firebase only"     desc="All data shown is fetched from your own Firestore account. Nothing is shared with others." />
          <InfoRow icon="✅" label="Message text shown in History"     desc="Cleaned notification text is displayed in the History drill-down so you can recognise your own messages." />
          <InfoRow icon="🚫" label="Does NOT store new data"           desc="These screens are read-only views of existing Firebase records." />
        </ExpandableCard>

        <ExpandableCard title="Journal Reminder" icon="⏰">
          <InfoRow icon="✅" label="Sends local push notifications"    desc="Reminders are scheduled on-device using React Native push notifications. No server is involved." />
          <InfoRow icon="✅" label="Checks if you journaled today"     desc="Reads a single AsyncStorage key ('sm_journal_saved_today') to decide whether to skip the reminder." />
          <InfoRow icon="🚫" label="Does NOT track your location"      desc="The reminder is purely time-based." />
          <InfoRow icon="🚫" label="Does NOT send data anywhere"       desc="The reminder system is entirely local to your device." />
        </ExpandableCard>

        {/* ── DATA STORAGE ── */}
        <SMSectionTitle title="Where Your Data Lives" />
        <View style={styles.card}>
          <InfoRow icon="🔥" label="Firebase Firestore"               desc="Sentiment scores, risk levels, app counts, and journal entries are stored in your Firebase project. Data is isolated per user ID — other users cannot access your data." />
          <InfoRow icon="📱" label="AsyncStorage (on-device)"         desc="Settings toggles, reminder state, and today's journal flag are stored locally on your phone only." />
          <InfoRow icon="🖥️" label="Local Python backend"             desc="The FastAPI server runs on your local network. It receives text, runs the RoBERTa model, and returns scores. Nothing is persisted on the backend server." />
        </View>

        {/* ── DISCLAIMER ── */}
        <SMSectionTitle
          title="Important Disclaimer"
          subtitle="Please read before using this app."
        />
        <View style={[styles.card, styles.disclaimerCard]}>
          <Text style={styles.disclaimerTitle}>⚠️ Not a Medical Tool</Text>
          <Text style={styles.disclaimerText}>
            ScreenMind is a personal awareness tool built for research purposes.
            Any "HIGH" risk result is a signal to pause and check in with yourself —
            it is not a clinical diagnosis, mental health assessment, or substitute
            for professional support.
          </Text>
          <Text style={styles.disclaimerText}>
            If you are experiencing distress, please speak with a trusted person
            or contact a mental health professional.
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand:     { color: colors.muted, fontWeight: "900", letterSpacing: 2.5 },
  title:     { color: colors.text,  fontSize: 24, fontWeight: "900", marginTop: spacing.sm },
  sub:       { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 20 },

  card: {
    backgroundColor: colors.card,
    borderColor:     colors.border,
    borderWidth:     1,
    borderRadius:    18,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
  },

  stepCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm,
    backgroundColor: colors.card,
    borderColor:     colors.border,
    borderWidth:     1,
    borderRadius:    14,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
  },
  stepBadge: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: 'rgba(0,224,255,0.15)',
    borderWidth:     1,
    borderColor:     'rgba(0,224,255,0.35)',
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       2,
  },
  stepNumber: { color: '#00E0FF', fontWeight: '900', fontSize: 13 },
  stepTitle:  { color: colors.text,  fontWeight: '800', fontSize: 14, marginBottom: 4 },
  stepDesc:   { color: colors.muted, fontSize: 13, lineHeight: 20 },

  expandCard: {
    backgroundColor: colors.card,
    borderColor:     colors.border,
    borderWidth:     1,
    borderRadius:    18,
    marginBottom:    spacing.sm,
    overflow:        'hidden',
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       spacing.md,
    gap:           spacing.sm,
  },
  expandIcon:    { fontSize: 18 },
  expandTitle:   { color: colors.text, fontWeight: '800', fontSize: 14, flex: 1 },
  expandChevron: { color: colors.faint, fontSize: 10, fontWeight: '900' },
  expandBody: {
    borderTopWidth:  1,
    borderTopColor:  'rgba(255,255,255,0.07)',
    padding:         spacing.md,
    gap:             spacing.sm,
  },

  infoRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    alignItems:    'flex-start',
    marginBottom:  spacing.sm,
  },
  infoIcon:  { fontSize: 14, marginTop: 2 },
  infoLabel: { color: colors.text,  fontWeight: '700', fontSize: 13, marginBottom: 2 },
  infoDesc:  { color: colors.muted, fontSize: 12, lineHeight: 18 },

  disclaimerCard: {
    borderColor:     'rgba(255,184,0,0.3)',
    backgroundColor: 'rgba(255,184,0,0.06)',
  },
  disclaimerTitle: {
    color:        '#FFB800',
    fontWeight:   '900',
    fontSize:     15,
    marginBottom: spacing.sm,
  },
  disclaimerText: {
    color:      colors.muted,
    fontSize:   13,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
});