import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { changeLanguage as i18nChangeLanguage } from '../i18n';

// Keys for localStorage
const STORAGE_KEY = 'ct_settings_v1';

const defaultSettings = {
  theme: 'light', // 'light' | 'dark'
  language: 'en', // 'en', 'es', etc.
  notifications: true,
};

const SettingsContext = createContext({
  settings: defaultSettings,
  setSettings: () => {},
  toggleTheme: () => {},
  setLanguage: () => {},
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (e) {
      return defaultSettings;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Keep <html lang> in sync and update i18n
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = settings.language || 'en';
      i18nChangeLanguage(settings.language);
    }
  }, [settings.language]);

  const toggleTheme = () =>
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));

  const setLanguage = (lng) => {
    setSettings((prev) => ({ ...prev, language: lng || 'en' }));
  };

  const value = useMemo(
    () => ({ settings, setSettings, toggleTheme, setLanguage }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
