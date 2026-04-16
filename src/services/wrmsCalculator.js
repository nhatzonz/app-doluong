// Tinh WRMS phia client (offline fallback, khong co Butterworth filter)
// expo-sensors Accelerometer tra ve don vi g (phone dung yen: |a| ≈ 1.0g).
// Don vi output: m/s².
//
// Orientation-independent: magnitude - G thay cho (az - G),
// de phone co the nam bat ky huong nao (up/nghieng/dung). Khi yen:
// sqrt(ax²+ay²+az²) ≈ 1g → |mag - G| ≈ 0. Khi rung:
// |mag - G| xap xi phan dong cua gia toc (bo qua thanh phan vuong goc
// rat nho do quay).

export const G = 9.80665;

export function calculateDynamicResultant(ax, ay, az) {
  const mag = Math.sqrt(ax * ax + ay * ay + az * az) * G;
  return Math.abs(mag - G);
}

export function calculateWRMS(samples) {
  if (samples.length === 0) return 0;
  const sumSquares = samples.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumSquares / samples.length);
}

// Tinh WRMS tu mang accelerometer samples [{x, y, z}, ...] (input: g)
export function calculateSegmentWRMS(accelSamples) {
  const dynamicAccels = accelSamples.map(s =>
    calculateDynamicResultant(s.x, s.y, s.z)
  );
  return calculateWRMS(dynamicAccels);
}
