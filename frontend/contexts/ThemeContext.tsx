// [claude-code 2026-03-06] Theme context — applies CSS variables to :root, provides useTheme()
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type ThemeConfig,
  THEME_PRESETS,
  DEFAULT_THEME,
  loadStoredTheme,
  saveTheme,
} from '../lib/theme';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  presets: Record<string, ThemeConfig>;
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    const stored = loadStoredTheme();
    applyThemeToDOM(stored);
    return stored;
  });

  const setTheme = useCallback((next: ThemeConfig) => {
    setThemeState(next);
    applyThemeToDOM(next);
    saveTheme(next);
  }, []);

  // Apply on mount (SSR safety)
  useEffect(() => {
    applyThemeToDOM(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme, presets: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
