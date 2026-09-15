// Tinh WRMS theo ISO 2631-1 phia client (offline fallback).
// Thuat toan GIONG HET backend/services/wrms_calculator.py + iso_weighting.py
// de ket qua 2 nguon so sanh duoc voi nhau.
//
// Input tu expo-sensors: don vi g. Output: m/s².

export const G = 9.80665;

// ---- ISO 2631-1 Annex A frequency weighting ----
const WEIGHTINGS = {
  Wk: { f1: 0.4, f2: 100, f3: 12.5, f4: 12.5, q4: 0.63, f5: 2.37, q5: 0.91, f6: 3.35, q6: 0.91 },
  Wd: { f1: 0.4, f2: 100, f3: 2.0, f4: 2.0, q4: 0.63 },
};

// Phep toan so phuc toi thieu: [re, im]
const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cDiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cAbs = (a) => Math.hypot(a[0], a[1]);

export function weightingMagnitude(f, kind = 'Wk') {
  if (f <= 0) return 0;
  const p = WEIGHTINGS[kind];
  const w = (hz) => 2 * Math.PI * hz;
  const s = [0, w(f)];
  const one = [1, 0];
  // 1 + s/(q*w0) + (s/w0)^2 voi s = jω  → [1 - (ω/w0)^2, ω/(q*w0)]
  const quad = (w0, q) => [1 - (s[1] / w0) ** 2, s[1] / (q * w0)];

  const w1 = w(p.f1);
  // Hh = 1 / (1 + √2·w1/s + (w1/s)^2), w1/s = -j·w1/ω
  const hHigh = cDiv(one, [1 - (w1 / s[1]) ** 2, -Math.SQRT2 * w1 / s[1]]);
  const hLow = cDiv(one, quad(w(p.f2), 1 / Math.SQRT2));
  const hT = cDiv([1, s[1] / w(p.f3)], quad(w(p.f4), p.q4));
  let h = cMul(cMul(hHigh, hLow), hT);
  if (p.f5) {
    const hS = cDiv(quad(w(p.f5), p.q5), quad(w(p.f6), p.q6));
    h = cMul(h, [hS[0] * (p.f5 / p.f6) ** 2, hS[1] * (p.f5 / p.f6) ** 2]);
  }
  return cAbs(h);
}

// RMS co trong so bang Parseval. N ~100 mau nen DFT O(N²) la du nhanh.
export function weightedRMS(signal, fs, kind = 'Wk') {
  const n = signal.length;
  if (n < 2 || fs <= 0) return 0;
  const mean = signal.reduce((a, b) => a + b, 0) / n;
  const x = signal.map(v => v - mean);

  let sum = 0;
  const half = Math.floor(n / 2);
  for (let k = 1; k <= half; k++) {
    let re = 0, im = 0;
    const omega = (2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      re += x[t] * Math.cos(omega * t);
      im -= x[t] * Math.sin(omega * t);
    }
    let power = re * re + im * im;
    if (!(n % 2 === 0 && k === half)) power *= 2;
    const wgt = weightingMagnitude((k * fs) / n, kind);
    sum += power * wgt * wgt;
  }
  return Math.sqrt(sum / (n * n));
}

export function estimateFs(timestamps) {
  if (!timestamps || timestamps.length < 2) return 50;
  const dur = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;
  if (dur <= 0) return 50;
  return (timestamps.length - 1) / dur;
}

function resampleUniform(timestamps, series, fs) {
  const t0 = timestamps[0];
  const ts = timestamps.map(t => (t - t0) / 1000);
  const n = Math.max(2, Math.round(ts[ts.length - 1] * fs) + 1);
  return series.map(values => {
    const out = new Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const tg = i / fs;
      while (j < ts.length - 2 && ts[j + 1] < tg) j++;
      const span = ts[j + 1] - ts[j];
      const r = span > 0 ? Math.min(1, Math.max(0, (tg - ts[j]) / span)) : 0;
      out[i] = values[j] + r * (values[j + 1] - values[j]);
    }
    return out;
  });
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => { const m = Math.hypot(...a); return a.map(v => v / m); };

// Tach truc dung (chieu len huong trong luc trung binh) va 2 truc ngang.
function decomposeAxes(ax, ay, az) {
  const n = ax.length;
  const g = [
    ax.reduce((a, b) => a + b, 0) / n,
    ay.reduce((a, b) => a + b, 0) / n,
    az.reduce((a, b) => a + b, 0) / n,
  ];
  const gHat = Math.hypot(...g) < 1e-6 ? [0, 0, 1] : normalize(g);
  const helper = Math.abs(gHat[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = normalize(cross(gHat, helper));
  const e2 = cross(gHat, e1);

  const hx = new Array(n), hy = new Array(n), vz = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = [ax[i], ay[i], az[i]];
    hx[i] = dot(a, e1);
    hy[i] = dot(a, e2);
    vz[i] = dot(a, gHat);
  }
  return { hx, hy, vz };
}

// samples: [{ x, y, z (g), timestamp (ms) }]
export function analyzeSegmentLocal(samples) {
  const timestamps = samples.map(s => s.timestamp);
  const fs = estimateFs(timestamps);
  const [ax, ay, az] = resampleUniform(
    timestamps,
    [samples.map(s => s.x * G), samples.map(s => s.y * G), samples.map(s => s.z * G)],
    fs
  );
  const { hx, hy, vz } = decomposeAxes(ax, ay, az);

  // k = 1 cho ca 3 truc (comfort, ngoi, mat ghe — ISO 2631-1 muc 8.2.2)
  const awX = weightedRMS(hx, fs, 'Wd');
  const awY = weightedRMS(hy, fs, 'Wd');
  const awZ = weightedRMS(vz, fs, 'Wk');

  return {
    wrms: Math.sqrt(awX * awX + awY * awY + awZ * awZ),
    aw_z: awZ,
    aw_xy: Math.hypot(awX, awY),
    fs,
    duration: vz.length / fs,
  };
}

// WRMS tong: RMS theo nang luong, trong so thoi luong (khong phai trung binh cong).
export function energyAverageWRMS(segments, defaultDuration = 2) {
  let num = 0, den = 0;
  for (const s of segments) {
    const d = s.duration || defaultDuration;
    num += s.wrms * s.wrms * d;
    den += d;
  }
  return den > 0 ? Math.sqrt(num / den) : 0;
}

// Gia toc dong tuc thoi |‖a‖ - G| (m/s²) — CHI de hien thi, khong dung tinh WRMS.
export function calculateDynamicResultant(ax, ay, az) {
  const mag = Math.sqrt(ax * ax + ay * ay + az * az) * G;
  return Math.abs(mag - G);
}
