// White Premium palette — clean, depth-based, Apple-like soft shadows
export const COLORS = {
  // Back-compat keys
  primary: '#2E8BFF',
  primaryDark: '#0B4AA8',
  accent: '#00C9FF',
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#0B1220',
  textSecondary: '#6B7280',
  border: '#EEF0F4',
  good: '#10B981',
  moderate: '#F59E0B',
  bad: '#EF4444',
  recording: '#EF4444',
  stopped: '#10B981',

  // Premium tokens
  bg: '#F6F7FB',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F8',
  textMuted: '#9AA1AD',
  divider: '#EEF0F4',
  shadow: '#0B1220',

  // Accent gradients
  accentFrom: '#2E8BFF',
  accentTo: '#00C9FF',
  dangerFrom: '#FF5B67',
  dangerTo: '#EF4444',
};

// Gradient comfort mapping — soft yet scientific
// Returns [from, to] gradient colors based on WRMS value
export function comfortGradient(wrms) {
  if (wrms < 0.315) return ['#34D399', '#10B981'];      // Comfortable (green)
  if (wrms < 0.63)  return ['#A3E635', '#65A30D'];      // Slight (green-lime)
  if (wrms < 1.0)   return ['#FBBF24', '#F59E0B'];      // Medium (amber)
  if (wrms < 1.6)   return ['#FB923C', '#F97316'];      // High (orange)
  if (wrms < 2.5)   return ['#F87171', '#EF4444'];      // Very high (red)
  return ['#DC2626', '#991B1B'];                        // Extreme (deep red)
}

export function comfortSoloColor(wrms) {
  return comfortGradient(wrms)[1];
}

export function comfortTint(wrms) {
  // very soft tint for subtle backgrounds
  if (wrms < 0.315) return '#ECFDF5';
  if (wrms < 0.63)  return '#F7FEE7';
  if (wrms < 1.0)   return '#FFFBEB';
  if (wrms < 1.6)   return '#FFF7ED';
  if (wrms < 2.5)   return '#FEF2F2';
  return '#FEE2E2';
}

// Soft shadow preset (Apple-like)
export const SHADOW = {
  sm: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
};
