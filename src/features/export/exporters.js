import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { translate } from '../../i18n/translate';
import { LOGO_BASE64 } from './logoBase64';
import { classifyComfort, getComfortColor } from '../../utils/comfortClassifier';
import {
  COMFORT_CODES, COMFORT_THRESHOLDS, segmentAxis, worstSegments,
} from '../analytics/tripMath';
import { fmtDateTime, fmtDuration, fmtKm, fmtNum, fmtPct } from '../ui/format';

async function shareText(fileName, content, mimeType, UTI) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, UTI });
  }
  return file.uri;
}

const finite = (v) => (Number.isFinite(v) ? v : null);

// GeoJSON (RFC 7946: toa do [lon, lat]) — mo duoc bang QGIS / geojson.io
export function buildGeoJSON(trip) {
  const features = [];
  const track = (trip.track || []).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (track.length >= 2) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: track.map(p => [p.lon, p.lat]) },
      properties: { kind: 'track', trip_id: trip.id },
    });
  }
  trip.segments.forEach((s, i) => {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) return;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        kind: 'segment',
        index: i + 1,
        time: s.wallTime ? new Date(s.wallTime).toISOString() : null,
        wrms: finite(s.wrms),
        aw_z: finite(s.aw_z),
        aw_xy: finite(s.aw_xy),
        comfort: s.comfort ?? classifyComfort(s.wrms),
        color: s.color ?? getComfortColor(s.wrms),
        speed_kmh: Number.isFinite(s.speed) ? +(s.speed * 3.6).toFixed(2) : null,
        duration_s: finite(s.duration),
        fs_hz: finite(s.fs),
        source: s.source ?? null,
      },
    });
  });
  (trip.marks || []).forEach((m, i) => {
    if (!Number.isFinite(m.lat) || !Number.isFinite(m.lon)) return;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lon, m.lat] },
      properties: {
        kind: 'mark',
        index: i + 1,
        label: m.label,
        time: new Date(m.wallTime).toISOString(),
      },
    });
  });
  return {
    type: 'FeatureCollection',
    properties: {
      trip_id: trip.id,
      name: trip.name,
      started_at: new Date(trip.startedAt).toISOString(),
      setup: trip.setup,
      method: 'ISO 2631-1 Wk/Wd, av = sqrt(awx²+awy²+awz²), k=1',
    },
    features,
  };
}

export function exportGeoJSON(trip) {
  return shareText(`${trip.id}.geojson`, JSON.stringify(buildGeoJSON(trip)), 'application/geo+json', 'public.json');
}

export function exportRawJSON(trip) {
  return shareText(`${trip.id}.json`, JSON.stringify(trip, null, 2), 'application/json', 'public.json');
}

// ---------------- Bao cao PDF (tieng Viet, ngan gon) ----------------

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vi = (key, params) => translate('vi', key, params);

