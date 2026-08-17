/**
 * MapSettingsContext - Shared map settings across all screens
 *
 * Provides dot size control that persists across SearchShell and DetailShell.
 * Settings are saved to localStorage for persistence across sessions.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const MapSettingsContext = createContext(null);

const STORAGE_KEY = 'mapSettings';
const DEFAULT_DOT_SIZE = 11;
const MIN_DOT_SIZE = 4;
const MAX_DOT_SIZE = 24;

export function MapSettingsProvider({ children }) {
  const [dotSize, setDotSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.dotSize ?? DEFAULT_DOT_SIZE;
      } catch {
        return DEFAULT_DOT_SIZE;
      }
    }
    return DEFAULT_DOT_SIZE;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dotSize }));
  }, [dotSize]);

  const value = {
    dotSize,
    setDotSize,
    minDotSize: MIN_DOT_SIZE,
    maxDotSize: MAX_DOT_SIZE,
    defaultDotSize: DEFAULT_DOT_SIZE,
  };

  return (
    <MapSettingsContext.Provider value={value}>
      {children}
    </MapSettingsContext.Provider>
  );
}

export function useMapSettings() {
  const context = useContext(MapSettingsContext);
  if (!context) {
    throw new Error('useMapSettings must be used within a MapSettingsProvider');
  }
  return context;
}
