// Tinh WRMS phia client (offline fallback, khong co Butterworth filter)
// Expo Accelerometer tra ve m/s² (bao gom trong luc tren truc Z)

// Tinh gia toc dong: tru trong luc TRUOC khi tinh tong hop
// Dung: sqrt(ax² + ay² + (az - 9.81)²)
// Sai:  sqrt(ax² + ay² + az²) - 9.81
export function calculateDynamicResultant(ax, ay, az) {
  const dynZ = az - 9.81;
  return Math.sqrt(ax * ax + ay * ay + dynZ * dynZ);
}

export function calculateWRMS(samples) {
  if (samples.length === 0) return 0;
  const sumSquares = samples.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumSquares / samples.length);
}

// Tinh WRMS tu mang accelerometer samples [{x, y, z}, ...]
export function calculateSegmentWRMS(accelSamples) {
  const dynamicAccels = accelSamples.map(s =>
    calculateDynamicResultant(s.x, s.y, s.z)
  );
  return calculateWRMS(dynamicAccels);
}
