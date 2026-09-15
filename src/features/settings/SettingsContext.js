import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { File } from 'expo-file-system';
import { getLocales } from 'expo-localization';
import { API_BASE_URL } from '../../utils/constants';
import { setApiBaseUrl } from '../../services/api';
import { appDir, readJSON, writeJSON } from '../storage/jsonStore';

const SettingsContext = createContext(null);

function defaultLanguage() {
  try {
    return getLocales()?.[0]?.languageCode === 'vi' ? 'vi' : 'en';
  } catch {
    return 'vi';
  }
}

const DEFAULTS = {
  lang: null,             // null = theo ngon ngu cua may
  apiBaseUrl: API_BASE_URL,
  defaultVehicle: 'car',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ ...DEFAULTS, lang: defaultLanguage() });
  const [loaded, setLoaded] = useState(false);
  const file = useMemo(() => new File(appDir(), 'settings.json'), []);

  useEffect(() => {
    (async () => {
      const saved = await readJSON(file);
      if (saved) {
        const merged = { ...DEFAULTS, lang: defaultLanguage(), ...saved };
        setSettings(merged);
        setApiBaseUrl(merged.apiBaseUrl);
      }
      setLoaded(true);
    })();
  }, [file]);

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        writeJSON(file, next);
      } catch (e) {
        console.warn('[settings] save failed', e?.message);
      }
      if (patch.apiBaseUrl) setApiBaseUrl(next.apiBaseUrl);
      return next;
    });
  }, [file]);

  const value = useMemo(() => ({ settings, update, loaded }), [settings, update, loaded]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
