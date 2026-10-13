'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '@/common/types/theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Shared tokens switch on data-theme on <html>; no attribute means follow the system.
// The 'light' / 'dark' class is kept for Tailwind's darkMode: 'class'.
function applyTheme(theme: Theme): 'light' | 'dark' {
  const root = window.document.documentElement;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Wait for the stored value so the first render does not overwrite it with 'system'.
    if (!loaded) return;
    setResolvedTheme(applyTheme(theme));
    localStorage.setItem('theme', theme);
  }, [theme, loaded]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setResolvedTheme(applyTheme('system'));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
