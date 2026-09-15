import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useT } from '../../i18n';
import { useTrip } from './useTrip';
import { COLORS } from '../../utils/colors';
import { classifyComfort } from '../../utils/comfortClassifier';
import { segmentAxis } from '../analytics/tripMath';
import { Note } from '../ui/kit';
import { ScreenHeader, GradientHero, SectionHeader, Panel, KeyValue, CenterState, screenStyles } from '../ui/screen';
import { fmtNum, fmtTime } from '../ui/format';

function AxisBar({ label, value, max, color, last }) {
  const ratio = max > 0 && Number.isFinite(value) ? Math.min(1, value / max) : 0;
  return (
    <View style={[styles.barRow, last && { marginBottom: 0 }]}>
      <View style={styles.barHead}>
        <View style={styles.barLabelWrap}>
          <View style={[styles.barDot, { backgroundColor: color }]} />
          <Text style={styles.barLabel}>{label}</Text>
        </View>
        <Text style={styles.barValue}>{fmtNum(value)} <Text style={styles.barUnit}>m/s²</Text></Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function SegmentDetailScreen() {
  const { t, comfortLabel } = useT();
  const navigation = useNavigation();
  const { params } = useRoute();
  const trip = useTrip(params.id);
  const seg = trip?.segments?.[params.index];

  const km = useMemo(
    () => (trip ? segmentAxis(trip.segments)[params.index]?.midKm : null),
    [trip, params.index]
  );

  if (trip === undefined) {
    return <CenterState><ActivityIndicator color={COLORS.primary} /></CenterState>;
  }
  if (!seg) {
    return (
      <View style={screenStyles.root}>
        <View style={styles.pad}>
          <ScreenHeader modal eyebrow={t('ui.segment.eyebrow')} title={t('trip.notFound')} onClose={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const maxAxis = Math.max(seg.aw_z || 0, seg.aw_xy || 0, 0.001);
  const nearMarks = (trip.marks || []).filter(m => Number.isFinite(seg.wallTime)
    && m.wallTime >= seg.wallTime - 2000 && m.wallTime <= (seg.wallTimeEnd ?? seg.wallTime) + 2000);
  const hasAxes = Number.isFinite(seg.aw_z) || Number.isFinite(seg.aw_xy);

  return (
    <View style={screenStyles.root}>
      <ScrollView contentContainerStyle={screenStyles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          modal
          eyebrow={t('ui.segment.eyebrow')}
          title={t('segment.title', { n: params.index + 1 })}
          subtitle={`${fmtTime(seg.wallTime)}${Number.isFinite(km) ? ` · ${km.toFixed(3)} km` : ''}`}
          onClose={() => navigation.goBack()}
        />

        <GradientHero
          wrms={seg.wrms}
          label="WRMS (av)"
          value={fmtNum(seg.wrms)}
          pill={comfortLabel(classifyComfort(seg.wrms))}
          stats={[
            { label: 'aw_z', value: fmtNum(seg.aw_z) },
            { label: 'aw_xy', value: fmtNum(seg.aw_xy) },
            { label: t('segment.speed'), value: Number.isFinite(seg.speed) ? `${(seg.speed * 3.6).toFixed(1)} km/h` : '--' },
          ]}
        />

        {hasAxes && (
          <>
            <SectionHeader title={t('ui.segment.axes')} />
            <Panel>
              <AxisBar label={t('segment.awz')} value={seg.aw_z} max={maxAxis} color={COLORS.primary} />
              <AxisBar label={t('segment.awxy')} value={seg.aw_xy} max={maxAxis} color="#8B5CF6" last />
              <Note>{t('segment.hint')}</Note>
            </Panel>
          </>
        )}

        <SectionHeader title={t('trip.summary')} />
        <Panel style={styles.kvPanel}>
          <KeyValue label={t('segment.time')} value={fmtTime(seg.wallTime)} />
          <KeyValue label={t('segment.atKm')} value={Number.isFinite(km) ? `${km.toFixed(3)} km` : '--'} />
          <KeyValue label={t('segment.speed')} value={Number.isFinite(seg.speed) ? `${(seg.speed * 3.6).toFixed(1)} km/h` : '--'} />
          <KeyValue
            label={t('segment.position')}
            value={Number.isFinite(seg.lat) ? `${seg.lat.toFixed(6)}, ${seg.lon.toFixed(6)}` : t('common.noGps')}
          />
          <KeyValue label={t('segment.duration')} value={Number.isFinite(seg.duration) ? `${seg.duration.toFixed(2)} s` : '--'} />
          <KeyValue label={t('segment.fs')} value={Number.isFinite(seg.fs) ? `${seg.fs.toFixed(1)} Hz` : '--'} />
          <KeyValue
            label={t('segment.source')}
            value={seg.source === 'client' ? t('segment.sourceClient') : seg.source === 'backend' ? t('segment.sourceBackend') : '--'}
            last={nearMarks.length === 0}
          />
          {nearMarks.length > 0 && (
            <KeyValue
              label={t('trip.marks')}
              value={nearMarks.map(m => t(`markLabel.${m.label}`)).join(', ')}
              last
            />
          )}
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  kvPanel: { paddingVertical: 4 },
  barRow: { marginBottom: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  barDot: { width: 8, height: 8, borderRadius: 4 },
  barLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  barValue: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'] },
  barUnit: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  track: { height: 10, borderRadius: 5, backgroundColor: COLORS.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
