import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Circle } from 'react-native-maps';
import { useMeasurementContext } from '../context/MeasurementContext';
import { COLORS } from '../utils/colors';

export default function MapScreen() {
  const { state } = useMeasurementContext();
  const { locationHistory, segmentResults } = state;

  const routeCoords = locationHistory
    .filter(l => l.lat && l.lon)
    .map(l => ({ latitude: l.lat, longitude: l.lon }));

  const center = routeCoords.length > 0
    ? routeCoords[routeCoords.length - 1]
    : { latitude: 16.46, longitude: 107.59 };

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
        {/* Tuyen duong */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary}
            strokeWidth={3}
          />
        )}

        {/* Marker mau theo WRMS */}
        {segmentResults.map((seg, i) => {
          if (!seg.lat || !seg.lon) return null;
          return (
            <Circle
              key={i}
              center={{ latitude: seg.lat, longitude: seg.lon }}
              radius={8}
              fillColor={seg.color}
              strokeColor={seg.color}
              strokeWidth={1}
            />
          );
        })}
      </MapView>

      {/* Chu thich */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.good }]} />
          <Text style={styles.legendText}>Tot ({'<'}0.63)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.moderate }]} />
          <Text style={styles.legendText}>TB (0.63-1.6)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.bad }]} />
          <Text style={styles.legendText}>Xau ({'>'}1.6)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.text,
  },
});
