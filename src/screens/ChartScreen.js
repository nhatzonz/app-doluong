import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useMeasurementContext } from '../context/MeasurementContext';
import { COLORS } from '../utils/colors';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const MAX_POINTS = 60;

function ChartCard({ title, data, unit, color, referenceLine }) {
  const displayData = data.slice(-MAX_POINTS).map(d => ({
    value: d.value || 0,
  }));

  if (displayData.length === 0) {
    displayData.push({ value: 0 });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.chartTitle}>{title} ({unit})</Text>
      <LineChart
        data={displayData}
        width={CHART_WIDTH}
        height={120}
        color={color}
        thickness={2}
        hideDataPoints
        hideRules={false}
        yAxisTextStyle={{ fontSize: 10, color: COLORS.textSecondary }}
        xAxisLabelTextStyle={{ fontSize: 0 }}
        noOfSections={4}
        spacing={Math.max(4, CHART_WIDTH / Math.max(displayData.length, 1))}
        showReferenceLine1={!!referenceLine}
        referenceLine1Position={referenceLine}
        referenceLine1Config={{
          color: COLORS.bad,
          dashWidth: 4,
          dashGap: 3,
        }}
      />
    </View>
  );
}

export default function ChartScreen() {
  const { state } = useMeasurementContext();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Bieu Do Realtime</Text>

      <ChartCard
        title="Toc do"
        data={state.speedHistory}
        unit="km/h"
        color={COLORS.primary}
      />

      <ChartCard
        title="Do cao"
        data={state.altitudeHistory}
        unit="m"
        color="#795548"
      />

      <ChartCard
        title="Gia toc tong hop"
        data={state.accelHistory}
        unit="m/s²"
        color="#E91E63"
      />

      <ChartCard
        title="WRMS"
        data={state.wrmsHistory}
        unit="m/s²"
        color={COLORS.accent}
        referenceLine={0.315}
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
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.primaryDark,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
});
