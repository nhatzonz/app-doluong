// Tinh toan phuc vu HIEN THI (quang duong, phan bo muc, polyline mau...).
// Ham thuan, khong phu thuoc React/native → test duoc bang Node.
// Khong thay doi bat ky ket qua WRMS nao — chi doc segmentResults/locationHistory.

import { classifyComfort, getComfortColor } from '../../utils/comfortClassifier';
import { energyAverageWRMS } from '../../services/wrmsCalculator';

export const COMFORT_CODES = [
  'Comfortable',
  'Some discomfort',
  'Quite uncomfortable',
  'Uncomfortable',
  'Very uncomfortable',
  'Extremely uncomfortable',
];

// Nguong duoi cua tung muc (dong bo voi comfortClassifier)
export const COMFORT_THRESHOLDS = [0, 0.315, 0.63, 1.0, 1.6, 2.5];

// Tu "Quite uncomfortable" tro len duoc xem la duong xau
export const ROUGH_FROM_INDEX = 2;

const DEFAULT_SEGMENT_DURATION = 2;
const EARTH_RADIUS_M = 6371008.8;

export function haversineM(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

const hasCoord = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon);

export function trackDistanceM(track = []) {
  let total = 0;
  let prev = null;
  for (const p of track) {
    if (!hasCoord(p)) continue;
    if (prev) total += haversineM(prev.lat, prev.lon, p.lat, p.lon);
    prev = p;
  }
  return total;
}

export const segDuration = (s) => (Number.isFinite(s.duration) && s.duration > 0 ? s.duration : DEFAULT_SEGMENT_DURATION);

// Vi tri tren tuyen (km) cho tung segment. Uu tien toc do GPS × thoi luong
// (on dinh hon nhay toa do); thieu toc do thi dung khoang cach giua 2 vi tri segment.
export function segmentAxis(segments = []) {
  let cursor = 0;
  let prevWithCoord = null;
  return segments.map((s) => {
    let d = 0;
    if (Number.isFinite(s.speed)) {
      d = s.speed * segDuration(s);
    } else if (hasCoord(s) && prevWithCoord) {
      d = haversineM(prevWithCoord.lat, prevWithCoord.lon, s.lat, s.lon);
    }
    if (hasCoord(s)) prevWithCoord = s;
    const startM = cursor;
    cursor += d;
    return { startM, endM: cursor, midKm: (startM + cursor) / 2000, distanceM: d };
  });
}

function emptyShare() {
  return Object.fromEntries(COMFORT_CODES.map(c => [c, 0]));
}

// Ty le theo quang duong neu co toc do, nguoc lai theo thoi gian.
export function comfortShare(segments = []) {
  const axis = segmentAxis(segments);
  const totalDist = axis.reduce((a, x) => a + x.distanceM, 0);
  const byDistance = totalDist > 0 && segments.some(s => Number.isFinite(s.speed));
  const share = emptyShare();
  let total = 0;
  segments.forEach((s, i) => {
    const w = byDistance ? axis[i].distanceM : segDuration(s);
    share[classifyComfort(s.wrms)] += w;
    total += w;
  });
  if (total > 0) COMFORT_CODES.forEach(c => { share[c] /= total; });
  return { share, byDistance };
}

export function roughShare(share) {
  return COMFORT_CODES.slice(ROUGH_FROM_INDEX).reduce((a, c) => a + (share[c] || 0), 0);
}

export function worstSegments(segments = [], n = 5) {
  return segments
    .map((s, index) => ({ index, wrms: s.wrms }))
    .sort((a, b) => b.wrms - a.wrms)
    .slice(0, n)
    .map(x => x.index);
}

export function summarizeTrip(segments = [], track = []) {
  const durationS = segments.reduce((a, s) => a + segDuration(s), 0);
  const axis = segmentAxis(segments);
  const segDist = axis.length ? axis[axis.length - 1].endM : 0;
  const gpsDist = trackDistanceM(track);

  const withSpeed = segments.filter(s => Number.isFinite(s.speed));
  const speedDur = withSpeed.reduce((a, s) => a + segDuration(s), 0);
  const avgSpeedKmh = speedDur > 0
    ? (withSpeed.reduce((a, s) => a + s.speed * segDuration(s), 0) / speedDur) * 3.6
    : null;

  const withFs = segments.filter(s => Number.isFinite(s.fs));
  const { share, byDistance } = comfortShare(segments);

  return {
    wrmsTotal: energyAverageWRMS(segments),
    distanceM: gpsDist > 0 ? gpsDist : segDist,
    durationS,
    avgSpeedKmh,
    avgFs: withFs.length ? withFs.reduce((a, s) => a + s.fs, 0) / withFs.length : null,
    offlineCount: segments.filter(s => s.source === 'client').length,
    comfortShare: share,
    shareByDistance: byDistance,
    segmentCount: segments.length,
  };
}

