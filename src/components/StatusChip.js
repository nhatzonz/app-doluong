import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/colors';

export function StatusChip({ status = 'idle', label }) {
  const map = {
    connected: { color: COLORS.good, text: label || 'Connected' },
    recording: { color: COLORS.bad, text: label || 'Recording' },
    reconnecting: { color: COLORS.moderate, text: label || 'Reconnecting' },
    offline: { color: COLORS.bad, text: label || 'Offline' },
    idle: { color: COLORS.textMuted, text: label || 'Idle' },
  };
  const s = map[status] || map.idle;

  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: s.color }]} />
      <Text style={styles.label}>{s.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
