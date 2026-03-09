import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

import { AuthContext } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

import DashboardBackground from '../components/DashboardBackground';
import FeatureCard from '../components/FeatureCard';

import { SM_ROUTES } from '../features/socialMedia';

export default function DashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const overallRisk = 'Moderate';
  const overallHint = 'Late-night usage increased this week.';

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          {/* <View style={styles.brandPill}>
            <Text style={styles.brandText}>SCREENMIND</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {(user?.displayName || 'U')[0].toUpperCase()}
            </Text>
          </View> */}
        </View>

        <Text style={styles.title}>
          Welcome back,{'\n'}
          <Text style={styles.titleAccent}>
            {user?.displayName || 'User'} 👋
          </Text>
        </Text>
        <Text style={styles.sub}>
          Your calm dashboard for healthier screen habits.
        </Text>

        {/* ── Overall Risk Card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>OVERALL RISK</Text>
            <Text style={styles.summaryValue}>{overallRisk}</Text>
            <Text style={styles.summaryHint} numberOfLines={2}>
              {overallHint}
            </Text>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Today</Text>
            </View>
            <View style={styles.riskDot} />
          </View>
        </View>

        {/* ── Section Label ── */}
        <Text style={styles.sectionLabel}>YOUR MODULES</Text>

        {/* ── First Row ── */}
        <View style={styles.grid}>
          <FeatureCard
            emoji="📱"
            title="Screen Usage"
            subtitle="Usage & addiction risk"
            tint="rgba(124,58,237,0.25)"
            onPress={() => navigation.navigate('ScreenUsageHome')}
          />
          <FeatureCard
            emoji="😴"
            title="Sleep"
            subtitle="Sleep disruption analysis"
            tint="rgba(34,197,94,0.22)"
            onPress={() => navigation.navigate('SleepHome')}
          />
        </View>

        {/* ── Second Row ── */}
        <View style={styles.grid}>
          <FeatureCard
            emoji="💬"
            title="Social Media"
            subtitle="Interaction risk patterns"
            tint="rgba(14,165,233,0.22)"
            onPress={() => navigation.navigate(SM_ROUTES.Home)}
          />
          <FeatureCard
            emoji="📍"
            title="Isolation"
            subtitle="Mobility & loneliness risk"
            tint="rgba(239,68,68,0.18)"
            onPress={() => navigation.navigate('IsolationOverview')}
          />
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.footerLink,
              pressed && styles.footerLinkPressed,
            ]}
            onPress={() => {}}
          >
            {/* <Text style={styles.footerIcon}>🔒</Text>
            <Text style={styles.footerText}>Privacy & Data Settings</Text> */}
          </Pressable>
          {/* <Text style={styles.footerVersion}>v1.0.0</Text> */}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    flexGrow: 1,
  },

  /* ── Header ── */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.45)',
  },
  brandText: {
    color: '#A78BFA',
    fontWeight: '900',
    letterSpacing: 2.5,
    fontSize: 11,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(124,58,237,0.30)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#A78BFA',
    fontWeight: '900',
    fontSize: 16,
  },

  /* ── Welcome text ── */
  title: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
  },
  titleAccent: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  sub: {
    color: colors.faint,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 20,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  /* ── Summary card ── */
  summaryCard: {
    backgroundColor: 'rgba(124,58,237,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: 24,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.lg,
  },
  summaryLeft: { flex: 1 },
  summaryLabel: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  summaryHint: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  summaryRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.45)',
  },
  pillText: {
    color: '#C4B5FD',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FBBF24',
    marginTop: 4,
    shadowColor: '#FBBF24',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  /* ── Section label ── */
  sectionLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  /* ── Grid ── */
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  /* ── Footer ── */
  // footer: {
  //   alignItems: 'center',
  //   marginTop: spacing.md,
  //   gap: spacing.sm,
  // },
  // footerDivider: {
  //   width: '40%',
  //   height: 1,
  //   backgroundColor: colors.border,
  //   marginBottom: spacing.xs,
  // },
  // footerLink: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: 6,
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   borderRadius: 999,
  //   borderWidth: 1,
  //   borderColor: colors.border,
  //   backgroundColor: colors.card,
  // },
  // footerLinkPressed: {
  //   backgroundColor: 'rgba(255,255,255,0.12)',
  // },
  // footerIcon: {
  //   fontSize: 13,
  // },
  // footerText: {
  //   color: colors.muted,
  //   fontWeight: '700',
  //   fontSize: 13,
  // },
  // footerVersion: {
  //   color: colors.faint,
  //   fontSize: 10,
  //   fontWeight: '600',
  //   letterSpacing: 1,
  // },
});