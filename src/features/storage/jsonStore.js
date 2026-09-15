import { File, Directory, Paths } from 'expo-file-system';

// Luu JSON xuong thu muc document cua app. Moi loi doc (file hong, chua ton tai)
// tra ve null thay vi throw de UI khong bi crash.

export function appDir(...segments) {
  const dir = new Directory(Paths.document, ...segments);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export async function readJSON(file) {
  try {
    if (!file.exists) return null;
    return JSON.parse(await file.text());
  } catch (e) {
    console.warn('[jsonStore] read failed', file.uri, e?.message);
    return null;
  }
}

// Ghi ra file tam roi moi thay file that → neu app bi tat giua chung,
// file cu van con nguyen.
export function writeJSON(file, data) {
  const tmp = new File(file.uri + '.tmp');
  tmp.create({ overwrite: true });
  tmp.write(JSON.stringify(data));
  tmp.moveSync(new File(file.uri), { overwrite: true });
}

export function deleteFile(file) {
  if (file.exists) file.delete();
}
