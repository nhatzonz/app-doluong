import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getComfortColor } from '../utils/comfortClassifier';

export function ComfortBadge({ wrms, comfort }) {
  const color = getComfortColor(wrms);

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.wrms}>{wrms.toFixed(3)} m/s²</Text>
      <Text style={styles.label}>{comfort}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  wrms: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
});
