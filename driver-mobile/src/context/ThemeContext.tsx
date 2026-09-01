import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  card: string;
  cardSecondary: string;
  cardHighlight: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  text: string;
  textMuted: string;
  textSub: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
}

export const darkTheme: ThemeColors = {
  isDark: true,
  bg: '#070d1e',
  card: '#111c38',
  cardSecondary: '#18264c',
  cardHighlight: '#063d27',
  border: '#1f3160',
  borderLight: '#142247',
  primary: '#00b562',
  primaryHover: '#059669',
  primaryText: '#ffffff',
  text: '#ffffff',
  textMuted: '#94a3b8',
  textSub: '#cbd5e1',
  accent: '#38bdf8',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#00b562',
};

export const lightTheme: ThemeColors = {
  isDark: false,
  bg: '#f8fafc',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  cardHighlight: '#ecfdf5',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  primary: '#00b562',
  primaryHover: '#059669',
  primaryText: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  textSub: '#334155',
  accent: '#0284c7',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#059669',
};

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('driver_theme_mode').then(val => {
      if (val === 'light') setIsDark(false);
      else setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('driver_theme_mode', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
