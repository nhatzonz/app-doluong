import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export function Sparkline({
  data = [],
  width = 110,
  height = 28,
  color = '#2E8BFF',
  fillFrom,
}) {
  if (!data || data.length < 2) {
    return <Svg width={width} height={height} />;
  }
  const values = data.slice(-30).map(n => (Number.isFinite(n) ? n : 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  });

  const d = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const area = `${d} L ${width} ${height} L 0 ${height} Z`;

  const id = `sp-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fillFrom || color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={fillFrom || color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path
        d={d}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
