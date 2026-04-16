import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, G } from 'react-native-svg';
import { COLORS, comfortGradient, SHADOW } from '../utils/colors';

// Draw an arc centered at (cx, cy) with radius r between startAngle and endAngle (deg).
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

const SIZE = 240;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const START = -135; // degrees
const END = 135;
const SWEEP = END - START; // 270

const MAX_WRMS = 3.0;

export function WRMSGauge({ wrms = 0, comfort, isRecording }) {
  const value = Math.max(0, Math.min(wrms, MAX_WRMS));
  const ratio = value / MAX_WRMS;
  const targetDeg = START + ratio * SWEEP;

  const [from, to] = comfortGradient(wrms);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (wrms >= 2.5) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.setValue(0);
    }
  }, [wrms, pulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.18] });

  // Animated arc path via listener → state-less by re-building path from animDeg would need listener.
  // Simpler: overlay current arc statically (re-renders on value change already animated enough).
  const arc = arcPath(CX, CY, R, START, targetDeg);
  const trackArc = arcPath(CX, CY, R, START, END);

  // Tick marks
  const ticks = [];
  const tickCount = 9;
  for (let i = 0; i <= tickCount; i++) {
    const deg = START + (i / tickCount) * SWEEP;
    const outer = polar(CX, CY, R + STROKE / 2 + 6, deg);
    const inner = polar(CX, CY, R + STROKE / 2 + 2, deg);
    ticks.push(
      <Path
        key={i}
        d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
        stroke={COLORS.divider}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: to,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <LinearGradient id="gradArc" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>

          <G>{ticks}</G>

          <Path
            d={trackArc}
            stroke={COLORS.divider}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={arc}
            stroke="url(#gradArc)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={CX} cy={CY} r={R - STROKE / 2 - 4} fill="#FFFFFF" />
        </Svg>

        <View style={styles.center} pointerEvents="none">
          <Text style={styles.unit}>WRMS</Text>
          <Text style={[styles.value, { color: to }]}>
            {value.toFixed(3)}
          </Text>
          <Text style={styles.sub}>m/s²</Text>
          {comfort ? (
            <View style={[styles.pill, { backgroundColor: to + '1A', borderColor: to + '33' }]}>
              <View style={[styles.pillDot, { backgroundColor: to }]} />
              <Text style={[styles.pillText, { color: to }]}>{comfort}</Text>
            </View>
          ) : (
            <Text style={styles.idle}>{isRecording ? 'Đang đo...' : 'Sẵn sàng'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  glow: {
    position: 'absolute',
    width: SIZE + 40,
    height: SIZE + 40,
    borderRadius: (SIZE + 40) / 2,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...SHADOW.md,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unit: {
    fontSize: 11,
    letterSpacing: 2,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  value: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: -2,
    letterSpacing: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
    borderWidth: 1,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  idle: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
