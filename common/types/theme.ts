export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  accent: string;
  destructive: string;
  success: string;
}

export interface ThemeConfig {
  light: ThemeColors;
  dark: ThemeColors;
}

export const themeConfig: ThemeConfig = {
  light: {
    background: '#ffffff',
    foreground: '#111827',
    muted: '#f9fafb',
    border: '#e5e7eb',
    accent: '#3b82f6',
    destructive: '#ef4444',
    success: '#10b981',
  },
  dark: {
    background: '#111827',
    foreground: '#f9fafb',
    muted: '#374151',
    border: '#4b5563',
    accent: '#60a5fa',
    destructive: '#f87171',
    success: '#34d399',
  },
};
