import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOW } from '../utils/colors';
import { Sparkline } from './Sparkline';

// Single-metric card (White Premium). Used in a 2x2 grid on Home.
// Props:
//   label   — e.g., "aX"
//   value   — string, formatted value
//   unit    — e.g., "m/s²"
//   trend   — optional number array for sparkline
//   color   — accent color (line color / label tint)
//   hint    — optional caption
export function MetricCard({ label, value, unit, trend, color = COLORS.primary, hint }) {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={[styles.labelPill, { backgroundColor: color + '14' }]}>
          <Text style={[styles.label, { color }]}>{label}</Text>
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.unit}>  {unit}</Text> : null}
      </Text>

      <View style={styles.spark}>
        <Sparkline data={trend || []} color={color} width={120} height={24} />
      </View>
    </View>
  );
}

// Back-compat: original grouped card used by other screens if any
export function SensorDataCard({ title, items }) {
  return (
    <View style={styles.groupCard}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupRow}>
        {items.map((item, i) => (
          <View key={i} style={styles.groupItem}>
            <Text style={styles.groupLabel}>{item.label}</Text>
            <Text style={styles.groupValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    minHeight: 112,
    ...SHADOW.sm,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hint: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  spark: {
    marginTop: 6,
    alignItems: 'flex-start',
  },

  // Back-compat grouped card
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 16,
    ...SHADOW.sm,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 10,
    letterSpacing: 1,
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  groupItem: {
    alignItems: 'center',
    flex: 1,
  },
  groupLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  groupValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});
