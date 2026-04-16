import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

export async function exportCSV(segmentResults) {
  const data = segmentResults.map((seg, i) => ({
    segment: i + 1,
    wrms: seg.wrms.toFixed(4),
    comfort: seg.comfort,
    lat: seg.lat,
    lon: seg.lon,
    speed: seg.speed || '',
  }));

  const csv = Papa.unparse(data);
  const file = new File(Paths.document, 'road_roughness.csv');
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
