// Tinh WRMS phia client (offline fallback, khong co Butterworth filter)

export function calculateResultantAccel(ax, ay, az) {
  return Math.sqrt(ax * ax + ay * ay + az * az);
}

export function calculateDynamicAccel(resultant) {
  return resultant - 9.81;
}

export function calculateWRMS(samples) {
  if (samples.length === 0) return 0;
  const sumSquares = samples.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumSquares / samples.length);
}

// Tinh WRMS tu mang accelerometer samples [{x, y, z}, ...]
export function calculateSegmentWRMS(accelSamples) {
  const dynamicAccels = accelSamples.map(s => {
    const resultant = calculateResultantAccel(s.x, s.y, s.z);
    return calculateDynamicAccel(resultant);
  });
  return calculateWRMS(dynamicAccels);
}
