import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { WebMapView } from '../ui/WebMapView';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useT } from '../../i18n';
import { useTripStore } from '../trips/TripStoreContext';
import { useTrip } from './useTrip';
import { COLORS, SHADOW } from '../../utils/colors';
import { classifyComfort, getComfortColor } from '../../utils/comfortClassifier';
import {
  coloredPolylines, regionFor, segmentAxis, worstSegments, haversineM,
} from '../analytics/tripMath';
import {
  ComfortPill, ComfortShareBar, ComfortShareLegend, ChipSelect, Button, Note,
} from '../ui/kit';
import {
  ScreenHeader, GradientHero, SectionHeader, Panel, ActionTile, ListRow, KeyValue, CenterState, screenStyles,
} from '../ui/screen';
import { LineChartXY, ChartLegend } from '../ui/charts';
import { fmtKm, fmtDuration, fmtNum, fmtTime, fmtDateTime, tripDisplayName, vehicleIcon } from '../ui/format';
import { exportCSV } from '../../services/csvExport';
import { exportGeoJSON, exportRawJSON, exportPdfReport } from '../export/exporters';
import { RenameModal } from '../history/RenameModal';

const MARK_LABELS = ['unlabeled', 'pothole', 'bump', 'crack', 'joint', 'other'];
const SPEED_COLOR = '#10B981';

