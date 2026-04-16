import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useMeasurementContext } from '../context/MeasurementContext';
import { COLORS, SHADOW } from '../utils/colors';

const CARD_HORIZONTAL_MARGIN = 20;
const CARD_PADDING = 16;
const CHART_WIDTH = Dimensions.get('window').width - CARD_HORIZONTAL_MARGIN * 2 - CARD_PADDING * 2;
const MAX_POINTS = 60;

function lastValue(arr) {
  if (!arr || arr.length === 0) return null;
  const v = arr[arr.length - 1]?.value;
  return Number.isFinite(v) ? v : null;
}

function ChartCard({ title, subtitle, data, unit, color, referenceLine }) {
  const displayData = data.slice(-MAX_POINTS).map(d => ({
    value: Number.isFinite(d.value) ? d.value : 0,
  }));

  if (displayData.length === 0) {
    displayData.push({ value: 0 });
  }

  const latest = lastValue(data);
  const latestText = latest != null ? latest.toFixed(latest >= 100 ? 0 : 2) : '--';

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <Text style={styles.chartTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.chartSub} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={styles.valuePill}>
          <Text style={[styles.valueBig, { color }]} numberOfLines={1}>
            {latestText}
          </Text>
          <Text style={styles.valueUnit} numberOfLines={1}>{unit}</Text>
        </View>
      </View>

      <View style={styles.chartBody}>
        <LineChart
          data={displayData}
          width={CHART_WIDTH}
          height={130}
          color={color}
          thickness={2.5}
          hideDataPoints
          hideRules={false}
          rulesColor={COLORS.divider}
          rulesThickness={1}
          yAxisTextStyle={{ fontSize: 10, color: COLORS.textMuted }}
          yAxisColor={'transparent'}
          xAxisColor={COLORS.divider}
          xAxisLabelTextStyle={{ fontSize: 0 }}
          noOfSections={4}
          spacing={Math.max(4, CHART_WIDTH / Math.max(displayData.length, 1))}
          startFillColor={color}
          endFillColor={color}
          startOpacity={0.22}
          endOpacity={0.02}
          areaChart
          curved
          showReferenceLine1={!!referenceLine}
          referenceLine1Position={referenceLine}
          referenceLine1Config={{
            color: COLORS.bad,
            dashWidth: 4,
            dashGap: 3,
            labelText: referenceLine ? 'ISO 2631' : undefined,
            labelTextStyle: { color: COLORS.bad, fontSize: 9, fontWeight: '700' },
          }}
        />
      </View>
    </View>
  );
}

export default function ChartScreen() {
  const { state } = useMeasurementContext();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ANALYTICS</Text>
        <Text style={styles.title}>Biểu đồ Realtime</Text>
        <Text style={styles.subtitle}>Dữ liệu cảm biến & chỉ số độ gồ ghề</Text>
      </View>

      <ChartCard
        title="Tốc độ"
        subtitle="Ghi nhận từ GPS"
        data={state.speedHistory}
        unit="km/h"
        color="#10B981"
      />

      <ChartCard
        title="Độ cao"
        subtitle="Cao độ tuyến đường"
        data={state.altitudeHistory}
        unit="m"
        color="#8B5CF6"
      />

      <ChartCard
        title="Gia tốc tổng hợp"
        subtitle="Đã trừ trọng lực"
        data={state.accelHistory}
        unit="m/s²"
        color="#EC4899"
      />

      <ChartCard
        title="WRMS"
        subtitle="Weighted RMS — ISO 2631"
        data={state.wrmsHistory}
        unit="m/s²"
        color="#2E8BFF"
        referenceLine={0.315}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 14,
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
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: CARD_PADDING,
    marginVertical: 8,
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 40,
  },
  cardHeadLeft: {
    flex: 1,
    paddingRight: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  chartSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '55%',
  },
  valueBig: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  valueUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  chartBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
