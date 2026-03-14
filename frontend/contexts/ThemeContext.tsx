// [claude-code 2026-03-14] Theme context — color + font theme, applies CSS variables to :root
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type ThemeConfig,
  THEME_PRESETS,
  DEFAULT_THEME,
  loadStoredTheme,
  saveTheme,
} from '../lib/theme';
import {
  type FontTheme,
  FONT_THEMES,
  DEFAULT_FONT_THEME,
  loadStoredFontTheme,
  saveFontTheme,
} from '../lib/font-theme';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  presets: Record<string, ThemeConfig>;
  fontTheme: FontTheme;
  setFontTheme: (theme: FontTheme) => void;
  fontThemes: Record<string, FontTheme>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--pulse-accent', theme.accent);
  root.style.setProperty('--pulse-bg', theme.bg);
  root.style.setProperty('--pulse-text', theme.text);
  root.style.setProperty('--pulse-bullish', theme.bullish);
  root.style.setProperty('--pulse-bearish', theme.bearish);
  root.style.setProperty('--pulse-surface', theme.surface);
  root.style.setProperty('--pulse-border', theme.border);
  root.style.setProperty('--pulse-muted', theme.muted);
}

function applyFontThemeToDOM(fontTheme: FontTheme) {
  const root = document.documentElement;
  root.style.setProperty('--font-body', fontTheme.fontBody);
  root.style.setProperty('--font-heading', fontTheme.fontHeading);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    const stored = loadStoredTheme();
    applyThemeToDOM(stored);
    return stored;
  });

  const [fontTheme, setFontThemeState] = useState<FontTheme>(() => {
    const stored = loadStoredFontTheme();
    applyFontThemeToDOM(stored);
    return stored;
  });

  const setTheme = useCallback((next: ThemeConfig) => {
    setThemeState(next);
    applyThemeToDOM(next);
    saveTheme(next);
  }, []);

  const setFontTheme = useCallback((next: FontTheme) => {
    setFontThemeState(next);
    applyFontThemeToDOM(next);
    saveFontTheme(next);
  }, []);

  // Apply on mount (SSR safety)
  useEffect(() => {
    applyThemeToDOM(theme);
    applyFontThemeToDOM(fontTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme, presets: THEME_PRESETS, fontTheme, setFontTheme, fontThemes: FONT_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