export default function TripDetailScreen() {
  const { t, lang, comfortLabel } = useT();
  const navigation = useNavigation();
  const { params } = useRoute();
  const trip = useTrip(params.id);
  const { patchTrip, remove } = useTripStore();
  const mapRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [renaming, setRenaming] = useState(false);

  const name = trip ? tripDisplayName(trip, t, lang) : '';

  const derived = useMemo(() => {
    if (!trip) return null;
    const track = trip.track || [];
    const lines = coloredPolylines(trip.segments, track);
    const trackCoords = track
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map(p => ({ latitude: p.lat, longitude: p.lon }));
    const segCoords = trip.segments
      .filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon))
      .map(s => ({ latitude: s.lat, longitude: s.lon }));
    const axis = segmentAxis(trip.segments);
    return {
      lines,
      trackCoords,
      region: regionFor(trackCoords.length ? trackCoords : segCoords),
      axis,
      worst: worstSegments(trip.segments, 5),
      wrmsPoints: trip.segments.map((s, i) => ({ x: axis[i].midKm, y: s.wrms })),
      speedPoints: trip.segments
        .map((s, i) => ({ x: axis[i].midKm, y: Number.isFinite(s.speed) ? s.speed * 3.6 : NaN }))
        .filter(p => Number.isFinite(p.y)),
      legacy: trip.segments.some(s => !Number.isFinite(s.wallTime)),
    };
  }, [trip]);

  if (trip === undefined) {
    return <CenterState><ActivityIndicator color={COLORS.primary} /></CenterState>;
  }
  if (trip === null) {
    return (
      <View style={screenStyles.root}>
        <View style={styles.pad}>
          <ScreenHeader eyebrow={t('ui.trip.eyebrow')} title={t('trip.notFound')} onBack={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const s = trip.summary;
  const openSegment = (index) => navigation.navigate('SegmentDetail', { id: trip.id, index });

  // Cham vao duong → mo segment gan diem cham nhat (logic giu nguyen)
  const onMapPress = (lineIndex, coordinate) => {
    const line = derived.lines[lineIndex];
    if (!line) {
      if (Number.isFinite(lineIndex)) openSegment(lineIndex); // truong hop cham vao cham tron
      return;
    }
    let best = line.firstIndex;
    if (coordinate) {
      let bestD = Infinity;
      for (let i = line.firstIndex; i <= line.lastIndex; i++) {
        const seg = trip.segments[i];
        if (!Number.isFinite(seg.lat)) continue;
        const d = haversineM(coordinate.latitude, coordinate.longitude, seg.lat, seg.lon);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    openSegment(best);
  };

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert(t('common.error'), e?.message || String(e));
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = () => run('pdf', async () => {
    let snapshot = null;
    try {
      snapshot = await mapRef.current?.snapshot();
    } catch {
      snapshot = null; // bao cao van xuat duoc, chi thieu anh ban do
    }
    await exportPdfReport(trip, snapshot);
  });

  const setMarkLabel = (markId, label) => {
    const marks = trip.marks.map(m => (m.id === markId ? { ...m, label } : m));
    patchTrip(trip.id, { marks });
  };

  const confirmDelete = () => {
    Alert.alert(t('common.delete'), t('history.deleteConfirm', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await remove(trip.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const speedText = Number.isFinite(s.avgSpeedKmh) ? `${s.avgSpeedKmh.toFixed(1)} km/h` : '--';
  const vehicleText = trip.setup ? `${vehicleIcon(trip.setup.vehicle)} ${t(`vehicle.${trip.setup.vehicle}`)}` : '';

  return (
    <View style={screenStyles.root}>
      <ScrollView contentContainerStyle={screenStyles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={t('ui.trip.eyebrow')}
          title={name}
          subtitle={`${fmtDateTime(trip.startedAt, lang)}${vehicleText ? ` · ${vehicleText}` : ''}`}
          onBack={() => navigation.goBack()}
        />

        {/* Ban do */}
        <View style={styles.mapWrap}>
          <WebMapView
            ref={mapRef}
            style={styles.map}
            lines={derived.lines}
            track={derived.lines.length === 0 ? derived.trackCoords : undefined}
            points={derived.lines.length === 0
              ? trip.segments
                .map((seg, i) => ({ index: i, lat: seg.lat, lon: seg.lon, color: seg.color || getComfortColor(seg.wrms) }))
                .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
              : undefined}
            marks={(trip.marks || [])
              .filter(m => Number.isFinite(m.lat))
              .map(m => ({ id: m.id, lat: m.lat, lon: m.lon, label: t(`markLabel.${m.label}`) }))}
            region={derived.region}
            onPressLine={onMapPress}
          />
          {derived.lines.length > 0 && (
            <View style={styles.mapHint} pointerEvents="none">
              <Text style={styles.mapHintText}>{t('ui.trip.mapHint')}</Text>
            </View>
          )}
        </View>
        {derived.legacy && <Note tone="warn">{t('trip.legacy')}</Note>}

        {/* Hero tong quan */}
        <GradientHero
          style={screenStyles.gapTop}
          wrms={s.wrmsTotal}
          label={t('results.total')}
          value={fmtNum(s.wrmsTotal)}
          pill={comfortLabel(classifyComfort(s.wrmsTotal))}
          note={`${s.segmentCount} ${t('common.segments').toLowerCase()}${Number.isFinite(s.avgFs) ? ` · ${s.avgFs.toFixed(1)} Hz` : ''}`}
          stats={[
            { label: t('trip.distance'), value: `${fmtKm(s.distanceM)} km` },
            { label: t('trip.duration'), value: fmtDuration(s.durationS) },
            { label: t('trip.avgSpeed'), value: speedText },
          ]}
        />

        {/* Phan bo */}
        <SectionHeader title={s.shareByDistance ? t('trip.share') : t('trip.shareByTime')} />
        <Panel>
          <ComfortShareBar share={s.comfortShare} height={14} />
          <ComfortShareLegend share={s.comfortShare} comfortLabel={comfortLabel} />
        </Panel>

        {/* Bieu do WRMS theo km */}
        <SectionHeader title={t('trip.chart')} meta="km" />
        <Panel>
          <LineChartXY
            series={[{ points: derived.wrmsPoints, color: COLORS.primary }]}
            secondary={derived.speedPoints.length > 1 ? { points: derived.speedPoints, color: SPEED_COLOR } : undefined}
            xLabel="km"
          />
          <ChartLegend
            items={[
              { label: t('trip.chartLegendWrms'), color: COLORS.primary },
              ...(derived.speedPoints.length > 1 ? [{ label: t('trip.chartLegendSpeed'), color: SPEED_COLOR }] : []),
            ]}
          />
        </Panel>

        {/* 5 doan xau nhat */}
        <SectionHeader title={t('trip.worst')} meta={t('ui.trip.tapHint')} />
        <Panel flush>
          {derived.worst.map((i, rank) => {
            const seg = trip.segments[i];
            return (
              <ListRow
                key={i}
                badge={`#${rank + 1}`}
                title={`${fmtNum(seg.wrms)} m/s²`}
                subtitle={`${t('trip.atKm', { km: derived.axis[i].midKm.toFixed(2) })}${Number.isFinite(seg.speed) ? ` · ${(seg.speed * 3.6).toFixed(0)} km/h` : ''}`}
                right={<ComfortPill wrms={seg.wrms} label={comfortLabel(classifyComfort(seg.wrms))} />}
                onPress={() => openSegment(i)}
                last={rank === derived.worst.length - 1}
                chevron
              />
            );
          })}
        </Panel>

        {/* Thiet lap */}
        <SectionHeader title={t('trip.setup')} />
        <Panel style={styles.kvPanel}>
          <KeyValue label={t('prepare.vehicle')} value={trip.setup ? `${vehicleIcon(trip.setup.vehicle)} ${t(`vehicle.${trip.setup.vehicle}`)}` : '--'} />
          <KeyValue label={t('prepare.mount')} value={trip.setup ? t(`mount.${trip.setup.mount}`) : '--'} />
          <KeyValue label={t('trip.targetSpeed')} value={trip.setup ? `${trip.setup.targetSpeedKmh} km/h` : '--'} />
          <KeyValue label={t('common.segments')} value={String(s.segmentCount)} />
          <KeyValue label={t('trip.sampleRateAvg')} value={Number.isFinite(s.avgFs) ? `${s.avgFs.toFixed(1)} Hz` : '--'} />
          <KeyValue label={t('trip.offlineSegments')} value={String(s.offlineCount)} last />
        </Panel>

        {/* Diem danh dau */}
        <SectionHeader title={t('trip.marks')} meta={String(trip.marks?.length || 0)} />
        <Panel>
          {!trip.marks?.length && <Text style={screenStyles.mutedText}>{t('trip.marksEmpty')}</Text>}
          {(trip.marks || []).map((m, i) => (
            <View key={m.id} style={[styles.markRow, i === trip.marks.length - 1 && styles.markRowLast]}>
              <View style={styles.markHead}>
                <View style={styles.markBadge}>
                  <Text style={styles.markBadgeText}>📍 {i + 1}</Text>
                </View>
                <Text style={styles.markMeta} numberOfLines={1}>
                  {fmtTime(m.wallTime)}
                  {Number.isFinite(m.lat) ? ` · ${m.lat.toFixed(5)}, ${m.lon.toFixed(5)}` : ''}
                </Text>
              </View>
              <ChipSelect
                value={m.label}
                onChange={(label) => setMarkLabel(m.id, label)}
                options={MARK_LABELS.map(l => ({ value: l, label: t(`markLabel.${l}`) }))}
              />
            </View>
          ))}
        </Panel>

        {/* Xuat du lieu */}
        <SectionHeader title={t('trip.export')} />
        <View style={screenStyles.row2}>
          <ActionTile
            badge="CSV"
            tint="#ECFDF5"
            color={COLORS.good}
            title={busy === 'csv' ? t('trip.exporting') : t('trip.csv')}
            hint={t('ui.trip.csvHint')}
            busy={busy === 'csv'}
            disabled={!!busy}
            onPress={() => run('csv', () => exportCSV(trip.segments, { setup: trip.setup, fileName: `${trip.id}.csv` }))}
          />
          <ActionTile
            badge="GEO"
            tint="#F5F3FF"
            color="#8B5CF6"
            title={busy === 'geo' ? t('trip.exporting') : t('trip.geojson')}
            hint={t('ui.trip.geoHint')}
            busy={busy === 'geo'}
            disabled={!!busy}
            onPress={() => run('geo', () => exportGeoJSON(trip))}
          />
        </View>
        <View style={[screenStyles.row2, screenStyles.gapTop]}>
          <ActionTile
            badge="{ }"
            tint={COLORS.surfaceMuted}
            color={COLORS.text}
            title={busy === 'json' ? t('trip.exporting') : t('trip.json')}
            hint={t('ui.trip.jsonHint')}
            busy={busy === 'json'}
            disabled={!!busy}
            onPress={() => run('json', () => exportRawJSON(trip))}
          />
          <ActionTile
            badge="PDF"
            tint="#FEF2F2"
            color={COLORS.bad}
            title={busy === 'pdf' ? t('trip.exporting') : t('trip.pdf')}
            hint={t('ui.trip.pdfHint')}
            busy={busy === 'pdf'}
            disabled={!!busy}
            onPress={exportPdf}
          />
        </View>

        {/* Quan ly */}
        <SectionHeader title={t('ui.trip.manage')} />
        <View style={screenStyles.row2}>
          <Button title={t('common.rename')} variant="ghost" onPress={() => setRenaming(true)} style={styles.flex} />
          <Button title={t('common.delete')} variant="danger" onPress={confirmDelete} style={styles.flex} />
        </View>
      </ScrollView>

      <RenameModal
        visible={renaming}
        initialName={name}
        onCancel={() => setRenaming(false)}
        onSave={(newName) => {
          setRenaming(false);
          patchTrip(trip.id, { name: newName });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  mapWrap: { borderRadius: 22, overflow: 'hidden', backgroundColor: COLORS.surfaceMuted, ...SHADOW.md },
  map: { height: 280 },
  mapEmpty: { alignItems: 'center', justifyContent: 'center' },
  mapHint: {
    position: 'absolute',
    left: 12,
    top: 12, // tren cung de khong che logo / Legal cua ban do o goc duoi
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  mapHintText: { fontSize: 10, fontWeight: '700', color: COLORS.text },
  segDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  markPin: { fontSize: 20 },
  kvPanel: { paddingVertical: 4 },
  markRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 10 },
  markRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  markHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markBadge: { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  markBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.bad },
  markMeta: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
});
