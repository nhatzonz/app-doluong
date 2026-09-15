import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useT } from '../../i18n';
import { useTrip } from '../trip/useTrip';
import { COLORS, SHADOW } from '../../utils/colors';
import { classifyComfort } from '../../utils/comfortClassifier';
import { segmentAxis, COMFORT_CODES } from '../analytics/tripMath';
import { ComfortShareBar, Note } from '../ui/kit';
import { ScreenHeader, GradientHero, SectionHeader, Panel, CenterState, screenStyles } from '../ui/screen';
import { LineChartXY, ChartLegend } from '../ui/charts';
import { fmtDateTime, fmtDuration, fmtKm, fmtNum, fmtPct, tripDisplayName, vehicleIcon } from '../ui/format';

const COLOR_A = '#2E8BFF';
const COLOR_B = '#F97316';
const SPEED_DIFF_KMH = 10;

// Canh bao khi 2 chuyen khong cung dieu kien do
export function comparability(a, b) {
  const warnings = [];
  const sa = a.setup;
  const sb = b.setup;
  if (!sa || !sb) return warnings;
  if (sa.vehicle !== sb.vehicle) warnings.push('compare.warnVehicle');
  if (sa.mount !== sb.mount) warnings.push('compare.warnMount');
  if (Math.abs((sa.targetSpeedKmh ?? 0) - (sb.targetSpeedKmh ?? 0)) > SPEED_DIFF_KMH) warnings.push('compare.warnSpeed');
  return warnings;
}

function Row({ label, a, b, last, strong }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.rowLabel, strong && styles.rowLabelStrong]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.rowValue, { color: COLOR_A }]}>{a}</Text>
      <Text style={[styles.rowValue, { color: COLOR_B }]}>{b}</Text>
    </View>
  );
}

function Tag({ letter, color }) {
  return (
    <View style={[styles.tag, { backgroundColor: color }]}>
      <Text style={styles.tagText}>{letter}</Text>
    </View>
  );
}

export default function CompareScreen() {
  const { t, lang, comfortLabel } = useT();
  const navigation = useNavigation();
  const { params } = useRoute();
  const a = useTrip(params.a);
  const b = useTrip(params.b);

  if (a === undefined || b === undefined) {
    return <CenterState><ActivityIndicator color={COLORS.primary} /></CenterState>;
  }
  if (!a || !b) {
    return (
      <View style={screenStyles.root}>
        <View style={styles.pad}>
          <ScreenHeader eyebrow={t('ui.compare.eyebrow')} title={t('trip.notFound')} onBack={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const warnings = comparability(a, b);
  const toPoints = (trip) => {
    const axis = segmentAxis(trip.segments);
    return trip.segments.map((s, i) => ({ x: axis[i].midKm, y: s.wrms }));
  };
  const sa = a.summary;
  const sb = b.summary;
  const speed = (v) => (Number.isFinite(v) ? `${v.toFixed(1)} km/h` : '--');
  const setupText = (trip) => (trip.setup
    ? `${vehicleIcon(trip.setup.vehicle)} ${t(`mount.${trip.setup.mount}`)} · ${trip.setup.targetSpeedKmh} km/h`
    : '--');

  const side = (trip, summary, letter, color) => (
    <View style={styles.side}>
      <GradientHero
        size="sm"
        wrms={summary.wrmsTotal}
        label={`WRMS · ${letter}`}
        value={fmtNum(summary.wrmsTotal)}
        pill={comfortLabel(classifyComfort(summary.wrmsTotal))}
      />
      <View style={styles.sideInfo}>
        <View style={styles.sideTitleRow}>
          <Tag letter={letter} color={color} />
          <Text style={styles.sideName} numberOfLines={2}>{tripDisplayName(trip, t, lang)}</Text>
        </View>
        <Text style={styles.sideMeta} numberOfLines={1}>{fmtDateTime(trip.startedAt, lang)}</Text>
        <Text style={styles.sideMeta} numberOfLines={1}>{setupText(trip)}</Text>
      </View>
    </View>
  );

  return (
    <View style={screenStyles.root}>
      <ScrollView contentContainerStyle={screenStyles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={t('ui.compare.eyebrow')}
          title={t('compare.title')}
          onBack={() => navigation.goBack()}
        />

        <View style={screenStyles.row2}>
          {side(a, sa, 'A', COLOR_A)}
          {side(b, sb, 'B', COLOR_B)}
        </View>

        <SectionHeader title={t('ui.compare.conditions')} />
        {warnings.length === 0
          ? <Note tone="ok">{t('compare.ok')}</Note>
          : warnings.map(w => <Note key={w} tone="warn">{t(w)}</Note>)}

        <SectionHeader title={t('ui.compare.table')} />
        <Panel flush>
          <View style={styles.tableHead}>
            <Text style={styles.rowLabel} />
            <View style={styles.headCell}><Tag letter="A" color={COLOR_A} /></View>
            <View style={styles.headCell}><Tag letter="B" color={COLOR_B} /></View>
          </View>
          <View style={styles.tableBody}>
            <Row strong label={t('trip.wrmsTotal')} a={fmtNum(sa.wrmsTotal)} b={fmtNum(sb.wrmsTotal)} />
            <Row label={t('trip.distance')} a={`${fmtKm(sa.distanceM)} km`} b={`${fmtKm(sb.distanceM)} km`} />
            <Row label={t('trip.duration')} a={fmtDuration(sa.durationS)} b={fmtDuration(sb.durationS)} />
            <Row label={t('trip.avgSpeed')} a={speed(sa.avgSpeedKmh)} b={speed(sb.avgSpeedKmh)} />
            <Row label={t('common.segments')} a={String(sa.segmentCount)} b={String(sb.segmentCount)} />
            {COMFORT_CODES.map((code, i) => (
              <Row
                key={code}
                label={comfortLabel(code)}
                a={fmtPct(sa.comfortShare?.[code] || 0, 1)}
                b={fmtPct(sb.comfortShare?.[code] || 0, 1)}
                last={i === COMFORT_CODES.length - 1}
              />
            ))}
          </View>
        </Panel>

        <SectionHeader title={t('trip.share')} />
        <Panel>
          <View style={styles.barRow}>
            <Tag letter="A" color={COLOR_A} />
            <View style={styles.barFlex}><ComfortShareBar share={sa.comfortShare} height={14} /></View>
          </View>
          <View style={[styles.barRow, { marginTop: 12 }]}>
            <Tag letter="B" color={COLOR_B} />
            <View style={styles.barFlex}><ComfortShareBar share={sb.comfortShare} height={14} /></View>
          </View>
        </Panel>

        <SectionHeader title={t('compare.overlay')} meta="km" />
        <Panel>
          <LineChartXY
            series={[
              { points: toPoints(a), color: COLOR_A },
              { points: toPoints(b), color: COLOR_B, dashed: true },
            ]}
            xLabel="km"
          />
          <ChartLegend items={[{ label: 'A', color: COLOR_A }, { label: 'B', color: COLOR_B, dashed: true }]} />
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  side: { flex: 1 },
  sideInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    ...SHADOW.sm,
  },
  sideTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sideName: { flex: 1, fontSize: 13, fontWeight: '800', color: COLORS.text },
  sideMeta: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 4, fontVariant: ['tabular-nums'] },
  tag: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  tagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceMuted,
  },
  headCell: { width: 92, alignItems: 'flex-end' },
  tableBody: { paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowLabel: { flex: 1, fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  rowLabelStrong: { color: COLORS.text, fontWeight: '800' },
  rowValue: { width: 92, textAlign: 'right', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barFlex: { flex: 1 },
});
