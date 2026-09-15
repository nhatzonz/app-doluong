import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

const fmt = (v, digits) => (Number.isFinite(v) ? v.toFixed(digits) : '');

// options (tuy chon): { setup: {vehicle, mount, targetSpeedKmh}, fileName }
// Goi exportCSV(segments) nhu cu van cho ket qua giong truoc.
export async function exportCSV(segmentResults, options = {}) {
  const { setup, fileName = 'road_roughness.csv' } = options;
  const data = segmentResults.map((seg, i) => ({
    segment: i + 1,
    time: seg.wallTime ? new Date(seg.wallTime).toISOString() : '',
    duration_s: fmt(seg.duration, 2),
    fs_hz: fmt(seg.fs, 1),
    wrms_av_ms2: fmt(seg.wrms, 4),
    aw_z_ms2: fmt(seg.aw_z, 4),
    aw_xy_ms2: fmt(seg.aw_xy, 4),
    comfort: seg.comfort,
    speed_kmh: fmt(seg.speed != null ? seg.speed * 3.6 : NaN, 1),
    // Trong khi khong co GPS fix (khong ghi 0,0 — do la toa do that ngoai Dai Tay Duong)
    lat: fmt(seg.lat, 6),
    lon: fmt(seg.lon, 6),
    source: seg.source || '',
    ...(setup ? {
      vehicle: setup.vehicle || '',
      mount: setup.mount || '',
      target_speed_kmh: setup.targetSpeedKmh ?? '',
    } : {}),
  }));

  const csv = Papa.unparse(data);
  const file = new File(Paths.document, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }

  return file.uri;
}
