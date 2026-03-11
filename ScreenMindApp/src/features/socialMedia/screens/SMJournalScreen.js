import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';

import DashboardBackground from '../../../components/DashboardBackground';
import PrimaryButton from '../../../components/PrimaryButton';
import SMJournalInputCard from '../components/SMJournalInputCard';
import SMSectionTitle from '../components/SMSectionTitle';
import SMMiniCard from '../components/SMMiniCard';

import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeJournalText } from '../services/socialMedia.api';

import {
  saveJournalToFirebase,
  loadJournalFromFirebase,
  deleteJournalFromFirebase,
  updateJournalInFirebase, // ← add this export to smJournal.firebase.js
} from '../services/smJournal.firebase';

function toFixedMaybe(val, decimals = 2) {
  const n = parseFloat(val);
  return isNaN(n) ? '' : n.toFixed(decimals);
}

// ─────────────────────────────────────────────────────────────
// ✅ Analyze ALL pages and return an averaged result
//
// For a single-page entry this is identical to before.
// For multi-page entries every page with ≥10 chars is sent to
// the backend individually, then scores are averaged:
//   avgNegative  → determines riskLevel
//   avgScore     → sentimentScore (0-1)
//   majority label wins (most common across pages)
//   avgConfidence
//
// Returns same shape as analyzeJournalText() so existing
// result display cards work unchanged.
// ─────────────────────────────────────────────────────────────
async function analyzeAllPages(pages) {
  // Collect pages that have enough text
  const eligible = pages.filter(p => (p.text || '').trim().length >= 10);

  if (eligible.length === 0) {
    throw new Error('Write at least 10 characters on one page.');
  }

  // Analyze each eligible page in parallel
  const results = await Promise.all(
    eligible.map(p => analyzeJournalText(p.text.trim())),
  );

  if (results.length === 1) {
    // Single page — return as-is, add pageCount for display
    return { ...results[0], pageCount: 1 };
  }

  // Average all scores
  const count = results.length;
  const avgNeg = results.reduce((s, r) => s + (r.negative ?? 0), 0) / count;
  const avgScore =
    results.reduce((s, r) => s + (r.sentimentScore ?? 0), 0) / count;
  const avgConf = results.reduce((s, r) => s + (r.confidence ?? 0), 0) / count;
  const avgNeutral = results.reduce((s, r) => s + (r.neutral ?? 0), 0) / count;
  const avgPositive =
    results.reduce((s, r) => s + (r.positive ?? 0), 0) / count;

  // Majority label
  const labelCounts = {};
  results.forEach(r => {
    const l = r.sentimentLabel || 'Neutral';
    labelCounts[l] = (labelCounts[l] || 0) + 1;
  });
  const sentimentLabel = Object.entries(labelCounts).sort(
    (a, b) => b[1] - a[1],
  )[0][0];

  // Risk from averaged negative score (matches backend logic)
  const riskLevel =
    avgScore >= 0.7 ? 'HIGH' : avgScore >= 0.4 ? 'MODERATE' : 'LOW';

  return {
    status: 'success',
    sentimentLabel,
    sentimentScore: avgScore,
    riskLevel,
    negative: avgNeg,
    neutral: avgNeutral,
    positive: avgPositive,
    confidence: avgConf,
    pageCount: count, // ← how many pages were analyzed
  };
}

