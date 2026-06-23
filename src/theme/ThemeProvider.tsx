/**
 * Theme context and hook for accessing the current theme throughout the app.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Appearance, ColorSchemeName } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './tokens';

type ThemeMode = 'light' | 'dark' | 'system';

// ── Context ──────────────────────────────────────────────────────────

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
  isDark: false,
});

// ── Provider ─────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  // Sync native OS appearance (e.g. for Alert popups and keyboard) with the app's theme
  useEffect(() => {
    let scheme: ColorSchemeName;
    if (themeMode === 'system') {
      scheme = systemScheme;
    } else {
      scheme = themeMode as ColorSchemeName;
    }
    Appearance.setColorScheme(scheme);
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useColors() {
  return useTheme().theme.colors;
}
