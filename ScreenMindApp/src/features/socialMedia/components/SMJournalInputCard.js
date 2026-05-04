/**
 * SMJournalInputCard — Premium Multi-Page Journal Input
 *
 * BOOK UI IMPROVEMENTS:
 *
 * 1. Serif font (Georgia) in writing area — feels like a real diary
 * 2. Stronger ruled lines — more visible notebook paper effect
 * 3. Thicker spine with stitching dots — physical book feel
 * 4. Date shown in page header — diary-like context
 * 5. Warmer paper background tint — less harsh than pure dark
 * 6. Placeholder text is italic serif — inviting writing prompt
 * 7. Deeper book shadow layers — more 3D book depth
 * 8. Line height tuned to ruled lines — text sits ON the lines
 * 9. Toolbar hidden behind a toggle — cleaner default writing view
 *
 * PRESERVED FIXES:
 * FIX 1 — initialPages prop seeds edit mode correctly
 * FIX 2 — suppressResetRef prevents text erase on page actions
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

// ─── Config ───────────────────────────────────────────────────────────────────

const MOODS = [
  { key: 'happy',   label: 'Happy',   emoji: '😄', color: '#FFD93D' },
  { key: 'neutral', label: 'Neutral', emoji: '😐', color: '#94A3B8' },
  { key: 'sad',     label: 'Sad',     emoji: '😞', color: '#60A5FA' },
  { key: 'angry',   label: 'Angry',   emoji: '😡', color: '#F87171' },
  { key: 'tired',   label: 'Tired',   emoji: '😴', color: '#C084FC' },
];

const FONT_SIZES = [
  { key: 'xs', label: 'XS', size: 12 },
  { key: 'sm', label: 'S',  size: 14 },
  { key: 'md', label: 'M',  size: 16 },
  { key: 'lg', label: 'L',  size: 20 },
  { key: 'xl', label: 'XL', size: 26 },
];

const TEXT_COLORS = [
  { key: 'snow',    hex: '#FFFFFF', label: 'Snow'    },
  { key: 'violet',  hex: '#A78BFA', label: 'Violet'  },
  { key: 'sky',     hex: '#38BDF8', label: 'Sky'     },
  { key: 'rose',    hex: '#FB7185', label: 'Rose'    },
  { key: 'amber',   hex: '#FCD34D', label: 'Amber'   },
  { key: 'emerald', hex: '#34D399', label: 'Emerald' },
  { key: 'peach',   hex: '#FDBA74', label: 'Peach'   },
];

const DEFAULT_FORMAT = {
  bold: false,
  italic: false,
  underline: false,
  fontSize: 'md',
  textColor: 'snow',
};

const MAX_CHARS = 500;
const MAX_PAGES = 10;
// Line height for ruled lines — must match inputStyle lineHeight
const LINE_H    = 28;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makePage = (index = 0) => ({
  id:     `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title:  `Page ${index + 1}`,
  text:   '',
  format: { ...DEFAULT_FORMAT },
});

const normalisePage = (p, index) => ({
  id:     p.id     || `${Date.now()}-${index}`,
  title:  p.title  || `Page ${index + 1}`,
  text:   p.text   || '',
  format: p.format ? { ...DEFAULT_FORMAT, ...p.format } : { ...DEFAULT_FORMAT },
});

const hexFor  = key => TEXT_COLORS.find(c => c.key === key)?.hex  ?? '#FFFFFF';
const sizeFor = key => FONT_SIZES.find(f  => f.key === key)?.size ?? 16;

// Format today's date like "May 4, 2026"
function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function TBtn({ label, active, onPress, tStyle, activeColor = colors.primary }) {
  const scale = useRef(new Animated.Value(1)).current;
  const fire = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.8, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 28 }),
    ]).start();
    onPress?.();
  };
  return (
    <Pressable onPress={fire} hitSlop={8}>
      <Animated.View
        style={[
          S.tBtn,
          active && {
            backgroundColor: activeColor + '28',
            borderColor:     activeColor + '70',
          },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[S.tBtnTxt, active && { color: activeColor }, tStyle]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ hex, label, active, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const fire = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.78, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1.1,  useNativeDriver: true, speed: 28 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 28 }),
    ]).start();
    onPress?.();
  };
  return (
    <Pressable onPress={fire} hitSlop={8} style={S.swatchWrap}>
      <Animated.View
        style={[
          S.swatch,
          { backgroundColor: hex },
          active && S.swatchActive,
          { transform: [{ scale }] },
        ]}
      />
      <Text style={[S.swatchLbl, { color: active ? hex : 'rgba(255,255,255,0.40)' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const TDiv = () => <View style={S.tDiv} />;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SMJournalInputCard({
  text,
  onChangeText,
  selectedMood,
  onSelectMood,
  onPagesChange,
  initialPages,
  placeholder = 'Write how you feel today…',
}) {
  // FIX 1: Seed pages from initialPages if provided, otherwise start blank.
  const [pages, setPages] = useState(() => {
    if (Array.isArray(initialPages) && initialPages.length > 0) {
      return initialPages.map(normalisePage);
    }
    return [makePage(0)];
  });

  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [tab,          setTab]          = useState('style');
  const [editingTitle, setEditingTitle] = useState(false);
  // NEW: toolbar collapsed by default — cleaner writing view for general users
  const [toolbarOpen,  setToolbarOpen]  = useState(false);

  const textRef = useRef(null);

  const onPagesChangeRef = useRef(onPagesChange);
  const onChangeTextRef  = useRef(onChangeText);
  useEffect(() => { onPagesChangeRef.current = onPagesChange; }, [onPagesChange]);
  useEffect(() => { onChangeTextRef.current  = onChangeText;  }, [onChangeText]);

  // FIX 2: Suppress reset guard during programmatic navigation
  const suppressResetRef = useRef(false);

  useEffect(() => {
    onPagesChangeRef.current?.(pages);
  }, [pages]);

  useEffect(() => {
    onChangeTextRef.current?.(pages[currentIdx]?.text ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  const prevTextRef = useRef(text);
  useEffect(() => {
    const wasNonEmpty = prevTextRef.current !== '';
    const isNowEmpty  = text === '';
    prevTextRef.current = text;

    if (isNowEmpty && wasNonEmpty) {
      if (suppressResetRef.current) {
        suppressResetRef.current = false;
        return;
      }
      setPages([makePage(0)]);
      setCurrentIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const page  = pages[currentIdx] ?? pages[0];
  const fmt   = page?.format ?? DEFAULT_FORMAT;
  const chars = page?.text?.length ?? 0;

  // ── State helpers ─────────────────────────────────────────────────────────
  const patchPage = useCallback((idx, patch) => {
    setPages(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }, []);

  const patchFmt = useCallback(
    (key, val) => {
      setPages(prev =>
        prev.map((p, i) =>
          i === currentIdx ? { ...p, format: { ...p.format, [key]: val } } : p,
        ),
      );
    },
    [currentIdx],
  );

  const toggleFmt = useCallback(
    key => patchFmt(key, !(page?.format?.[key] ?? false)),
    [patchFmt, page],
  );

  const resetFmt = useCallback(() => {
    setPages(prev =>
      prev.map((p, i) =>
        i === currentIdx ? { ...p, format: { ...DEFAULT_FORMAT } } : p,
      ),
    );
  }, [currentIdx]);

  const handleText = useCallback(
    val => {
      if (val.length > MAX_CHARS) return;
      setPages(prev =>
        prev.map((p, i) => (i === currentIdx ? { ...p, text: val } : p)),
      );
      onChangeTextRef.current?.(val);
    },
    [currentIdx],
  );

  const goTo = useCallback(
    idx => {
      if (idx < 0 || idx >= pages.length) return;
      suppressResetRef.current = true;
      setCurrentIdx(idx);
      setEditingTitle(false);
    },
    [pages.length],
  );

  const addPage = useCallback(() => {
    setPages(prev => {
      if (prev.length >= MAX_PAGES) {
        Alert.alert('Max Pages', `Up to ${MAX_PAGES} pages per entry.`);
        return prev;
      }
      const next = [...prev, makePage(prev.length)];
      suppressResetRef.current = true;
      setCurrentIdx(next.length - 1);
      return next;
    });
    setEditingTitle(false);
  }, []);

  const deletePage = useCallback(() => {
    if (pages.length === 1) {
      Alert.alert('Cannot Delete', 'At least one page is required.');
      return;
    }
    Alert.alert(
      `Delete "${page?.title}"?`,
      'This page will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPages(prev => {
              const next   = prev.filter((_, i) => i !== currentIdx);
              const newIdx = Math.min(currentIdx, next.length - 1);
              suppressResetRef.current = true;
              setCurrentIdx(newIdx);
              return next;
            });
          },
        },
      ],
    );
  }, [pages.length, page, currentIdx]);

  // ── Input style — serif font for book/diary feel ──────────────────────────
  const inputStyle = {
    fontSize:           sizeFor(fmt.fontSize),
    color:              hexFor(fmt.textColor),
    fontWeight:         fmt.bold      ? '700'       : '400',
    fontStyle:          fmt.italic    ? 'italic'    : 'normal',
    textDecorationLine: fmt.underline ? 'underline' : 'none',
    lineHeight:         LINE_H,       // matches ruled line spacing
    fontFamily:         'serif',      // BOOK FEEL: diary/journal font
  };

  const hasFormat =
    fmt.bold || fmt.italic || fmt.underline ||
    fmt.fontSize  !== 'md' ||
    fmt.textColor !== 'snow';

  const cntColor =
    chars > MAX_CHARS * 0.9 ? '#EF4444' :
    chars > MAX_CHARS * 0.7 ? '#FFB800' :
    'rgba(255,255,255,0.28)';

  return (
    <View>
      {/* ══ MOOD STRIP ═══════════════════════════════════════════════════════ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.moodRow}
      >
        {MOODS.map(m => {
          const active = selectedMood?.key === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => onSelectMood(active ? null : m)}
              style={({ pressed }) => [
                S.moodChip,
                active && {
                  backgroundColor: m.color + '22',
                  borderColor:     m.color + '66',
                },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={6}
            >
              <Text style={S.moodEmoji}>{m.emoji}</Text>
              <Text style={[S.moodLbl, active && { color: m.color }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ══ BOOK CARD ════════════════════════════════════════════════════════ */}
      <View style={S.bookShell}>
        {/* ── Depth shadow layers ── */}
        <View style={S.depthC} />
        <View style={S.depthB} />
        <View style={S.depthA} />

        {/* ── Physical spine with stitching dots ── */}
        <View style={S.spine}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={S.spineStitch} />
          ))}
        </View>

        <View style={S.card}>

          {/* ── HEADER — page title + date ───────────────────────────────── */}
          <View style={S.header}>
            <View style={S.headerL}>
              <View style={S.spineDot} />
              {editingTitle ? (
                <TextInput
                  value={page?.title ?? ''}
                  onChangeText={v => patchPage(currentIdx, { title: v })}
                  onBlur={() => setEditingTitle(false)}
                  onSubmitEditing={() => setEditingTitle(false)}
                  style={S.titleInput}
                  maxLength={24}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Pressable onPress={() => setEditingTitle(true)} hitSlop={10}>
                  <Text style={S.titleTxt} numberOfLines={1}>
                    {page?.title}
                    <Text style={S.titleHint}> ✎</Text>
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={S.headerR}>
              {/* NEW: today's date label */}
              <Text style={S.dateLabel}>{todayLabel()}</Text>

              {hasFormat && (
                <Pressable onPress={resetFmt} style={S.resetBtn} hitSlop={8}>
                  <Text style={S.resetTxt}>↺</Text>
                </Pressable>
              )}
              <View style={S.pgBadge}>
                <Text style={S.pgBadgeTxt}>
                  {currentIdx + 1} / {pages.length}
                </Text>
              </View>
            </View>
          </View>

          {/* ── TOOLBAR TOGGLE — collapsed by default ────────────────────── */}
          <Pressable
            onPress={() => setToolbarOpen(o => !o)}
            style={S.toolbarToggle}
          >
            <Text style={S.toolbarToggleIcon}>✍️</Text>
            <Text style={S.toolbarToggleTxt}>
              {toolbarOpen ? 'Hide formatting' : 'Formatting'}
            </Text>
            <Text style={S.toolbarToggleChevron}>
              {toolbarOpen ? '▲' : '▼'}
            </Text>
          </Pressable>

          {/* ── TOOLBAR — only shown when toolbarOpen ────────────────────── */}
          {toolbarOpen && (
            <>
              <View style={S.tabRow}>
                {[
                  { key: 'style', icon: '✍️', label: 'Style' },
                  { key: 'color', icon: '🎨', label: 'Color' },
                ].map(t => (
                  <Pressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    style={[S.tabBtn, tab === t.key && S.tabBtnOn]}
                  >
                    <Text style={[S.tabTxt, tab === t.key && S.tabTxtOn]}>
                      {t.icon} {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={S.toolWrap}>
                {tab === 'style' && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={S.toolRow}
                  >
                    <TBtn
                      label="B"
                      active={fmt.bold}
                      onPress={() => toggleFmt('bold')}
                      tStyle={{ fontWeight: '900', fontSize: 15 }}
                    />
                    <TBtn
                      label="I"
                      active={fmt.italic}
                      onPress={() => toggleFmt('italic')}
                      tStyle={{ fontStyle: 'italic', fontSize: 14 }}
                    />
                    <TBtn
                      label="U"
                      active={fmt.underline}
                      onPress={() => toggleFmt('underline')}
                      tStyle={{ textDecorationLine: 'underline', fontSize: 14 }}
                    />
                    <TDiv />
                    {FONT_SIZES.map(f => (
                      <TBtn
                        key={f.key}
                        label={f.label}
                        active={fmt.fontSize === f.key}
                        onPress={() => patchFmt('fontSize', f.key)}
                        tStyle={{ fontSize: 11 }}
                      />
                    ))}
                  </ScrollView>
                )}
                {tab === 'color' && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={S.toolRow}
                  >
                    {TEXT_COLORS.map(c => (
                      <ColorSwatch
                        key={c.key}
                        hex={c.hex}
                        label={c.label}
                        active={fmt.textColor === c.key}
                        onPress={() => patchFmt('textColor', c.key)}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}

          {/* ── RULED LINES — absolute behind input ──────────────────────── */}
          <View style={S.ruledContainer} pointerEvents="none">
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={S.ruledLine} />
            ))}
          </View>

          {/* ── INPUT — serif font, sits on ruled lines ───────────────────── */}
          <TextInput
            ref={textRef}
            value={page?.text ?? ''}
            onChangeText={handleText}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.18)"
            multiline
            style={[S.input, inputStyle]}
            textAlignVertical="top"
            selectionColor={colors.primary + 'BB'}
          />

          {/* ── FOOTER ───────────────────────────────────────────────────── */}
          <View style={S.footer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={S.tagRow}
            >
              {fmt.bold      && <FmtTag label="Bold" />}
              {fmt.italic    && <FmtTag label="Italic" />}
              {fmt.underline && <FmtTag label="Underline" />}
              {fmt.fontSize !== 'md' && (
                <FmtTag
                  label={`Size ${FONT_SIZES.find(f => f.key === fmt.fontSize)?.label}`}
                />
              )}
              {fmt.textColor !== 'snow' && (
                <FmtTag
                  label={TEXT_COLORS.find(c => c.key === fmt.textColor)?.label ?? ''}
                  color={hexFor(fmt.textColor)}
                  dot={hexFor(fmt.textColor)}
                />
              )}
              {selectedMood && (
                <FmtTag
                  label={`${selectedMood.emoji} ${selectedMood.label}`}
                  color="rgba(255,255,255,0.45)"
                  subtle
                />
              )}
            </ScrollView>
            <Text style={[S.charCount, { color: cntColor }]}>
              {chars}/{MAX_CHARS}
            </Text>
          </View>
        </View>
      </View>

      {/* ══ PAGE NAVIGATOR ═══════════════════════════════════════════════════ */}
      <View style={S.nav}>
        <NavArrow
          dir="◀"
          disabled={currentIdx === 0}
          onPress={() => goTo(currentIdx - 1)}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={S.dotRow}
        >
          {pages.map((p, i) => (
            <Pressable key={p.id} onPress={() => goTo(i)} hitSlop={10}>
              <View style={[S.dot, i === currentIdx && S.dotOn]}>
                {i === currentIdx && <View style={S.dotCore} />}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <NavArrow
          dir="▶"
          disabled={currentIdx === pages.length - 1}
          onPress={() => goTo(currentIdx + 1)}
        />

        <Pressable
          onPress={addPage}
          style={({ pressed }) => [S.addBtn, pressed && { opacity: 0.7 }]}
          hitSlop={6}
        >
          <Text style={S.addTxt}>+ Page</Text>
        </Pressable>

        {pages.length > 1 && (
          <Pressable
            onPress={deletePage}
            style={({ pressed }) => [S.delBtn, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <Text style={S.delTxt}>🗑</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Small chips ─────────────────────────────────────────────────────────────

function FmtTag({ label, color, dot, subtle }) {
  return (
    <View
      style={[
        S.fmtTag,
        subtle && S.fmtTagSubtle,
        dot && { borderColor: dot + '44' },
      ]}
    >
      {dot && <View style={[S.fmtDot, { backgroundColor: dot }]} />}
      <Text style={[S.fmtTagTxt, color && { color }]}>{label}</Text>
    </View>
  );
}

function NavArrow({ dir, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        S.navArrow,
        disabled && S.navArrowOff,
        pressed && !disabled && { opacity: 0.65 },
      ]}
    >
      <Text style={[S.navArrowTxt, disabled && { opacity: 0.22 }]}>{dir}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = '#0E1628';   // warmer dark — less harsh than pure black
const BDR     = 'rgba(124,58,237,0.28)';
const SPINE_C = colors.primary;

const S = StyleSheet.create({

  // ── Mood strip ────────────────────────────────────────────────────────────
  moodRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: spacing.md,
    paddingHorizontal: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  moodEmoji: { fontSize: 15 },
  moodLbl:   { color: 'rgba(255,255,255,0.50)', fontWeight: '800', fontSize: 11 },

  // ── Book shell ────────────────────────────────────────────────────────────
  bookShell: {
    position: 'relative',
    marginLeft: 14,   // room for spine
    marginBottom: 4,
  },

  // Depth layers — create 3D book stack effect
  depthC: {
    position: 'absolute',
    top: 10, left: 10, right: -10, bottom: -10,
    borderRadius: 22,
    backgroundColor: 'rgba(124,58,237,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.06)',
  },
  depthB: {
    position: 'absolute',
    top: 5, left: 5, right: -5, bottom: -5,
    borderRadius: 21,
    backgroundColor: 'rgba(124,58,237,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
  },
  depthA: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderWidth: 1,
    borderColor: BDR,
    marginLeft: -14,
    borderLeftWidth: 14,
    borderLeftColor: SPINE_C,
  },

  // ── Physical spine with stitching dots ────────────────────────────────────
  spine: {
    position: 'absolute',
    top: 12,
    left: -14,
    bottom: 12,
    width: 14,
    zIndex: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  spineStitch: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  // ── Main card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BDR,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 16,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.16)',
    backgroundColor: 'rgba(124,58,237,0.07)',
  },
  headerL: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  headerR: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  spineDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: SPINE_C,
    shadowColor: SPINE_C,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  titleTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    maxWidth: 120,
    fontFamily: 'serif',   // serif page title — diary feel
  },
  titleHint:  { color: 'rgba(167,139,250,0.45)', fontSize: 11 },
  titleInput: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
    fontFamily: 'serif',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '55',
    minWidth: 80,
    maxWidth: 120,
    paddingVertical: 2,
  },

  // NEW: today's date in header
  dateLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'serif',
    fontStyle: 'italic',
  },

  resetBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  resetTxt: { color: '#F87171', fontWeight: '900', fontSize: 10 },

  pgBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.38)',
  },
  pgBadgeTxt: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.4,
  },

  // ── NEW: Toolbar toggle row ────────────────────────────────────────────────
  toolbarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    gap: 6,
  },
  toolbarToggleIcon: { fontSize: 13 },
  toolbarToggleTxt: {
    flex: 1,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarToggleChevron: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontWeight: '900',
  },

  // ── Toolbar tabs ──────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabBtn:   { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnOn: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt:   { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '700' },
  tabTxtOn: { color: '#FFFFFF', fontWeight: '900' },

  toolWrap: {
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  tBtn: {
    minWidth: 36,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  tBtnTxt: { color: 'rgba(255,255,255,0.55)', fontWeight: '700', fontSize: 13 },
  tDiv: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.09)',
    marginHorizontal: 3,
  },

  swatchWrap: { alignItems: 'center', gap: 5, marginHorizontal: 2 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#FFFFFF', transform: [{ scale: 1.18 }] },
  swatchLbl:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },

  // ── Ruled lines ───────────────────────────────────────────────────────────
  ruledContainer: {
    position: 'absolute',
    // top offset accounts for: header(~50) + toggle(~38) + input paddingTop(~16)
    top: 120,
    left: 18,
    right: 18,
    bottom: 54,
    justifyContent: 'space-around',
    zIndex: 0,
  },
  ruledLine: {
    height: 1,
    // IMPROVED: stronger opacity — more visible notebook paper effect
    backgroundColor: 'rgba(124,58,237,0.10)',
  },

  // ── Input ─────────────────────────────────────────────────────────────────
  input: {
    minHeight: 200,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 1,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.24)',
    gap: 8,
  },
  tagRow:      { flexDirection: 'row', gap: 6, alignItems: 'center' },
  fmtTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.28)',
  },
  fmtTagSubtle: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  fmtTagTxt: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  fmtDot:    { width: 8, height: 8, borderRadius: 999 },
  charCount: { fontSize: 11, fontWeight: '900', flexShrink: 0 },

  // ── Page navigator ────────────────────────────────────────────────────────
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.30)',
  },
  navArrowOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navArrowTxt: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: {
    width: 14,
    height: 14,
    borderColor: colors.primary,
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  addBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  addTxt: { color: '#22C55E', fontWeight: '900', fontSize: 12 },
  delBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  delTxt: { fontSize: 15 },
});