import React, { useContext } from 'react';
import { Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';

export default function DashboardScreen() {
  const { user, signOut } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const { colors } = theme;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.header, { color: colors.textPrimary }]}>ScreenMind Dashboard</Text>
      <Text style={[styles.welcome, { color: colors.textSecondary }]}>
        Hi, {user?.displayName || 'User'} 👋
      </Text>

      <GlassCard><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>📱 Screen Usage</Text>
        <Text style={{ color: colors.textSecondary }}>Usage & addiction risk</Text>
      </GlassCard>

      <GlassCard><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>😴 Sleep</Text>
        <Text style={{ color: colors.textSecondary }}>Sleep disruption analysis</Text>
      </GlassCard>

      <GlassCard><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>💬 Social Media</Text>
        <Text style={{ color: colors.textSecondary }}>Interaction risk patterns</Text>
      </GlassCard>

      <GlassCard><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>📍 Isolation</Text>
        <Text style={{ color: colors.textSecondary }}>Mobility & loneliness risk</Text>
      </GlassCard>

      <TouchableOpacity
        onPress={signOut}
        style={[
          styles.logoutBtn,
          { backgroundColor: colors.accent, borderColor: colors.border }
        ]}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 26, fontWeight: '800' },
  welcome: { marginBottom: 18 },
  cardTitle: { fontSize: 18, fontWeight: '700' },

  logoutBtn: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
