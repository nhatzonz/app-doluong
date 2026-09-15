import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from '../../utils/colors';
import { getComfortColor } from '../../utils/comfortClassifier';
import { COMFORT_THRESHOLDS } from '../analytics/tripMath';

const PAD = { left: 36, right: 36, top: 10, bottom: 24 };

// Bieu do dat trong Panel: le man hinh 20×2 + padding Panel 16×2
const HOST_INSET = 72;

// onLayout doi khi khong duoc goi khi man hinh mo trong luc chuyen canh
// (da gap khi mo Thong ke bang deep link) → bieu do trong. Ve ngay voi be rong
// uoc tinh tu man hinh, onLayout (neu co) se chinh lai cho chinh xac.
function useWidth() {
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const onLayout = (e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setMeasured(w);
  };
  return [measured || Math.max(0, Math.round(windowWidth - HOST_INSET)), onLayout];
}

// Buoc chia truc "dep": 1, 2, 5 × 10^n
function niceStep(range, targetTicks = 4) {
  if (!(range > 0)) return 1;
  const raw = range / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function ticks(max, target = 4) {
  const step = niceStep(max, target);
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

const tickLabel = (v) => (Math.abs(v) >= 10 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2));

// series: [{ points: [{x, y}], color, dashed }]
// secondary: { points, color, max } — ve tren truc phai (vd toc do)
export function LineChartXY({
  series = [], secondary, height = 180, xLabel, yMax, thresholds = true, markerX,
}) {
  const [width, onLayout] = useWidth();
  const all = series.flatMap(s => s.points);
  const xMax = Math.max(1e-6, ...all.map(p => p.x), ...(secondary?.points || []).map(p => p.x));
  const dataYMax = Math.max(0.1, ...all.map(p => p.y));
  const yTop = yMax ?? Math.max(0.63, dataYMax * 1.1);
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x) => PAD.left + (x / xMax) * innerW;
  const sy = (y, top = yTop) => PAD.top + innerH - (Math.min(y, top) / top) * innerH;

  const pathOf = (points, top) => points
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y, top).toFixed(1)}`)
    .join(' ');

  const yTicks = ticks(yTop);
  const xTicks = ticks(xMax, 4);
  const secTop = secondary ? Math.max(1, secondary.max ?? Math.max(...secondary.points.map(p => p.y)) * 1.1) : 1;
  const secTicks = secondary ? ticks(secTop, 4) : [];

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {yTicks.map(v => (
            <G key={`y${v}`}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={sy(v)} y2={sy(v)} stroke={COLORS.divider} strokeWidth={1} />
              <SvgText x={PAD.left - 4} y={sy(v) + 3} fontSize={9} fill={COLORS.textMuted} textAnchor="end">{tickLabel(v)}</SvgText>
            </G>
          ))}
          {thresholds && COMFORT_THRESHOLDS.slice(1).filter(v => v < yTop).map(v => (
            <Line
              key={`th${v}`}
              x1={PAD.left} x2={width - PAD.right} y1={sy(v)} y2={sy(v)}
              stroke={getComfortColor(v)} strokeWidth={1} strokeDasharray="4 3" opacity={0.8}
            />
          ))}
          {xTicks.map(v => (
            <SvgText key={`x${v}`} x={sx(v)} y={height - 8} fontSize={9} fill={COLORS.textMuted} textAnchor="middle">
              {tickLabel(v)}
            </SvgText>
          ))}
          {secondary && secTicks.map(v => (
            <SvgText key={`s${v}`} x={width - PAD.right + 4} y={sy(v, secTop) + 3} fontSize={9} fill={secondary.color} textAnchor="start">
              {tickLabel(v)}
            </SvgText>
          ))}
          {secondary && (
            <Path d={pathOf(secondary.points, secTop)} stroke={secondary.color} strokeWidth={1.5} fill="none" opacity={0.7} />
          )}
          {series.map((s, i) => (
            <Path
              key={`s${i}`}
              d={pathOf(s.points, yTop)}
              stroke={s.color}
              strokeWidth={2}
              fill="none"
              strokeDasharray={s.dashed ? '6 4' : undefined}
              strokeLinejoin="round"
            />
          ))}
          {Number.isFinite(markerX) && (
            <Line x1={sx(markerX)} x2={sx(markerX)} y1={PAD.top} y2={PAD.top + innerH} stroke={COLORS.text} strokeWidth={1} strokeDasharray="2 2" />
          )}
          {xLabel ? (
            <SvgText x={width - PAD.right} y={height - 8} fontSize={9} fill={COLORS.textMuted} textAnchor="start" dx={4}>
              {xLabel}
            </SvgText>
          ) : null}
        </Svg>
      )}
    </View>
  );
}

// points: [{ x, y, color }]; fits: [{ slope, intercept, color, xMin, xMax }]
// Duong xu huong chi ve trong khoang du lieu cua nhom do (khong ngoai suy).
export function ScatterPlot({ points = [], fits = [], height = 200, xLabel }) {
  const [width, onLayout] = useWidth();
  const xMax = Math.max(1, ...points.map(p => p.x)) * 1.05;
  const yTop = Math.max(0.63, ...points.map(p => p.y)) * 1.1;
  const innerW = Math.max(1, width - PAD.left - 12);
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x) => PAD.left + (x / xMax) * innerW;
  const sy = (y) => PAD.top + innerH - (Math.min(Math.max(y, 0), yTop) / yTop) * innerH;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks(yTop).map(v => (
            <G key={`y${v}`}>
              <Line x1={PAD.left} x2={width - 12} y1={sy(v)} y2={sy(v)} stroke={COLORS.divider} />
              <SvgText x={PAD.left - 4} y={sy(v) + 3} fontSize={9} fill={COLORS.textMuted} textAnchor="end">{tickLabel(v)}</SvgText>
            </G>
          ))}
          {ticks(xMax).map(v => (
            <SvgText key={`x${v}`} x={sx(v)} y={height - 8} fontSize={9} fill={COLORS.textMuted} textAnchor="middle">{tickLabel(v)}</SvgText>
          ))}
          {points.map((p, i) => (
            <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={p.color} opacity={0.65} />
          ))}
          {fits.map((f, i) => (
            <Line
              key={`fit${i}`}
              x1={sx(f.xMin)} y1={sy(f.intercept + f.slope * f.xMin)}
              x2={sx(f.xMax)} y2={sy(f.intercept + f.slope * f.xMax)}
              stroke={f.color || COLORS.text} strokeWidth={2} strokeDasharray="6 4"
            />
          ))}
          {xLabel ? (
            <SvgText x={width - 12} y={height - 8} fontSize={9} fill={COLORS.textMuted} textAnchor="end" dy={-12}>{xLabel}</SvgText>
          ) : null}
        </Svg>
      )}
    </View>
  );
}

// bins: [{ from, to, count }]
export function HistogramChart({ bins = [], height = 160 }) {
  const [width, onLayout] = useWidth();
  const maxCount = Math.max(1, ...bins.map(b => b.count));
  const xMax = bins.length ? bins[bins.length - 1].to : 1;
  const innerW = Math.max(1, width - PAD.left - 12);
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x) => PAD.left + (x / xMax) * innerW;
  const sy = (c) => PAD.top + innerH - (c / maxCount) * innerH;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks(maxCount, 3).map(v => (
            <G key={`y${v}`}>
              <Line x1={PAD.left} x2={width - 12} y1={sy(v)} y2={sy(v)} stroke={COLORS.divider} />
              <SvgText x={PAD.left - 4} y={sy(v) + 3} fontSize={9} fill={COLORS.textMuted} textAnchor="end">{v.toFixed(0)}</SvgText>
            </G>
          ))}
          {bins.map((b, i) => (
            <Rect
              key={i}
              x={sx(b.from) + 0.5}
              y={sy(b.count)}
              width={Math.max(1, sx(b.to) - sx(b.from) - 1)}
              height={PAD.top + innerH - sy(b.count)}
              fill={getComfortColor((b.from + b.to) / 2)}
              rx={1.5}
            />
          ))}
          {COMFORT_THRESHOLDS.slice(1).filter(v => v < xMax).map(v => (
            <Line key={`t${v}`} x1={sx(v)} x2={sx(v)} y1={PAD.top} y2={PAD.top + innerH} stroke={COLORS.text} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          ))}
          {ticks(xMax).map(v => (
            <SvgText key={`x${v}`} x={sx(v)} y={height - 8} fontSize={9} fill={COLORS.textMuted} textAnchor="middle">{tickLabel(v)}</SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

export function ChartLegend({ items }) {
  return (
    <View style={styles.legend}>
      {items.map(it => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: it.color }, it.dashed && styles.swatchDashed]} />
          <Text style={styles.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  swatchDashed: { opacity: 0.6 },
  legendText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
