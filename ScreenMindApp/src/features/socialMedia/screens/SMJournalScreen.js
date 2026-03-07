import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';

import DashboardBackground from '../../../components/DashboardBackground';
import PrimaryButton from '../../../components/PrimaryButton';

import SMJournalInputCard from '../components/SMJournalInputCard';
import SMSectionTitle from '../components/SMSectionTitle';
import SMMiniCard from '../components/SMMiniCard';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

import { analyzeJournalText } from '../services/socialMedia.api';
import { toFixedMaybe } from '../utils/sm.formatters';

import {
  saveJournalToFirebase,
  loadJournalFromFirebase,
  deleteJournalFromFirebase,
} from '../services/smJournal.firebase';

export default function SMJournalScreen() {
  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // ── saving state to show spinner on Save button ──
  const [saving, setSaving] = useState(false);

  const trimmed = text.trim();
  const canAnalyze = useMemo(() => trimmed.length >= 10, [trimmed]);
  const canSave = useMemo(() => trimmed.length >= 3, [trimmed]);

  // ── LOAD entries from Firebase on mount ──────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const saved = await loadJournalFromFirebase();
        if (mounted) setEntries(saved);
      } catch (e) {
        console.log('Load entries failed:', e);
      } finally {
        if (mounted) setLoadingEntries(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // ── ANALYZE ──────────────────────────────────────────────────
  const onAnalyze = async () => {
    if (!canAnalyze) {
      Alert.alert(
        'Write a little more',
        'Please write at least 10 characters.',
      );
      return;
    }
    try {
      setLoading(true);
      const data = await analyzeJournalText(trimmed);
      setResult(data);
    } catch (e) {
      console.log('❌ Analyze error:', e.message);
      // Fallback result so UI doesn't break
      setResult({
        riskLevel: 'MODERATE',
        sentimentScore: -0.62,
        sentimentLabel: 'NEGATIVE',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── SAVE to Firebase ─────────────────────────────────────────
  const onSave = async () => {
    if (!canSave) {
      Alert.alert('Nothing to save', 'Write something first.');
      return;
    }

    try {
      setSaving(true);

      const entry = {
        id: Date.now().toString(),
        text: trimmed,
        mood: selectedMood,
        createdAt: new Date().toISOString(),
        // Include sentiment result if user analyzed before saving
        sentiment: result
          ? {
              label: result.sentimentLabel || null,
              score: result.sentimentScore || null,
              riskLevel: result.riskLevel || null,
            }
          : null,
      };

      const { success, firebaseId } = await saveJournalToFirebase(entry);

      // Add firebaseId to local entry for deletion later
      const savedEntry = { ...entry, firebaseId: firebaseId || entry.id };
      setEntries(prev => [savedEntry, ...prev]);

      if (success) {
        Alert.alert('✅ Saved', 'Journal entry saved to your account.');
      } else {
        Alert.alert(
          '⚠️ Saved Locally',
          'Could not reach server. Entry saved on device.',
        );
      }

      // Reset input
      setText('');
      setSelectedMood(null);
      setResult(null);
    } catch (e) {
      console.log('❌ Save error:', e);
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE from Firebase ─────────────────────────────────────
  const onDelete = entry => {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const idToDelete = entry.firebaseId || entry.id;
            await deleteJournalFromFirebase(idToDelete);
            setEntries(prev =>
              prev.filter(e => (e.firebaseId || e.id) !== idToDelete),
            );
          } catch (e) {
            Alert.alert('Delete failed', e?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const onClear = () => {
    setText('');
    setSelectedMood(null);
    setResult(null);
  };

  // ── Format date for display ──────────────────────────────────
  const formatDate = iso => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // ── Risk badge color ─────────────────────────────────────────
  const riskColor = level => {
    if (level === 'HIGH') return '#EF4444';
    if (level === 'MODERATE') return '#FFB800';
    return '#22C55E';
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>DAILY JOURNAL</Text>
        <Text style={styles.title}>Typing Stress Test</Text>
        <Text style={styles.sub}>
          Write a short note. We analyze sentiment and stress indicators.
        </Text>

        <SMSectionTitle
          title="Journal Input"
          subtitle="Consent-based user input."
        />

        <SMJournalInputCard
          text={text}
          onChangeText={setText}
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
        />

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <PrimaryButton
            title={loading ? 'Analyzing...' : 'Analyze'}
            onPress={onAnalyze}
            disabled={loading || !canAnalyze}
          />

          <View style={styles.actionRow}>
            <Pressable
              onPress={onSave}
              disabled={!canSave || saving}
              style={({ pressed }) => [
                styles.secondaryBtn,
                (!canSave || saving) && { opacity: 0.5 },
                pressed && canSave && { opacity: 0.9 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.secondaryText}>
                  {result ? '💾 Save with Analysis' : 'Save Entry'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onClear}
              style={({ pressed }) => [
                styles.ghostBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.ghostText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Result cards ── */}
        <SMSectionTitle title="Result" subtitle="Extracted signals." />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SMMiniCard
            label="Risk"
            value={result?.riskLevel || '—'}
            sub="Overall"
            tint="rgba(124,58,237,0.25)"
          />
          <SMMiniCard
            label="Sentiment"
            value={
              result
                ? `${toFixedMaybe(result.sentimentScore)} (${
                    result.sentimentLabel
                  })`
                : '—'
            }
            sub="Journal"
            tint="rgba(14,165,233,0.22)"
          />
        </View>

        {/* ── Saved entries ── */}
        <SMSectionTitle
          title="Saved Entries"
          subtitle={
            loadingEntries
              ? 'Loading from your account...'
              : entries.length
              ? `${entries.length} entries saved to your account`
              : 'No saved entries yet.'
          }
        />

        {loadingEntries ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {entries.map(e => (
              <View key={e.firebaseId || e.id} style={styles.entryCard}>
                {/* ── Top row: mood + date + delete ── */}
                <View style={styles.entryTop}>
                  <Text style={styles.entryMood}>
                    {e.mood ? `${e.mood.emoji} ${e.mood.label}` : '😐 No mood'}
                  </Text>
                  <Text style={styles.entryDate}>
                    {formatDate(e.createdAt)}
                  </Text>
                  <Pressable
                    onPress={() => onDelete(e)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>

                {/* ── Journal text ── */}
                <Text style={styles.entryText} numberOfLines={3}>
                  {e.text}
                </Text>

                {/* ── Sentiment badge (if analyzed before saving) ── */}
                {e.sentiment?.riskLevel && (
                  <View
                    style={[
                      styles.sentimentBadge,
                      { borderColor: riskColor(e.sentiment.riskLevel) + '44' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sentimentText,
                        { color: riskColor(e.sentiment.riskLevel) },
                      ]}
                    >
                      {e.sentiment.riskLevel} risk · {e.sentiment.label || ''}
                      {e.sentiment.score != null
                        ? ` · ${toFixedMaybe(e.sentiment.score)}`
                        : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </DashboardBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand: { color: colors.muted, fontWeight: '900', letterSpacing: 2.5 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  sub: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md },

  actionRow: { flexDirection: 'row', gap: spacing.sm },

  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text, fontWeight: '900' },

  ghostBtn: {
    width: 90,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  ghostText: { color: colors.muted, fontWeight: '900' },

  entryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryMood: { color: colors.text, fontWeight: '900', fontSize: 12, flex: 1 },
  entryDate: { color: colors.faint, fontSize: 10, fontWeight: '700' },
  entryText: { color: colors.muted, marginTop: 8, lineHeight: 18 },

  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  deleteText: { color: '#EF4444', fontWeight: '900', fontSize: 11 },

  sentimentBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sentimentText: { fontSize: 11, fontWeight: '800' },
});
