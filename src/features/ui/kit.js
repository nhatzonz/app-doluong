import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SHADOW } from '../../utils/colors';
import { getComfortColor } from '../../utils/comfortClassifier';
import { COMFORT_CODES, COMFORT_THRESHOLDS } from '../analytics/tripMath';
import { fmtPct } from './format';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Kpi({ label, value, unit, color }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.kpiUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function KpiRow({ children }) {
  return <View style={styles.kpiRow}>{children}</View>;
}

export function InfoRow({ label, value, last }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>{value}</Text>
    </View>
  );
}

// Chon 1 trong nhieu (segmented)
export function ChipSelect({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, style }) {
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.btn,
        primary && { backgroundColor: COLORS.primary },
        danger && { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 },
        !primary && !danger && { backgroundColor: COLORS.surfaceMuted },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={[styles.btnText, primary && { color: '#FFFFFF' }, danger && { color: COLORS.bad }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function IconButton({ glyph, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.iconBtn}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </TouchableOpacity>
  );
}

export function Note({ children, tone = 'info' }) {
  const palette = tone === 'warn'
    ? { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' }
    : tone === 'ok'
      ? { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' }
      : { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' };
  return (
    <View style={[styles.note, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.noteText, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

// Pill mau + chu (khong chi dua vao mau → nguoi mu mau van doc duoc)
export function ComfortPill({ wrms, label }) {
  const color = getComfortColor(wrms);
  return (
    <View style={[styles.pill, { backgroundColor: color + '1A', borderColor: color + '33' }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// Thanh xep chong ty le 6 muc
export function ComfortShareBar({ share, height = 12 }) {
  return (
    <View style={[styles.shareBar, { height, borderRadius: height / 2 }]}>
      {COMFORT_CODES.map((code, i) => {
        const v = share?.[code] || 0;
        if (v <= 0) return null;
        return (
          <View
            key={code}
            style={{ flex: v, backgroundColor: getComfortColor(COMFORT_THRESHOLDS[i]) }}
          />
        );
      })}
    </View>
  );
}

export function ComfortShareLegend({ share, comfortLabel }) {
  return (
    <View style={styles.legend}>
      {COMFORT_CODES.map((code, i) => (
        <View key={code} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getComfortColor(COMFORT_THRESHOLDS[i]) }]} />
          <Text style={styles.legendText} numberOfLines={1}>{comfortLabel(code)}</Text>
          <Text style={styles.legendValue}>{fmtPct(share?.[code] || 0, 1)}</Text>
        </View>
      ))}
    </View>
  );
}

export const kitStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  body: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  muted: { fontSize: 12, color: COLORS.textMuted },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    ...SHADOW.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
  kpiUnit: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  kpiLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', flexShrink: 1 },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    flexShrink: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  chipActive: { backgroundColor: COLORS.primary + '14', borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  chipTextActive: { color: COLORS.primary },
  btn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: { fontSize: 16, color: COLORS.text },
  note: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  noteText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptyHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 150,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  pillText: { fontSize: 11, fontWeight: '700' },
  shareBar: { flexDirection: 'row', overflow: 'hidden', backgroundColor: COLORS.surfaceMuted },
  legend: { marginTop: 10, gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, fontSize: 12, color: COLORS.text, fontWeight: '600' },
  legendValue: { fontSize: 12, color: COLORS.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
