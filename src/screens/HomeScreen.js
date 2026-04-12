import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useMeasurement } from '../hooks/useMeasurement';
import { SensorDataCard } from '../components/SensorDataCard';
import { ComfortBadge } from '../components/ComfortBadge';
import { calculateDynamicResultant } from '../services/wrmsCalculator';
import { COLORS } from '../utils/colors';

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

  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const resultant = calculateDynamicResultant(
    currentAccel.x, currentAccel.y, currentAccel.z
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.header, {marginTop:46}]}>Do Luong Mat Duong</Text>

      {/* Nut START / STOP */}
      <TouchableOpacity
        style={[styles.button, isRecording ? styles.stopBtn : styles.startBtn]}
        onPress={isRecording ? stopMeasurement : startMeasurement}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>

      {/* Trang thai */}
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>
          {isRecording ? `Dang do... ${minutes}:${seconds.toString().padStart(2, '0')}` : 'San sang'}
        </Text>
        <Text style={styles.statusText}>Mau: {sampleCount}</Text>
        <Text style={styles.statusText}>Segment: {segmentResults.length}</Text>
      </View>

      {!isAvailable && (
        <Text style={styles.warning}>Accelerometer khong kha dung tren thiet bi nay</Text>
      )}
      {locationError && (
        <Text style={styles.warning}>{locationError}</Text>
      )}

      {/* WRMS hien tai */}
      {currentComfort ? (
        <ComfortBadge wrms={currentWRMS} comfort={currentComfort} />
      ) : null}

      {/* Accelerometer */}
      <SensorDataCard
        title="Gia toc (m/s²)"
        items={[
          { label: 'aX', value: currentAccel.x.toFixed(3) },
          { label: 'aY', value: currentAccel.y.toFixed(3) },
          { label: 'aZ', value: currentAccel.z.toFixed(3) },
          { label: 'Dong', value: resultant.toFixed(3) },
        ]}
      />

      {/* GPS */}
      <SensorDataCard
        title="Vi tri GPS"
        items={[
          { label: 'Lat', value: currentLocation?.lat?.toFixed(6) || '--' },
          { label: 'Lon', value: currentLocation?.lon?.toFixed(6) || '--' },
          { label: 'km/h', value: currentLocation?.speed != null ? (Math.max(0, currentLocation.speed) * 3.6).toFixed(1) : '--' },
          { label: 'Alt(m)', value: currentLocation?.altitude?.toFixed(1) || '--' },
        ]}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    color: COLORS.primaryDark,
  },
  button: {
    marginHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startBtn: {
    backgroundColor: COLORS.good,
  },
  stopBtn: {
    backgroundColor: COLORS.recording,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  warning: {
    textAlign: 'center',
    color: COLORS.bad,
    marginHorizontal: 16,
    marginBottom: 8,
  },
});