function chartSvg(trip, width = 700, height = 190) {
  const segs = trip.segments;
  const axis = segmentAxis(segs);
  const pad = { l: 40, r: 12, t: 10, b: 26 };
  const xMax = Math.max(1e-6, axis.length ? axis[axis.length - 1].endM / 1000 : 1);
  const yTop = Math.max(0.63, ...segs.map(s => s.wrms)) * 1.1;
  const sx = (x) => pad.l + (x / xMax) * (width - pad.l - pad.r);
  const sy = (y) => pad.t + (height - pad.t - pad.b) * (1 - Math.min(y, yTop) / yTop);

  const path = segs.map((s, i) => `${i ? 'L' : 'M'}${sx(axis[i].midKm).toFixed(1)},${sy(s.wrms).toFixed(1)}`).join(' ');
  const th = COMFORT_THRESHOLDS.slice(1).filter(v => v < yTop).map(v =>
    `<line x1="${pad.l}" x2="${width - pad.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="${getComfortColor(v)}" stroke-dasharray="4 3"/>
     <text x="${pad.l - 4}" y="${sy(v) + 3}" font-size="9" text-anchor="end" fill="#6B7280">${v}</text>`).join('');
  const xt = [0, xMax / 2, xMax].map(v =>
    `<text x="${sx(v)}" y="${height - 8}" font-size="9" text-anchor="middle" fill="#6B7280">${v.toFixed(2)}</text>`).join('');

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>
    ${th}${xt}
    <text x="${width - pad.r}" y="${height - 8}" font-size="9" text-anchor="end" fill="#6B7280" dy="-12">km</text>
    <path d="${path}" stroke="#2E8BFF" stroke-width="2" fill="none"/>
  </svg>`;
}

export function buildReportHtml(trip, mapImageBase64) {
  const s = trip.summary;
  const setup = trip.setup;
  const axis = segmentAxis(trip.segments);
  const worst = worstSegments(trip.segments, 5);
  const marks = trip.marks || [];

  const markNear = (seg) => {
    if (!Number.isFinite(seg.wallTime)) return '';
    const m = marks.find(mk => mk.wallTime >= seg.wallTime - 2000 && mk.wallTime <= seg.wallTimeEnd + 2000);
    return m ? vi(`markLabel.${m.label}`) : '';
  };

  const shareLine = COMFORT_CODES
    .filter(c => (s.comfortShare?.[c] || 0) > 0.0005)
    .map(c => `${esc(vi(`comfort.${c}`))} ${fmtPct(s.comfortShare[c])}`)
    .join(' · ');

  const worstRows = worst.map((i, rank) => {
    const seg = trip.segments[i];
    return `<tr>
      <td>${rank + 1}</td><td>${axis[i].midKm.toFixed(2)}</td>
      <td>${fmtNum(seg.wrms)}</td><td>${esc(vi(`comfort.${classifyComfort(seg.wrms)}`))}</td>
      <td>${Number.isFinite(seg.speed) ? (seg.speed * 3.6).toFixed(0) : '--'}</td>
      <td>${esc(markNear(seg))}</td></tr>`;
  }).join('');

  const setupLine = setup
    ? `${esc(vi(`vehicle.${setup.vehicle}`))} · Gắn: ${esc(vi(`mount.${setup.mount}`))} · Tốc độ mục tiêu: ${setup.targetSpeedKmh} km/h`
    : 'Không có thông tin thiết lập';

  const name = trip.name || vi('history.defaultName', { date: fmtDateTime(trip.startedAt, 'vi') });

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0B1220;margin:28px;font-size:12px}
    h1{font-size:18px;margin:0 0 4px} h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #EEF0F4;padding-bottom:3px}
    .muted{color:#6B7280} .big{font-size:20px;font-weight:800}
    table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #EEF0F4;padding:4px 6px;text-align:left}
    th{font-size:10px;color:#6B7280;text-transform:uppercase}
    .row{display:flex;gap:12px;align-items:flex-start} img{max-width:100%;border-radius:6px}
    .brand{display:flex;align-items:center;gap:10px;margin-bottom:6px}
    .brand img{width:44px;height:44px;border-radius:0}
    .brand .name{font-size:15px;font-weight:800;letter-spacing:-0.2px}
    .brand .tag{font-size:9px;color:#6B7280;letter-spacing:1px;text-transform:uppercase}
    .note{font-size:10px;color:#6B7280;margin-top:14px}
  </style></head><body>
    <div class="brand">
      <img src="data:image/png;base64,${LOGO_BASE64}"/>
      <div><div class="name">SmartRoadSense</div><div class="tag">Safer roads · Smarter tomorrow</div></div>
    </div>
    <h1>BÁO CÁO ĐO ĐỘ ÊM MẶT ĐƯỜNG</h1>
    <div>Tuyến: <b>${esc(name)}</b> &nbsp; Ngày: ${fmtDateTime(trip.startedAt, 'vi')}</div>
    <div class="muted">Phương tiện: ${setupLine}</div>

    <h2>KẾT QUẢ</h2>
    <div class="big">WRMS tổng: ${fmtNum(s.wrmsTotal)} m/s² (${esc(vi(`comfort.${classifyComfort(s.wrmsTotal)}`))})</div>
    <div>Quãng đường: ${fmtKm(s.distanceM)} km · Thời lượng: ${fmtDuration(s.durationS)} · Tốc độ TB: ${Number.isFinite(s.avgSpeedKmh) ? s.avgSpeedKmh.toFixed(0) : '--'} km/h · ${s.segmentCount} đoạn</div>
    <div style="margin-top:4px">Phân bố ${s.shareByDistance ? 'quãng đường' : 'thời gian'}: ${shareLine}</div>

    ${mapImageBase64 ? `<h2>BẢN ĐỒ</h2><img src="data:image/png;base64,${mapImageBase64}"/>` : ''}
    <h2>WRMS THEO QUÃNG ĐƯỜNG</h2>
    ${chartSvg(trip)}

    <h2>5 ĐOẠN XẤU NHẤT</h2>
    <table><tr><th>#</th><th>Km</th><th>WRMS</th><th>Mức</th><th>Tốc độ</th><th>Đánh dấu</th></tr>${worstRows}</table>

    <div class="note">Tính theo ISO 2631-1 (trọng số Wk/Wd). Đo trên điện thoại, chỉ so sánh giữa các lần đo
    cùng loại xe, cùng cách gắn máy và cùng tốc độ.${s.durationS < 60 ? ' Chuyến đo dưới 60 giây: kết quả chỉ mang tính tham khảo.' : ''}${s.offlineCount ? ` ${s.offlineCount} đoạn tính offline trên điện thoại.` : ''}</div>
  </body></html>`;
}

export async function exportPdfReport(trip, mapImageBase64) {
  const { uri } = await Print.printToFileAsync({ html: buildReportHtml(trip, mapImageBase64) });
  const target = new File(Paths.cache, `bao_cao_${trip.id}.pdf`);
  target.create({ overwrite: true });
  new File(uri).moveSync(target, { overwrite: true });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return target.uri;
}
