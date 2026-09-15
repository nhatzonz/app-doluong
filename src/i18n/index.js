import { useCallback } from 'react';
import { useSettings } from '../features/settings/SettingsContext';
import { translate } from './translate';

export { translate, DICTIONARIES } from './translate';

export const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
];

export function useT() {
  const { settings } = useSettings();
  const lang = settings.lang;
  const t = useCallback((key, params) => translate(lang, key, params), [lang]);
  // Nhan muc ISO: backend tra chuoi tieng Anh lam ma → dich o lop hien thi
  const comfortLabel = useCallback(
    (code) => (code ? translate(lang, `comfort.${code}`) : ''),
    [lang]
  );
  return { t, lang, comfortLabel };
}
