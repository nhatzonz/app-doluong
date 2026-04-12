// Phan loai ISO-2631 theo bang trong readme.md
export function classifyComfort(wrms) {
  if (wrms < 0.315) return 'Comfortable';
  if (wrms < 0.63) return 'Some discomfort';
  if (wrms < 1.0) return 'Quite uncomfortable';
  if (wrms < 1.6) return 'Uncomfortable';
  if (wrms < 2.5) return 'Very uncomfortable';
  return 'Extremely uncomfortable';
}

export function getComfortColor(wrms) {
  if (wrms < 0.63) return '#4CAF50';   // Xanh
  if (wrms < 1.6) return '#FF9800';    // Cam
  return '#F44336';                     // Do
}
