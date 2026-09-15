import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useT } from '../../i18n';
import { COLORS } from '../../utils/colors';
import { CHECK_MIN_HZ, CHECK_MAX_GPS_M, SPEED_TOLERANCE } from './setupOptions';

function Chip({ text, tone }) {
  const color = tone === 'bad' ? COLORS.bad : tone === 'warn' ? COLORS.moderate : tone === 'good' ? COLORS.good : COLORS.textMuted;
  return (
    <View style={[styles.chip, { borderColor: color + '55', backgroundColor: color + '12' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

// Chi doc gia tri co san (sampleCount, currentLocation, segmentResults) — khong
// dang ky sensor rieng trong luc do.
export function LiveStatusBar({ sampleCount, currentLocation, segmentResults, setup }) {
  const { t } = useT();
  const [hz, setHz] = useState(null);
  const lastRef = useRef({ count: sampleCount, time: Date.now() });

  useEffect(() => {
    const now = Date.now();
    const dt = (now - lastRef.current.time) / 1000;
    if (sampleCount < lastRef.current.count) {
      lastRef.current = { count: sampleCount, time: now };
      setHz(null);
      return;
    }
    if (dt >= 1.5) {
      setHz((sampleCount - lastRef.current.count) / dt);
      lastRef.current = { count: sampleCount, time: now };
    }
  }, [sampleCount]);

  const accuracy = currentLocation?.accuracy;
  const lastSource = segmentResults.length ? segmentResults[segmentResults.length - 1].source : null;
  const speedKmh = currentLocation?.speed != null ? currentLocation.speed * 3.6 : null;
  const target = setup?.targetSpeedKmh;
  const speedOff = target && speedKmh != null && Math.abs(speedKmh - target) / target > SPEED_TOLERANCE;

  return (
    <View style={styles.row}>
      <Chip
        text={hz != null ? t('status.hz', { n: hz.toFixed(0) }) : t('status.hz', { n: '--' })}
        tone={hz == null ? 'idle' : hz >= CHECK_MIN_HZ ? 'good' : 'warn'}
      />
      <Chip
        text={Number.isFinite(accuracy) ? t('status.gps', { n: accuracy.toFixed(0) }) : t('status.gpsNone')}
        tone={!Number.isFinite(accuracy) ? 'idle' : accuracy <= CHECK_MAX_GPS_M ? 'good' : 'warn'}
      />
      <Chip
        text={lastSource === 'client' ? t('common.offlineChip') : lastSource === 'backend' ? t('common.online') : '☁ …'}
        tone={lastSource === 'client' ? 'warn' : lastSource === 'backend' ? 'good' : 'idle'}
      />
      {setup && (
        <Chip
          text={`${setup.vehicle === 'motorbike' ? '🏍️' : '🚗'} ${t('status.speed', {
            v: speedKmh != null ? speedKmh.toFixed(0) : '--',
            t: target,
          })}`}
          tone={speedKmh == null ? 'idle' : speedOff ? 'warn' : 'good'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  text: { fontSize: 11, fontWeight: '700', color: COLORS.text, fontVariant: ['tabular-nums'] },
});