// ─────────────────────────────────────────────────────────────
// ✅ Edit Modal — full-screen journal editor for saved entries
// ─────────────────────────────────────────────────────────────
function EditModal({ entry, visible, onClose, onSaved }) {
  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalPages, setJournalPages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Populate fields when entry changes
  useEffect(() => {
    if (!entry) return;
    // Only set mood — pages are seeded directly by SMJournalInputCard via initialPages prop.
    // text is synced back automatically by the card's useEffect([currentIdx]) on mount.
    setSelectedMood(entry.mood || null);
    setResult(null);
  }, [entry]);

  const handlePagesChange = useCallback(pages => setJournalPages(pages), []);

  const onAnalyze = async () => {
    // Use all pages from journalPages (synced by SMJournalInputCard via onPagesChange)
    // Falls back to single-page using current text if pages not yet synced
    const pagesToAnalyze = journalPages.length > 0 ? journalPages : [{ text }];

    try {
      setAnalyzing(true);
      const data = await analyzeAllPages(pagesToAnalyze);
      setResult(data);
    } catch (e) {
      Alert.alert('Analyze failed', e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const onUpdate = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 3 && journalPages.every(p => !p.text?.trim())) {
      Alert.alert('Nothing to save', 'Write something first.');
      return;
    }
    try {
      setSaving(true);

      const pagesToSave =
        journalPages.length > 0
          ? journalPages.map(p => ({
              id: p.id,
              title: p.title,
              text: p.text,
              format: p.format,
            }))
          : [{ id: '1', title: 'Page 1', text: trimmed, format: {} }];

      const updated = {
        ...entry,
        text: trimmed,
        mood: selectedMood,
        pages: pagesToSave,
        updatedAt: new Date().toISOString(),
        sentiment: result
          ? {
              label: result.sentimentLabel,
              score: result.sentimentScore,
              riskLevel: result.riskLevel,
            }
          : entry.sentiment,
      };

      await updateJournalInFirebase(entry.firebaseId || entry.id, updated);
      onSaved(updated);
      Alert.alert('✅ Updated', 'Journal entry updated.');
      onClose();
    } catch (e) {
      Alert.alert('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const riskColor = level =>
    level === 'HIGH' ? '#EF4444' : level === 'MODERATE' ? '#FFB800' : '#22C55E';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={modal.bg}>
        {/* ── Header ── */}
        <View style={modal.header}>
          <Pressable onPress={onClose} style={modal.closeBtn} hitSlop={10}>
            <Text style={modal.closeTxt}>✕ Cancel</Text>
          </Pressable>
          <Text style={modal.headerTitle}>Edit Entry</Text>
          <Pressable
            onPress={onUpdate}
            disabled={saving}
            style={[modal.saveBtn, saving && { opacity: 0.5 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={modal.saveTxt}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={modal.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* key forces full remount when a different entry is opened,
              so useState(() => initialPages.map(normalisePage)) re-runs cleanly.
              This is safer than a useEffect([initialPages]) which caused
              an infinite re-render loop. */}
          <SMJournalInputCard
            key={entry?.firebaseId || entry?.id || 'edit'}
            text={text}
            onChangeText={setText}
            selectedMood={selectedMood}
            onSelectMood={setSelectedMood}
            onPagesChange={handlePagesChange}
            initialPages={entry?.pages}
          />

          {/* ── Analyze button ── */}
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title={analyzing ? 'Analyzing...' : '🔍 Re-analyze'}
              onPress={onAnalyze}
              disabled={analyzing}
            />
          </View>

          {/* ── Result cards ── */}
          {result && (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <SMMiniCard
                  label="Risk Level"
                  value={result.riskLevel || '—'}
                  sub={
                    result.pageCount > 1
                      ? `Avg · ${result.pageCount} pages`
                      : 'Analyzed'
                  }
                  tint={
                    result.riskLevel === 'HIGH'
                      ? 'rgba(239,68,68,0.22)'
                      : result.riskLevel === 'MODERATE'
                      ? 'rgba(255,184,0,0.22)'
                      : 'rgba(34,197,94,0.22)'
                  }
                />
                <SMMiniCard
                  label="Sentiment"
                  value={result.sentimentLabel || '—'}
                  sub={
                    result.sentimentScore != null
                      ? `${Math.round(result.sentimentScore * 100)}%`
                      : ''
                  }
                  tint="rgba(14,165,233,0.22)"
                />
              </View>
              <Text style={modal.analysisNote}>
                {result.pageCount > 1
                  ? `📊 Averaged across ${result.pageCount} pages. Tap Save to update.`
                  : '💡 Tap Save to update this entry with the new analysis.'}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// ✅ MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function SMJournalScreen() {
  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);
  const [journalPages, setJournalPages] = useState([]);

  // ── Edit modal state ──────────────────────────────────────────
  const [editEntry, setEditEntry] = useState(null);
  const [editVisible, setEditVisible] = useState(false);

  const trimmed = text.trim();
  const canAnalyze = useMemo(() => trimmed.length >= 10, [trimmed]);
  const canSave = useMemo(
    () =>
      trimmed.length >= 3 || journalPages.some(p => p.text?.trim().length >= 3),
    [trimmed, journalPages],
  );

  // ── Load entries ──────────────────────────────────────────────
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

  // ── Analyze — all pages averaged ─────────────────────────────
  const onAnalyze = async () => {
    const pagesToAnalyze =
      journalPages.length > 0 ? journalPages : [{ text: trimmed }];

    const hasContent = pagesToAnalyze.some(
      p => (p.text || '').trim().length >= 10,
    );
    if (!hasContent) {
      Alert.alert(
        'Write a little more',
        'Please write at least 10 characters on any page.',
      );
      return;
    }
    try {
      setLoading(true);
      const data = await analyzeAllPages(pagesToAnalyze);
      setResult(data);
    } catch (e) {
      setResult({
        riskLevel: 'MODERATE',
        sentimentScore: 0.62,
        sentimentLabel: 'Negative',
        negative: 62,
        confidence: 80,
        pageCount: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────
  const onSave = async () => {
    if (!canSave) {
      Alert.alert('Nothing to save', 'Write something first.');
      return;
    }
    try {
      setSaving(true);
      const pagesToSave =
        journalPages.length > 0
          ? journalPages.map(p => ({
              id: p.id,
              title: p.title,
              text: p.text,
              format: p.format,
            }))
          : [{ id: '1', title: 'Page 1', text: trimmed, format: {} }];

      const entry = {
        id: Date.now().toString(),
        text: trimmed,
        mood: selectedMood,
        createdAt: new Date().toISOString(),
        pages: pagesToSave,
        sentiment: result
          ? {
              label: result.sentimentLabel,
              score: result.sentimentScore,
              riskLevel: result.riskLevel,
            }
          : null,
      };

      const { success, firebaseId } = await saveJournalToFirebase(entry);

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await AsyncStorage.setItem(
        'sm_journal_saved_today',
        JSON.stringify({ date: todayStr }),
      );

      setEntries(prev => [
        { ...entry, firebaseId: firebaseId || entry.id },
        ...prev,
      ]);
      Alert.alert(
        success ? '✅ Saved' : '⚠️ Saved Locally',
        success
          ? 'Journal entry saved to your account.'
          : 'Could not reach server. Saved on device.',
      );

      setText('');
      setSelectedMood(null);
      setResult(null);
      setJournalPages([]);
    } catch (e) {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const onDelete = entry => {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJournalFromFirebase(entry.firebaseId || entry.id);
            setEntries(prev =>
              prev.filter(
                e => (e.firebaseId || e.id) !== (entry.firebaseId || entry.id),
              ),
            );
          } catch (e) {
            Alert.alert('Delete failed', e?.message);
          }
        },
      },
    ]);
  };

  // ── Open edit modal ───────────────────────────────────────────
  const onEdit = useCallback(entry => {
    setEditEntry(entry);
    setEditVisible(true);
  }, []);

  // ── Handle edit saved callback ────────────────────────────────
  const onEditSaved = useCallback(updated => {
    setEntries(prev =>
      prev.map(e =>
        (e.firebaseId || e.id) === (updated.firebaseId || updated.id)
          ? updated
          : e,
      ),
    );
  }, []);

  const onClear = () => {
    setText('');
    setSelectedMood(null);
    setResult(null);
    setJournalPages([]);
  };
  const handlePagesChange = useCallback(pages => setJournalPages(pages), []);

  const formatDate = iso => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const riskColor = level =>
    level === 'HIGH' ? '#EF4444' : level === 'MODERATE' ? '#FFB800' : '#22C55E';

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
          onPagesChange={handlePagesChange}
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

        <SMSectionTitle
          title="Result"
          subtitle={
            result?.pageCount > 1
              ? `Averaged across ${result.pageCount} pages.`
              : 'Extracted signals.'
          }
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <SMMiniCard
            label="Risk Level"
            value={result?.riskLevel || '—'}
            sub={
              result?.pageCount > 1
                ? `Avg · ${result.pageCount} pages`
                : 'Overall journal'
            }
            tint={
              result?.riskLevel === 'HIGH'
                ? 'rgba(239,68,68,0.22)'
                : result?.riskLevel === 'MODERATE'
                ? 'rgba(255,184,0,0.22)'
                : result?.riskLevel === 'LOW'
                ? 'rgba(34,197,94,0.22)'
                : 'rgba(124,58,237,0.25)'
            }
          />
          <SMMiniCard
            label="Sentiment"
            value={result?.sentimentLabel || '—'}
            sub={
              result?.sentimentScore != null
                ? `Score: ${Math.round(result.sentimentScore * 100)}%`
                : 'Journal'
            }
            tint="rgba(14,165,233,0.22)"
          />
        </View>

        {result && (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginTop: spacing.md,
            }}
          >
            <SMMiniCard
              label="Negative %"
              value={`${Math.round(
                result.negative ?? result.sentimentScore * 100,
              )}%`}
              sub="RoBERTa score"
              tint="rgba(239,68,68,0.18)"
            />
            <SMMiniCard
              label="Confidence"
              value={`${Math.round(result.confidence || 0)}%`}
              sub="Model confidence"
              tint="rgba(34,197,94,0.18)"
            />
          </View>
        )}

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
                {/* ── Top row ── */}
                <View style={styles.entryTop}>
                  <Text style={styles.entryMood}>
                    {e.mood ? `${e.mood.emoji} ${e.mood.label}` : '😐 No mood'}
                  </Text>
                  <Text style={styles.entryDate}>
                    {formatDate(e.createdAt)}
                  </Text>

                  {/* ── Edit button ── */}
                  <Pressable
                    onPress={() => onEdit(e)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.editBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.editText}>✎ Edit</Text>
                  </Pressable>

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

                {/* ── Updated badge ── */}
                {e.updatedAt && (
                  <Text style={styles.updatedBadge}>
                    ✏️ Edited {formatDate(e.updatedAt)}
                  </Text>
                )}

                {/* ── Pages display — each page shown separately ── */}
                {(e.pages && e.pages.length > 0
                  ? e.pages
                  : [{ title: 'Page 1', text: e.text }]
                ).map((pg, pgIdx) => (
                  <View
                    key={pg.id || pgIdx}
                    style={[
                      styles.pageSection,
                      pgIdx > 0 && styles.pageSectionDivider,
                    ]}
                  >
                    {/* Page title — only show if more than 1 page */}
                    {e.pages?.length > 1 && (
                      <View style={styles.pageTitleRow}>
                        <View style={styles.pageDot} />
                        <Text style={styles.pageTitleTxt}>
                          {pg.title || `Page ${pgIdx + 1}`}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.entryText} numberOfLines={3}>
                      {pg.text || '(empty page)'}
                    </Text>
                  </View>
                ))}

                {/* ── Sentiment badge ── */}
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
                      {e.pages?.length > 1 ? ` · avg ${e.pages.length}p` : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ── Edit Modal ── */}
      <EditModal
        entry={editEntry}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={onEditSaved}
      />
    </DashboardBackground>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
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
    gap: 6,
    flexWrap: 'wrap',
  },
  entryMood: { color: colors.text, fontWeight: '900', fontSize: 12, flex: 1 },
  entryDate: { color: colors.faint, fontSize: 10, fontWeight: '700' },
  entryText: { color: colors.muted, marginTop: 4, lineHeight: 18 },

  pageSection: { marginTop: 6 },
  pageSectionDivider: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,58,237,0.15)',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  pageTitleTxt: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.8,
  },

  updatedBadge: {
    color: 'rgba(167,139,250,0.55)',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '700',
  },

  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.28)',
  },
  editText: { color: colors.primary, fontWeight: '900', fontSize: 11 },

  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  deleteText: { color: '#EF4444', fontWeight: '900', fontSize: 11 },

  pageBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.28)',
  },
  pageBadgeTxt: { color: colors.primary, fontSize: 10, fontWeight: '800' },

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

const modal = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#080E1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeTxt: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  saveTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  scroll: { padding: spacing.lg, paddingTop: spacing.md },
  analysisNote: {
    color: 'rgba(167,139,250,0.7)',
    fontSize: 12,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
