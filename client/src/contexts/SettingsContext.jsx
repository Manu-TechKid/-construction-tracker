import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { changeLanguage as i18nChangeLanguage } from '../i18n

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
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
      // If no saved settings, check system preference
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return { ...defaultSettings, theme: 'dark' };
      }
      return defaultSettings;
    } catch (e) {
      console.error('Error loading settings:', e);
      return defaultSettings;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  // Apply theme and language to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Apply theme class to document
      document.documentElement.setAttribute('data-theme', settings.theme);
      
      // Apply language to document
      document.documentElement.lang = settings.language || 'en';
      
      // Update i18n language
      i18nChangeLanguage(settings.language);
    }
  }, [settings.theme, settings.language]);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  // Set language
  const setLanguage = (lng) => {
    setSettings(prev => ({
      ...prev,
      language: lng || 'en',
    }));
  };

  // Watch for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      setSettings(prev => ({
        ...prev,
        theme: mediaQuery.matches ? 'dark' : 'light',
      }));
    };
    
    // Add listener for system theme changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      settings,
      setSettings,
      toggleTheme,
      setLanguage,
    }),
    [settings]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
