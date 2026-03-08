import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import DashboardBackground from '../../../components/DashboardBackground';
import SMSectionTitle from '../components/SMSectionTitle';
import SMMiniCard from '../components/SMMiniCard';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { fetchDailySummary, fetchDayMessages } from '../services/smFirebase.service';

// ─────────────────────────────────────────────
// ✅ App name map
// ─────────────────────────────────────────────
const APP_NAMES = {
  'com.whatsapp':             'WhatsApp',
  'com.facebook.katana':      'Messenger',
  'com.instagram.android':    'Instagram',
  'com.zhiliaoapp.musically': 'TikTok',
};

// ─────────────────────────────────────────────
// ✅ Get local date string (fixes UTC bug)
// ─────────────────────────────────────────────
function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────
// ✅ Build last 7 days
// ─────────────────────────────────────────────
function buildDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);
    const label =
      i === 0 ? 'Today' :
      i === 1 ? 'Yesterday' :
      d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { dateStr, label, index: i };
  });
}

// ─────────────────────────────────────────────
// ✅ Risk color helper
// ─────────────────────────────────────────────
function riskColor(level) {
  if (level === 'HIGH')     return '#EF4444';
  if (level === 'MODERATE') return '#FFB800';
  return '#22C55E';
}

// ─────────────────────────────────────────────
// ✅ Format timestamp to readable time
// ─────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch { return ''; }
}

