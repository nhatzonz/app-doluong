// Phan loai ISO-2631 theo bang trong readme.md
export function classifyComfort(wrms) {
  if (wrms < 0.315) return 'Comfortable';
  if (wrms < 0.63) return 'Some discomfort';
  if (wrms < 1.0) return 'Quite uncomfortable';
  if (wrms < 1.6) return 'Uncomfortable';
  if (wrms < 2.5) return 'Very uncomfortable';
  return 'Extremely uncomfortable';
}

// Palette dong bo voi comfortGradient (colors.js) — 6 muc chuan ISO-2631.
export function getComfortColor(wrms) {
  if (wrms < 0.315) return '#10B981';   // Comfortable — green
  if (wrms < 0.63)  return '#65A30D';   // Some discomfort — lime
  if (wrms < 1.0)   return '#F59E0B';   // Quite uncomfortable — amber
  if (wrms < 1.6)   return '#F97316';   // Uncomfortable — orange
  if (wrms < 2.5)   return '#EF4444';   // Very uncomfortable — red
  return '#991B1B';                      // Extremely uncomfortable — deep red
}
