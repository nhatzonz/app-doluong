import vi from './vi';
import en from './en';

// Khong phu thuoc React → dung duoc o ca lop export (PDF) va test Node.
export const DICTIONARIES = { vi, en };

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

// Tra key dang 'home.title', thay {bien} bang params. Thieu key → tra ve key
// (de thay ngay tren UI) thay vi crash.
export function translate(lang, key, params) {
  let str = lookup(DICTIONARIES[lang] || vi, key);
  if (str === undefined) str = lookup(vi, key);
  if (typeof str !== 'string') return key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => (params[name] != null ? String(params[name]) : m));
}
