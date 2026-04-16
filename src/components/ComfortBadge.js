import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { comfortGradient, SHADOW } from '../utils/colors';

export function ComfortBadge({ wrms, comfort }) {
  const [from, to] = comfortGradient(wrms);

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.badge}
    >
      <Text style={styles.wrms}>{wrms.toFixed(3)} m/s²</Text>
      <Text style={styles.label}>{comfort}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    alignItems: 'center',
    ...SHADOW.md,
  },
  wrms: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
