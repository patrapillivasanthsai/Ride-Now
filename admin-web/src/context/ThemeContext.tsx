import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  mode: ThemeMode;
  bg: string;
  cardBg: string;
  cardBgSecondary: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarMuted: string;
  border: string;
  borderLight: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  primary: string;
  primaryHover: string;
  primaryBg: string;
  accent: string;
  inputBg: string;
  tableHeaderBg: string;
  tableRowHover: string;
  badgeBg: string;
}

export const lightTheme: ThemeColors = {
  mode: 'light',
  bg: '#f8fafc',
  cardBg: '#ffffff',
  cardBgSecondary: '#f1f5f9',
  sidebarBg: '#0f172a',
  sidebarBorder: '#1e293b',
  sidebarText: '#f8fafc',
  sidebarMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
  textSecondary: '#334155',
  primary: '#00b562',
  primaryHover: '#009752',
  primaryBg: 'rgba(0, 181, 98, 0.1)',
  accent: '#3b82f6',
  inputBg: '#ffffff',
  tableHeaderBg: '#f8fafc',
  tableRowHover: '#f8fafc',
  badgeBg: '#f1f5f9',
};

export const darkTheme: ThemeColors = {
  mode: 'dark',
  bg: '#090d16',
  cardBg: '#131b2e',
  cardBgSecondary: '#1c2640',
  sidebarBg: '#090e1a',
  sidebarBorder: '#1e293b',
  sidebarText: '#f8fafc',
  sidebarMuted: '#64748b',
  border: '#1e293b',
  borderLight: '#28354f',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSecondary: '#cbd5e1',
  primary: '#00c86e',
  primaryHover: '#00b562',
  primaryBg: 'rgba(0, 200, 110, 0.15)',
  accent: '#60a5fa',
  inputBg: '#1a243b',
  tableHeaderBg: '#101729',
  tableRowHover: '#182238',
  badgeBg: '#1e293b',
};

interface ThemeContextType {
  theme: ThemeColors;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('admin_theme') as ThemeMode;
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('admin_theme', newMode);
  };

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.style.backgroundColor = mode === 'dark' ? '#090d16' : '#f8fafc';
    document.body.style.color = mode === 'dark' ? '#f8fafc' : '#0f172a';
  }, [mode]);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