// ─────────────────────────────────────────────
// ✅ Message card
// ─────────────────────────────────────────────
function MessageCard({ item }) {
  const scoreColor =
    item.label === 'Negative' ? '#EF4444' :
    item.label === 'Positive' ? '#22C55E' :
    '#9CA3AF';

  const appName = APP_NAMES[item.app] || item.app;

  return (
    <View style={msgStyles.card}>
      {/* Top row: app + time */}
      <View style={msgStyles.topRow}>
        <Text style={msgStyles.app}>{appName}</Text>
        {item.dissonance && (
          <Text style={msgStyles.dissonanceBadge}>🎭 Dissonance</Text>
        )}
        <Text style={msgStyles.time}>{formatTime(item.timestamp)}</Text>
      </View>

      {/* Message text */}
      <Text style={msgStyles.text} numberOfLines={3}>
        {item.text || '(no text)'}
      </Text>

      {/* Bottom row: label + score */}
      <View style={msgStyles.bottomRow}>
        <View style={[msgStyles.labelBadge, { borderColor: scoreColor + '44', backgroundColor: scoreColor + '18' }]}>
          <Text style={[msgStyles.labelText, { color: scoreColor }]}>
            {item.label}
          </Text>
        </View>
        <Text style={[msgStyles.score, { color: scoreColor }]}>
          {Math.round(item.score * 100)}% negative
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// ✅ Day summary row (top timeline)
// ─────────────────────────────────────────────
function DaySummaryRow({ day, summary, selected, onPress }) {
  const level = summary?.riskLevel || null;
  return (
    <TouchableOpacity
      style={[styles.dayRow, selected && styles.dayRowSelected]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.dayLabel}>{day.label}</Text>
        <Text style={styles.dayDate}>{day.dateStr}</Text>
      </View>

      {summary ? (
        <View style={styles.dayRight}>
          <Text style={[styles.dayRisk, { color: riskColor(level) }]}>
            {level}
          </Text>
          <Text style={styles.dayCount}>
            {summary.negativeCount}↓ {summary.positiveCount}↑ {summary.neutralCount}→
          </Text>
        </View>
      ) : (
        <Text style={styles.noData}>No data</Text>
      )}

      <Text style={[styles.chevron, selected && { color: '#00E0FF' }]}>
        {selected ? '▲' : '▼'}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// ✅ MAIN SCREEN
// ─────────────────────────────────────────────
export default function SMHistoryScreen() {
  const days = buildDays();

  // Summary data per day (key = dateStr)
  const [summaries,      setSummaries]      = useState({});
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Selected day for message drill-down
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);

  // Filter: 'All' | 'Negative' | 'Positive' | 'Neutral'
  const [filter, setFilter] = useState('All');

  // ── Load summaries for all 7 days ───────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingSummary(true);
      const results = {};
      await Promise.all(
        days.map(async day => {
          const data = await fetchDailySummary(day.dateStr);
          if (data) results[day.dateStr] = data;
        })
      );
      setSummaries(results);
      setLoadingSummary(false);
    };
    load();
  }, []);

  // ── Load messages for selected day ──────────────────────────
  const onDayPress = useCallback(async (day) => {
    // Toggle off if same day tapped again
    if (selectedDay?.dateStr === day.dateStr) {
      setSelectedDay(null);
      setMessages([]);
      return;
    }

    setSelectedDay(day);
    setFilter('All');
    setLoadingMsgs(true);
    setMessages([]);

    const msgs = await fetchDayMessages(day.dateStr);
    setMessages(msgs);
    setLoadingMsgs(false);
  }, [selectedDay]);

  // ── Filtered messages ────────────────────────────────────────
  const filteredMessages = filter === 'All'
    ? messages
    : messages.filter(m => m.label === filter);

  // ── Filter pill ──────────────────────────────────────────────
  const FilterPill = ({ label, count }) => {
    const active = filter === label;
    const color  =
      label === 'Negative' ? '#EF4444' :
      label === 'Positive' ? '#22C55E' :
      label === 'Neutral'  ? '#9CA3AF' :
      '#00E0FF';
    return (
      <TouchableOpacity
        style={[
          styles.filterPill,
          active && { borderColor: color, backgroundColor: color + '18' },
        ]}
        onPress={() => setFilter(label)}
      >
        <Text style={[styles.filterText, active && { color }]}>
          {label} {count != null ? `(${count})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Count per label ──────────────────────────────────────────
  const negCount = messages.filter(m => m.label === 'Negative').length;
  const posCount = messages.filter(m => m.label === 'Positive').length;
  const neuCount = messages.filter(m => m.label === 'Neutral').length;

  return (
    <DashboardBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>HISTORY</Text>
        <Text style={styles.title}>Risk Timeline</Text>
        <Text style={styles.sub}>
          Tap any day to see all analyzed messages.
        </Text>

        {/* ── 7-Day Summary Timeline ── */}
        <SMSectionTitle title="Last 7 Days" subtitle="Tap a day to drill into messages." />

        {loadingSummary ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: spacing.lg }} />
        ) : (
          <View style={styles.card}>
            {days.map((day, idx) => (
              <View key={day.dateStr}>
                {idx > 0 && <View style={styles.divider} />}
                <DaySummaryRow
                  day={day}
                  summary={summaries[day.dateStr]}
                  selected={selectedDay?.dateStr === day.dateStr}
                  onPress={() => onDayPress(day)}
                />

                {/* ── Expanded message list ── */}
                {selectedDay?.dateStr === day.dateStr && (
                  <View style={styles.expandedBox}>

                    {/* Summary mini cards */}
                    {summaries[day.dateStr] && (
                      <View style={styles.miniRow}>
                        <SMMiniCard
                          label="Negative"
                          value={String(summaries[day.dateStr].negativeCount)}
                          sub="Today"
                          tint="rgba(239,68,68,0.18)"
                        />
                        <SMMiniCard
                          label="Positive"
                          value={String(summaries[day.dateStr].positiveCount)}
                          sub="Today"
                          tint="rgba(34,197,94,0.18)"
                        />
                        <SMMiniCard
                          label="Neutral"
                          value={String(summaries[day.dateStr].neutralCount)}
                          sub="Today"
                          tint="rgba(156,163,175,0.18)"
                        />
                      </View>
                    )}

                    {/* Filter pills */}
                    {!loadingMsgs && messages.length > 0 && (
                      <View style={styles.filterRow}>
                        <FilterPill label="All"      count={messages.length} />
                        <FilterPill label="Negative" count={negCount} />
                        <FilterPill label="Positive" count={posCount} />
                        <FilterPill label="Neutral"  count={neuCount} />
                      </View>
                    )}

                    {/* Messages */}
                    {loadingMsgs ? (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator color="#00E0FF" />
                        <Text style={styles.loadingText}>Loading messages...</Text>
                      </View>
                    ) : filteredMessages.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>
                          {messages.length === 0
                            ? '📭 No messages found for this day'
                            : `📭 No ${filter} messages`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.msgList}>
                        {filteredMessages.map(msg => (
                          <MessageCard key={msg.id} item={msg} />
                        ))}
                      </View>
                    )}
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

// ─────────────────────────────────────────────
// ✅ Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1 },
  brand:     { color: colors.muted, fontWeight: '900', letterSpacing: 2.5 },
  title:     { color: colors.text,  fontSize: 24, fontWeight: '900', marginTop: spacing.sm },
  sub:       { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderColor:     colors.border,
    borderWidth:     1,
    borderRadius:    18,
    overflow:        'hidden',
  },

  divider: {
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // ── Day row ──
  dayRow: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        spacing.md,
    gap:            spacing.sm,
  },
  dayRowSelected: {
    backgroundColor: 'rgba(0,224,255,0.06)',
  },
  dayLabel: { color: colors.text,  fontWeight: '900', fontSize: 14 },
  dayDate:  { color: colors.faint, fontSize: 11,      marginTop: 2  },
  dayRight: { alignItems: 'flex-end', gap: 2 },
  dayRisk:  { fontWeight: '900', fontSize: 13 },
  dayCount: { color: colors.faint, fontSize: 11 },
  noData:   { color: colors.faint, fontSize: 12 },
  chevron:  { color: colors.faint, fontSize: 10, fontWeight: '900', marginLeft: 4 },

  // ── Expanded box ──
  expandedBox: {
    borderTopWidth:  1,
    borderTopColor:  'rgba(0,224,255,0.15)',
    backgroundColor: 'rgba(0,224,255,0.03)',
    padding:         spacing.md,
  },

  miniRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.sm,
  },

  // ── Filter pills ──
  filterRow: {
    flexDirection:  'row',
    gap:            8,
    flexWrap:       'wrap',
    marginBottom:   spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      999,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.15)',
    backgroundColor:   'rgba(255,255,255,0.05)',
  },
  filterText: {
    color:      '#9CA3AF',
    fontWeight: '700',
    fontSize:   12,
  },

  // ── Loading / empty ──
  loadingBox: {
    alignItems:    'center',
    paddingVertical: spacing.lg,
    gap:           8,
  },
  loadingText: { color: colors.faint, fontSize: 12 },
  emptyBox: {
    alignItems:      'center',
    paddingVertical: spacing.md,
  },
  emptyText: { color: colors.faint, fontSize: 12 },

  msgList: { gap: spacing.sm },
});

const msgStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.08)',
    borderRadius:    14,
    padding:         spacing.sm,
  },

  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    marginBottom:   6,
  },
  app:  { color: '#00E0FF', fontWeight: '800', fontSize: 12, flex: 1 },
  time: { color: colors.faint, fontSize: 11 },

  dissonanceBadge: {
    fontSize:          10,
    color:             '#FF64C8',
    fontWeight:        '800',
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      999,
    backgroundColor:   'rgba(255,100,200,0.12)',
    borderWidth:       1,
    borderColor:       'rgba(255,100,200,0.25)',
  },

  text: {
    color:      colors.muted,
    fontSize:   13,
    lineHeight: 18,
    marginBottom: 8,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  labelBadge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      999,
    borderWidth:       1,
  },
  labelText: { fontSize: 11, fontWeight: '800' },
  score:     { fontSize: 11, fontWeight: '700' },
});