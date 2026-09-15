import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useT } from '../../i18n';
import { useTripStore } from '../trips/TripStoreContext';
import { COLORS } from '../../utils/colors';
import { histogram, linearFit, median, roughShare } from '../analytics/tripMath';
import { ChipSelect } from '../ui/kit';
import { ScreenHeader, StatStrip, SectionHeader, Panel, CenterState, screenStyles } from '../ui/screen';
import { ScatterPlot, HistogramChart, ChartLegend } from '../ui/charts';
import { fmtKm, fmtPct } from '../ui/format';

const VEHICLE_COLOR = { car: '#2E8BFF', motorbike: '#F97316', unknown: '#9AA1AD' };
const HIST_BIN = 0.1;
const HIST_MAX = 3.0;

export function computeStats(trips) {
  let totalM = 0;
  let roughM = 0;
  const points = [];
  const wrms = [];
  const ratios = [];

  trips.forEach(trip => {
    const s = trip.summary;
    const vehicle = trip.setup?.vehicle || 'unknown';
    totalM += s.distanceM || 0;
    roughM += (s.distanceM || 0) * roughShare(s.comfortShare || {});
    trip.segments.forEach(seg => {
      if (!Number.isFinite(seg.wrms)) return;
      wrms.push(seg.wrms);
      if (Number.isFinite(seg.speed)) {
        points.push({ x: seg.speed * 3.6, y: seg.wrms, color: VEHICLE_COLOR[vehicle], vehicle });
      }
      if (seg.aw_xy > 0 && Number.isFinite(seg.aw_z)) ratios.push(seg.aw_z / seg.aw_xy);
    });
  });

  // Hoi quy RIENG tung loai xe: gop o to + xe may tao xu huong gia (Simpson's
  // paradox — xe may rung manh hon nhung chay cham hon → doc am gia tao).
  const fits = [...new Set(points.map(p => p.vehicle))]
    .map(vehicle => {
      const group = points.filter(p => p.vehicle === vehicle);
      const fit = linearFit(group.map(p => p.x), group.map(p => p.y));
      if (!fit) return null;
      const xs = group.map(p => p.x);
      return { ...fit, vehicle, n: group.length, color: VEHICLE_COLOR[vehicle], xMin: Math.min(...xs), xMax: Math.max(...xs) };
    })
    .filter(Boolean);

  return {
    tripCount: trips.length,
    totalM,
    roughRatio: totalM > 0 ? roughM / totalM : null,
    points,
    fits,
    bins: histogram(wrms.map(v => Math.min(v, HIST_MAX - 1e-9)), HIST_BIN, Math.min(HIST_MAX, Math.max(0.7, ...wrms))),
    axisRatio: median(ratios),
    vehicles: [...new Set(trips.map(tr => tr.setup?.vehicle || 'unknown'))],
  };
}

export default function StatsScreen() {
  const { t } = useT();
  const navigation = useNavigation();
  const { index, getTrip } = useTripStore();
  const [trips, setTrips] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    Promise.all(index.map(m => getTrip(m.id)))
      .then(list => { if (alive) setTrips(list.filter(Boolean)); });
    return () => { alive = false; };
  }, [index, getTrip]);

  const filtered = useMemo(
    () => (trips || []).filter(tr => filter === 'all' || tr.setup?.vehicle === filter),
    [trips, filter]
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  if (trips === null) {
    return <CenterState><ActivityIndicator color={COLORS.primary} /></CenterState>;
  }

  return (
    <View style={screenStyles.root}>
      <ScrollView contentContainerStyle={screenStyles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={t('ui.stats.eyebrow')}
          title={t('stats.title')}
          subtitle={t('stats.subtitle', { n: trips.length })}
          onBack={() => navigation.goBack()}
        />

        <ChipSelect
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('stats.all') },
            { value: 'car', label: `🚗 ${t('vehicle.car')}` },
            { value: 'motorbike', label: `🏍️ ${t('vehicle.motorbike')}` },
          ]}
        />

        {filtered.length === 0 ? (
          <Panel style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('stats.empty')}</Text>
          </Panel>
        ) : (
          <>
            <StatStrip
              style={screenStyles.gapTop}
              items={[
                { label: t('stats.kpiKm').toUpperCase(), value: fmtKm(stats.totalM) },
                { label: t('stats.kpiTrips').toUpperCase(), value: String(stats.tripCount) },
                { label: t('stats.kpiBad').toUpperCase(), value: fmtPct(stats.roughRatio, 1), color: COLORS.bad },
              ]}
            />
            <Text style={[screenStyles.mutedText, styles.hint]}>* {t('stats.kpiBadHint')}</Text>

            <SectionHeader title={t('stats.scatter')} meta="km/h" />
            <Panel>
              {stats.points.length > 1 ? (
                <>
                  <ScatterPlot points={stats.points} fits={stats.fits} xLabel="km/h" />
                  <ChartLegend
                    items={stats.vehicles.filter(v => v !== 'unknown').map(v => ({ label: t(`vehicle.${v}`), color: VEHICLE_COLOR[v] }))}
                  />
                  <Text style={[screenStyles.mutedText, styles.hint]}>{t('stats.scatterHint')}</Text>
                  <View style={styles.fitRow}>
                    {stats.fits.map(f => (
                      <View key={f.vehicle} style={[styles.fitChip, { borderColor: f.color + '55', backgroundColor: f.color + '12' }]}>
                        <View style={[styles.fitDot, { backgroundColor: f.color }]} />
                        <Text style={[styles.fitText, { color: f.color }]}>
                          {f.vehicle === 'unknown' ? '—' : t(`vehicle.${f.vehicle}`)} · r = {f.r.toFixed(2)} · n = {f.n}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={screenStyles.mutedText}>{t('stats.noSpeed')}</Text>
              )}
            </Panel>

            <SectionHeader title={t('stats.histogram')} meta={`m/s² · bin ${HIST_BIN}`} />
            <Panel>
              <HistogramChart bins={stats.bins} />
            </Panel>

            <SectionHeader title={t('stats.axisRatio')} meta="aw_z / aw_xy" />
            <Panel style={styles.ratioPanel}>
              <Text style={styles.ratioValue}>{stats.axisRatio != null ? stats.axisRatio.toFixed(2) : '--'}</Text>
              <Text style={[screenStyles.mutedText, styles.ratioHint]}>
                {t('stats.axisRatioHint', { r: stats.axisRatio != null ? stats.axisRatio.toFixed(2) : '--' })}
              </Text>
            </Panel>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 32, marginTop: 14 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  fitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  fitChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  fitDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  fitText: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  ratioPanel: { alignItems: 'center', paddingVertical: 20 },
  ratioValue: { fontSize: 40, fontWeight: '800', color: COLORS.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ratioHint: { marginTop: 4, textAlign: 'center' },
});