// Polyline to mau theo segment: lay cac diem GPS trong [wallTime, wallTimeEnd],
// noi them diem ngay truoc/sau de cac doan lien mach. Gop segment lien ke cung mau.
// Segment khong co wallTime (ghi truoc ban cap nhat) → bo qua (UI ve cham thay the).
export function coloredPolylines(segments = [], track = []) {
  const pts = track.filter(p => hasCoord(p) && Number.isFinite(p.timestamp));
  if (pts.length < 2) return [];

  const lines = [];
  segments.forEach((s, index) => {
    if (!Number.isFinite(s.wallTime) || !Number.isFinite(s.wallTimeEnd)) return;
    let first = -1;
    let last = -1;
    for (let i = 0; i < pts.length; i++) {
      const t = pts[i].timestamp;
      if (t >= s.wallTime && t <= s.wallTimeEnd) {
        if (first < 0) first = i;
        last = i;
      }
    }
    let from;
    let to;
    if (first < 0) {
      // Segment ngan hon chu ky GPS: noi diem truoc va sau no
      to = pts.findIndex(p => p.timestamp > s.wallTimeEnd);
      if (to <= 0) return;
      from = to - 1;
    } else {
      from = Math.max(0, first - 1);
      to = Math.min(pts.length - 1, last + 1);
    }
    const coords = pts.slice(from, to + 1).map(p => ({ latitude: p.lat, longitude: p.lon }));
    if (coords.length < 2) return;

    const color = s.color || getComfortColor(s.wrms);
    const prev = lines[lines.length - 1];
    if (prev && prev.color === color && prev.lastIndex === index - 1) {
      prev.coords.push(...coords.slice(1));
      prev.lastIndex = index;
    } else {
      lines.push({ color, coords, firstIndex: index, lastIndex: index });
    }
  });
  return lines;
}

export function regionFor(coords, padding = 1.3) {
  const valid = coords.filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
  if (valid.length === 0) return null;
  const lats = valid.map(c => c.latitude);
  const lons = valid.map(c => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.005, (maxLat - minLat) * padding),
    longitudeDelta: Math.max(0.005, (maxLon - minLon) * padding),
  };
}

export function linearFit(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return {
    slope,
    intercept: my - slope * mx,
    r: syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0,
  };
}

export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

// Doan "soc": WRMS tu muc "Cuc ky kho chiu" tro len — khi do bang dien thoai
// thuong la do cam/cham may hoac va cham, khong phai mat duong.
export const SHOCK_WRMS = 2.5;

function percentile(values, p) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const idx = (v.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

// Chi so bo tro cho WRMS tong (khong thay the no). RMS nang luong rat nhay voi
// vai doan soc → hien them trung vi/P95 va muc do chi phoi cua cac doan soc.
export function wrmsBreakdown(segments = []) {
  const wrms = segments.map(s => s.wrms);
  let energy = 0;
  let shockEnergy = 0;
  let calmEnergy = 0;
  let calmDuration = 0;
  let shockCount = 0;
  segments.forEach(s => {
    const e = s.wrms * s.wrms * segDuration(s);
    energy += e;
    if (s.wrms >= SHOCK_WRMS) {
      shockEnergy += e;
      shockCount++;
    } else {
      calmEnergy += e;
      calmDuration += segDuration(s);
    }
  });
  return {
    median: median(wrms),
    p95: percentile(wrms, 0.95),
    max: wrms.length ? Math.max(...wrms) : null,
    shockCount,
    shockEnergyShare: energy > 0 ? shockEnergy / energy : 0,
    wrmsWithoutShocks: calmDuration > 0 ? Math.sqrt(calmEnergy / calmDuration) : null,
  };
}

export function histogram(values, binWidth = 0.1, maxValue = null) {
  const v = values.filter(Number.isFinite);
  if (v.length === 0) return [];
  const top = maxValue ?? Math.max(...v);
  const bins = Math.max(1, Math.ceil((top + 1e-9) / binWidth));
  const counts = new Array(bins).fill(0);
  v.forEach(x => {
    counts[Math.min(bins - 1, Math.floor(x / binWidth))]++;
  });
  return counts.map((count, i) => ({ from: i * binWidth, to: (i + 1) * binWidth, count }));
}
