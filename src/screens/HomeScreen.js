import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeasurement } from '../hooks/useMeasurement';
import { useMeasurementContext } from '../context/MeasurementContext';
import { MetricCard } from '../components/SensorDataCard';
import { WRMSGauge } from '../components/WRMSGauge';
import { StatusChip } from '../components/StatusChip';
import { calculateDynamicResultant } from '../services/wrmsCalculator';
import { COLORS, SHADOW } from '../utils/colors';

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  const {
    isRecording,
    currentAccel,
    currentLocation,
    currentWRMS,
    currentComfort,
    sampleCount,
    startTime,
    segmentResults,
    isAvailable,
    locationError,
    startMeasurement,
    stopMeasurement,
  } = useMeasurement();

  // UI-only: access histories for sparklines
  const { state } = useMeasurementContext();

  // UI-only ring buffers for per-axis sparklines (not used by logic)
  const [axBuf, setAxBuf] = useState([]);
  const [ayBuf, setAyBuf] = useState([]);
  const [azBuf, setAzBuf] = useState([]);

  useEffect(() => {
    if (!isRecording) return;
    setAxBuf(prev => [...prev.slice(-29), currentAccel.x]);
    setAyBuf(prev => [...prev.slice(-29), currentAccel.y]);
    setAzBuf(prev => [...prev.slice(-29), currentAccel.z]);
  }, [currentAccel.x, currentAccel.y, currentAccel.z, isRecording]);

  // Elapsed timer (ticks each render via RAF-like interval)
  const [, tick] = useState(0);
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  const resultant = calculateDynamicResultant(
    currentAccel.x, currentAccel.y, currentAccel.z
  );

  const speedKmh = currentLocation?.speed != null
    ? (Math.max(0, currentLocation.speed) * 3.6)
    : 0;

  // FAB pulse when recording
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isRecording) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  // Connection/status chip
  const connStatus = locationError
    ? 'offline'
    : currentLocation
      ? 'connected'
      : 'reconnecting';

  const connLabel = locationError
    ? 'GPS offline'
    : currentLocation
      ? 'GPS connected'
      : 'GPS...';

  const speedTrend = state.speedHistory.slice(-30).map(p => p.value);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <View>
            <Text style={styles.eyebrow}>ROAD ROUGHNESS</Text>
            <Text style={styles.title}>Realtime</Text>
          </View>
          <View style={styles.headRightCol}>
            <StatusChip status={connStatus} label={connLabel} />
            <View style={styles.timerChip}>
              <View style={[styles.recDot, { backgroundColor: isRecording ? COLORS.bad : COLORS.textMuted }]} />
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
            </View>
          </View>
        </View>

        {/* Warnings */}
        {!isAvailable && (
          <View style={styles.warnCard}>
            <Text style={styles.warnText}>Accelerometer không khả dụng trên thiết bị này</Text>
          </View>
        )}
        {locationError && (
          <View style={styles.warnCard}>
            <Text style={styles.warnText}>{locationError}</Text>
          </View>
        )}

        {/* Hero Gauge */}
        <View style={styles.gaugeWrap}>
          <WRMSGauge
            wrms={currentWRMS}
            comfort={currentComfort}
            isRecording={isRecording}
          />
        </View>

        {/* FAB START/STOP */}
        <View style={styles.fabWrap}>
          {isRecording && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.fabPulse,
                { backgroundColor: COLORS.bad, opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
              ]}
            />
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isRecording ? stopMeasurement : startMeasurement}
            style={styles.fabTouch}
          >
            <LinearGradient
              colors={isRecording ? [COLORS.dangerFrom, COLORS.dangerTo] : [COLORS.accentFrom, COLORS.accentTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <Text style={styles.fabLabel}>
                {isRecording ? 'STOP' : 'START'}
              </Text>
              <Text style={styles.fabSub}>
                {isRecording ? 'Kết thúc đo' : 'Bắt đầu đo'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Mini stats under FAB */}
        <View style={styles.miniRow}>
          <View style={styles.miniItem}>
            <Text style={styles.miniValue}>{sampleCount}</Text>
            <Text style={styles.miniLabel}>SAMPLES</Text>
          </View>
          <View style={styles.miniDivider} />
          <View style={styles.miniItem}>
            <Text style={styles.miniValue}>{segmentResults.length}</Text>
            <Text style={styles.miniLabel}>SEGMENTS</Text>
          </View>
          <View style={styles.miniDivider} />
          <View style={styles.miniItem}>
            <Text style={styles.miniValue}>{resultant.toFixed(2)}</Text>
            <Text style={styles.miniLabel}>DYNAMIC</Text>
          </View>
        </View>

        {/* 2x2 metric grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <MetricCard
              label="aX"
              value={currentAccel.x.toFixed(3)}
              unit="m/s²"
              trend={axBuf}
              color="#2E8BFF"
            />
            <View style={{ width: 12 }} />
            <MetricCard
              label="aY"
              value={currentAccel.y.toFixed(3)}
              unit="m/s²"
              trend={ayBuf}
              color="#8B5CF6"
            />
          </View>
          <View style={{ height: 12 }} />
          <View style={styles.gridRow}>
            <MetricCard
              label="aZ"
              value={currentAccel.z.toFixed(3)}
              unit="m/s²"
              trend={azBuf}
              color="#EC4899"
            />
            <View style={{ width: 12 }} />
            <MetricCard
              label="SPEED"
              value={speedKmh.toFixed(1)}
              unit="km/h"
              trend={speedTrend}
              color="#10B981"
            />
          </View>
        </View>

        {/* GPS meta row */}
        <View style={styles.metaCard}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>LAT</Text>
            <Text style={styles.metaValue}>
              {currentLocation?.lat?.toFixed(5) || '--'}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>LON</Text>
            <Text style={styles.metaValue}>
              {currentLocation?.lon?.toFixed(5) || '--'}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ALT</Text>
            <Text style={styles.metaValue}>
              {currentLocation?.altitude?.toFixed(1) || '--'}
              <Text style={styles.metaUnit}> m</Text>
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingTop: 58,
    paddingBottom: 16,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  headRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  timerText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  warnCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  warnText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  gaugeWrap: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  fabWrap: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  fabPulse: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  fabTouch: {
    borderRadius: 54,
    ...SHADOW.lg,
  },
  fab: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  fabSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 12,
    ...SHADOW.sm,
  },
  miniItem: {
    flex: 1,
    alignItems: 'center',
  },
  miniValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  miniLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  miniDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.divider,
  },
  grid: {
    paddingHorizontal: 20,
    marginTop: 4,
  },
  gridRow: {
    flexDirection: 'row',
  },
  metaCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 14,
    ...SHADOW.sm,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  metaUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
});
