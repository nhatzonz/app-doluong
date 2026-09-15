import { File } from 'expo-file-system';
import { appDir, readJSON, writeJSON, deleteFile } from '../storage/jsonStore';

export const MAX_TRIPS = 5;
export const MIN_TRIP_SEGMENTS = 3;

const TRIP_FILE = /^trip_\d+\.json$/;

const tripsDir = () => appDir('trips');
const indexFile = () => new File(tripsDir(), 'index.json');
const tripFile = (id) => new File(tripsDir(), `${id}.json`);

export const tripIdFor = (startedAt) => `trip_${startedAt}`;

function toMeta(trip) {
  return {
    id: trip.id,
    name: trip.name ?? null,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    setup: trip.setup ?? null,
    summary: trip.summary,
    markCount: trip.marks?.length ?? 0,
  };
}

const newestFirst = (a, b) => b.startedAt - a.startedAt;

// Index hong/mat → dung lai tu cac file chuyen con tren may.
async function rebuildIndex() {
  const files = tripsDir().list().filter(f => f instanceof File && TRIP_FILE.test(f.name));
  const metas = [];
  for (const f of files) {
    const trip = await readJSON(f);
    if (trip?.id && Array.isArray(trip.segments)) metas.push(toMeta(trip));
  }
  metas.sort(newestFirst);
  writeJSON(indexFile(), metas);
  return metas;
}

export async function loadIndex() {
  const index = await readJSON(indexFile());
  if (Array.isArray(index)) return index.sort(newestFirst);
  return rebuildIndex();
}

export async function loadTrip(id) {
  return readJSON(tripFile(id));
}

// Ghi chuyen moi TRUOC, sau do moi xoa chuyen cu vuot gioi han
// → loi giua chung khong lam mat ca 2.
export async function saveTrip(trip) {
  writeJSON(tripFile(trip.id), trip);

  const current = await loadIndex();
  const next = [toMeta(trip), ...current.filter(m => m.id !== trip.id)].sort(newestFirst);
  const kept = next.slice(0, MAX_TRIPS);
  const evicted = next.slice(MAX_TRIPS);

  writeJSON(indexFile(), kept);
  evicted.forEach(m => deleteFile(tripFile(m.id)));
  return { index: kept, evicted };
}

export async function updateTrip(id, patch) {
  const trip = await loadTrip(id);
  if (!trip) return null;
  const updated = { ...trip, ...patch };
  writeJSON(tripFile(id), updated);

  const index = await loadIndex();
  const nextIndex = index.map(m => (m.id === id ? toMeta(updated) : m));
  writeJSON(indexFile(), nextIndex);
  return { trip: updated, index: nextIndex };
}

export async function deleteTrip(id) {
  deleteFile(tripFile(id));
  const index = (await loadIndex()).filter(m => m.id !== id);
  writeJSON(indexFile(), index);
  return index;
}

export async function deleteAllTrips() {
  const index = await loadIndex();
  index.forEach(m => deleteFile(tripFile(m.id)));
  writeJSON(indexFile(), []);
  return [];
}
