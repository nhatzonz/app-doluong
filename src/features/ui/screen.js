// Khung giao dien dung chung cho cac man moi, dong bo phong cach voi man cu
// (HomeScreen / ResultScreen / ChartScreen): header eyebrow + title lon,
// hero gradient theo muc do em, dai chi so nho, the hanh dong, dong danh sach.
// CHI LA GIAO DIEN — khong chua logic.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOW, comfortGradient } from '../../utils/colors';

export function ScreenHeader({ eyebrow, title, subtitle, onBack, onClose, right, modal }) {
  return (
    <View style={[styles.header, modal && styles.headerModal]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={8} accessibilityRole="button">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} hitSlop={8} accessibilityRole="button">
          <Text style={styles.closeGlyph}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Hero gradient giong the "WRMS TONG" o man Ket qua
export function GradientHero({ wrms = 0, label, value, unit = 'm/s²', pill, note, stats, size = 'lg', style }) {
  const [from, to] = comfortGradient(wrms);
  const small = size === 'sm';
  return (
    <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, small && styles.heroSm, style]}>
      {label ? <Text style={styles.heroLabel} numberOfLines={1}>{label}</Text> : null}
      <Text style={[styles.heroValue, small && styles.heroValueSm]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {unit ? <Text style={styles.heroUnit}>{unit}</Text> : null}
      {pill ? (
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText} numberOfLines={1}>{pill}</Text>
        </View>
      ) : null}
      {note ? <Text style={styles.heroNote}>{note}</Text> : null}
      {stats?.length ? (
        <View style={styles.heroStats}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.heroStatDivider} />}
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel} numberOfLines={1}>{s.label}</Text>
                <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
}

// Dai chi so nho giong "MAU · DOAN · GIA TOC DONG" o man Do
export function StatStrip({ items, style }) {
  return (
    <View style={[styles.strip, style]}>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i > 0 && <View style={styles.stripDivider} />}
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, it.color && { color: it.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {it.value}
              {it.unit ? <Text style={styles.stripUnit}> {it.unit}</Text> : null}
            </Text>
            <Text style={styles.stripLabel} numberOfLines={1}>{it.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function SectionHeader({ title, meta, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta != null ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

export function Panel({ children, style, flush }) {
  return <View style={[styles.panel, flush && styles.panelFlush, style]}>{children}</View>;
}

// The hanh dong giong "Xuat CSV / Phan tich ML" o man Ket qua
export function ActionTile({ badge, tint = '#EFF6FF', color = COLORS.primary, title, hint, onPress, disabled, busy, style }) {
  return (
    <TouchableOpacity
      style={[styles.tile, disabled && { opacity: 0.5 }, style]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        {busy ? <ActivityIndicator size="small" color={color} /> : <Text style={[styles.tileIconText, { color }]}>{badge}</Text>}
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
      {hint ? <Text style={styles.tileHint} numberOfLines={1}>{hint}</Text> : null}
    </TouchableOpacity>
  );
}

// Dong danh sach giong danh sach doan o man Ket qua
export function ListRow({ badge, title, subtitle, right, onPress, last, chevron }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.row, last && { borderBottomWidth: 0 }]}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      {badge != null ? (
        <View style={styles.rowBadge}>
          <Text style={styles.rowBadgeText} numberOfLines={1}>{badge}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        {typeof title === 'string' ? <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text> : title}
        {subtitle ? <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <Text style={styles.chevron}>›</Text> : null}
    </Wrapper>
  );
}

export function KeyValue({ label, value, last }) {
  return (
    <View style={[styles.kv, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue} selectable>{value}</Text>
    </View>
  );
}

export function CenterState({ children }) {
  return <View style={styles.center}>{children}</View>;
}

export const screenStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  scrollTab: { paddingHorizontal: 20, paddingBottom: 120 },
  row2: { flexDirection: 'row', gap: 12 },
  gapTop: { marginTop: 12 },
  mutedText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  bodyText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 58,
    paddingBottom: 14,
    gap: 12,
  },
  headerModal: { paddingTop: 22 },
  headerText: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: 8, marginTop: 4 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...SHADOW.sm,
  },
  backGlyph: { fontSize: 28, lineHeight: 30, color: COLORS.text, fontWeight: '400', marginTop: -2, marginRight: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeGlyph: { fontSize: 14, color: COLORS.textMuted, fontWeight: '800' },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: COLORS.textMuted, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 2, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  hero: { borderRadius: 22, padding: 20, alignItems: 'center', ...SHADOW.md },
  heroSm: { padding: 14, borderRadius: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  heroValueSm: { fontSize: 30, letterSpacing: -0.8 },
  heroUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: -4, letterSpacing: 1 },
  heroPill: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  heroPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroNote: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  heroStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  heroStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  heroStatDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.3)' },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 12,
    ...SHADOW.sm,
  },
  stripItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  stripValue: { fontSize: 17, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  stripUnit: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  stripLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 },
  stripDivider: { width: 1, height: 26, backgroundColor: COLORS.divider },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  sectionMeta: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1 },

  panel: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, ...SHADOW.sm },
  panelFlush: { padding: 0, overflow: 'hidden' },

  tile: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, ...SHADOW.sm },
  tileIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileIconText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  tileTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  tileHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  rowTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
  rowSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: -4 },

  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  kvLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', flexShrink: 1 },
  kvValue: { fontSize: 13, color: COLORS.text, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.bg },
});
