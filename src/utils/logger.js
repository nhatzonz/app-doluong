// Tagged logger for FE diagnostics.
// Toggle DIAG_LOG = false to silence all logs.
export const DIAG_LOG = true;

const ICON = {
  REC:    '🎬',
  ACCEL:  '🟢',
  GPS:    '🔵',
  SEG:    '🟣',
  WRMS:   '🟠',
  API:    '🟡',
  DIAG:   '🔴',
  CHART:  '⚪',
};

export function log(tag, ...args) {
  if (!DIAG_LOG) return;
  const icon = ICON[tag] || '◽';
  console.log(`${icon} [${tag}]`, ...args);
}

export function warn(tag, ...args) {
  if (!DIAG_LOG) return;
  const icon = ICON[tag] || '◽';
  console.warn(`${icon} [${tag}]`, ...args);
}

// ------- high-frequency stats aggregator (accelerometer) -------
export function createRollingStats() {
  let s = null;
  const reset = (t = Date.now()) => {
    s = {
      count: 0,
      startAt: t,
      sumX: 0, sumY: 0, sumZ: 0, sumR: 0,
      sumSqR: 0,
      minX: Infinity, minY: Infinity, minZ: Infinity, minR: Infinity,
      maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity, maxR: -Infinity,
    };
  };
  reset();
  return {
    push(x, y, z, r) {
      s.count++;
      s.sumX += x; s.sumY += y; s.sumZ += z; s.sumR += r;
      s.sumSqR += r * r;
      if (x < s.minX) s.minX = x; if (x > s.maxX) s.maxX = x;
      if (y < s.minY) s.minY = y; if (y > s.maxY) s.maxY = y;
      if (z < s.minZ) s.minZ = z; if (z > s.maxZ) s.maxZ = z;
      if (r < s.minR) s.minR = r; if (r > s.maxR) s.maxR = r;
    },
    flush() {
      if (s.count === 0) return null;
      const dur = (Date.now() - s.startAt) / 1000;
      const n = s.count;
      const out = {
        n,
        durSec: dur.toFixed(2),
        hz: (n / dur).toFixed(1),
        meanX: (s.sumX / n).toFixed(3),
        meanY: (s.sumY / n).toFixed(3),
        meanZ: (s.sumZ / n).toFixed(3),
        meanR: (s.sumR / n).toFixed(3),
        rmsR: Math.sqrt(s.sumSqR / n).toFixed(3),
        minR: s.minR.toFixed(3),
        maxR: s.maxR.toFixed(3),
      };
      reset();
      return out;
    },
  };
}

// Diagnose gravity magnitude from 1s of raw samples.
// Expected: ‖mean‖ ≈ 1.0 (g) hoac ≈ 9.81 (m/s²). Cong thuc hien dung
// magnitude-based nen khong phu thuoc truc trong luc.
export function diagnoseGravity(meanX, meanY, meanZ) {
  const ax = Math.abs(meanX), ay = Math.abs(meanY), az = Math.abs(meanZ);
  const max = Math.max(ax, ay, az);
  const magnitude = Math.sqrt(meanX * meanX + meanY * meanY + meanZ * meanZ);
  let axis = 'Z';
  if (ax === max) axis = 'X';
  else if (ay === max) axis = 'Y';

  let unit, verdict;
  if (magnitude > 7 && magnitude < 12) {
    unit = 'm/s²';
    verdict = `OK (‖mean‖=${magnitude.toFixed(2)} ≈ 9.81)`;
  } else if (magnitude > 0.7 && magnitude < 1.3) {
    unit = 'g';
    verdict = `OK (‖mean‖=${magnitude.toFixed(3)}g) — code xu ly don vi g dung`;
  } else if (magnitude < 0.3) {
    unit = '?';
    verdict = '⚠ Khong phat hien trong luc — phone roi tu do / chuyen dong manh / sensor loi?';
  } else {
    unit = '?';
    verdict = `⚠ Bien do bat thuong (‖mean‖=${magnitude.toFixed(3)}) — khong khop chuan g hay m/s²`;
  }

  const orient = `truc trong luc chu dao: ${axis} (${axis === 'Z' ? 'phone nam phang' : axis === 'Y' ? 'phone dung doc' : 'phone nam nghieng canh'})`;

  return { axis, magnitude, unit, verdict, orient };
}
