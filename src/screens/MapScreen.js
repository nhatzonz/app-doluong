import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useMeasurementContext } from '../context/MeasurementContext';
import { COLORS, SHADOW, comfortSoloColor } from '../utils/colors';

export default function MapScreen() {
  const { state } = useMeasurementContext();
  const { locationHistory, segmentResults, isRecording } = state;

  const routeCoords = locationHistory
    .filter(l => l.lat && l.lon)
    .map(l => ({ latitude: l.lat, longitude: l.lon }));

  const center = routeCoords.length > 0
    ? routeCoords[routeCoords.length - 1]
    : { latitude: 16.46, longitude: 107.59 };

  const totalPts = routeCoords.length;
  const totalSegs = segmentResults.length;
  const avg = totalSegs > 0
    ? (segmentResults.reduce((s, r) => s + r.wrms, 0) / totalSegs)
    : 0;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          ...center,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}

        {segmentResults.map((seg, i) => {
          if (!seg.lat || !seg.lon) return null;
          const color = seg.color || comfortSoloColor(seg.wrms);
          return (
            <Marker
              key={i}
              coordinate={{ latitude: seg.lat, longitude: seg.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[styles.segDot, { backgroundColor: color }]} />
            </Marker>
          );
        })}
      </MapView>

      {/* Top floating status */}
      <View style={styles.topBar} pointerEvents="none">
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>ROUTE MAP</Text>
          <Text style={styles.title}>
            {isRecording ? 'Đang ghi tuyến' : 'Tuyến đường đã đo'}
          </Text>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalPts}</Text>
            <Text style={styles.kpiLabel}>POINTS</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalSegs}</Text>
            <Text style={styles.kpiLabel}>SEGMENTS</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{avg.toFixed(2)}</Text>
            <Text style={styles.kpiLabel}>AVG WRMS</Text>
          </View>
        </View>
      </View>

      {/* Bottom floating legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>COMFORT SCALE</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Tốt</Text>
            <Text style={styles.legendHint}>{'<'} 0.63</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>TB</Text>
            <Text style={styles.legendHint}>0.63 – 1.6</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Xấu</Text>
            <Text style={styles.legendHint}>{'>'} 1.6</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    gap: 10,
  },
  headerBlock: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOW.md,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOW.sm,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },

  legend: {
    position: 'absolute',
    bottom: 108,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOW.md,
  },
  legendTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  segDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  legendText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
  },
  legendHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '600',
  },
});
