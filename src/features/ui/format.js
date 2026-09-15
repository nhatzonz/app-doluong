// Dinh dang hien thi. Nhom nghien cuu → giu do chinh xac, luon kem don vi.

export const fmtNum = (v, digits = 3) => (Number.isFinite(v) ? v.toFixed(digits) : '--');

export function fmtKm(meters, digits = 2) {
  return Number.isFinite(meters) ? (meters / 1000).toFixed(digits) : '--';
}

export function fmtDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function fmtDateTime(epochMs, lang) {
  if (!Number.isFinite(epochMs)) return '--';
  const d = new Date(epochMs);
  const pad = (n) => n.toString().padStart(2, '0');
  const date = lang === 'en'
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtTime(epochMs) {
  if (!Number.isFinite(epochMs)) return '--';
  const d = new Date(epochMs);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const fmtPct = (ratio, digits = 0) => (Number.isFinite(ratio) ? `${(ratio * 100).toFixed(digits)}%` : '--');

export function tripDisplayName(meta, t, lang) {
  return meta?.name || t('history.defaultName', { date: fmtDateTime(meta?.startedAt, lang) });
}

export const vehicleIcon = (vehicle) => (vehicle === 'motorbike' ? '🏍️' : vehicle === 'car' ? '🚗' : '•');
