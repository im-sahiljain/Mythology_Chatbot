import React, { createContext, useContext, useState } from 'react';

export interface ThemeColors {
  // Core backgrounds
  bg: string;
  bgSecondary: string;
  bgTertiary: string;

  // Surfaces
  surface: string;
  surfaceHover: string;
  surfaceBorder: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Accents
  accent: string;
  accentMuted: string;
  accentSubtle: string;

  // Semantic
  purple: string;
  purpleSubtle: string;
  teal: string;
  tealSubtle: string;
  green: string;
  greenSubtle: string;
  amber: string;
  amberSubtle: string;

  // Input
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;

  // Misc
  divider: string;
  shadow: string;
  isDark: boolean;
}

const dark: ThemeColors = {
  bg: '#09090B',
  bgSecondary: '#111114',
  bgTertiary: '#18181B',

  surface: '#1C1C22',
  surfaceHover: '#252530',
  surfaceBorder: 'rgba(255,255,255,0.06)',

  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#52525B',

  accent: '#D4A853',
  accentMuted: '#B8912A',
  accentSubtle: 'rgba(212,168,83,0.10)',

  purple: '#A78BFA',
  purpleSubtle: 'rgba(167,139,250,0.10)',
  teal: '#2DD4BF',
  tealSubtle: 'rgba(45,212,191,0.10)',
  green: '#4ADE80',
  greenSubtle: 'rgba(74,222,128,0.10)',
  amber: '#FBBF24',
  amberSubtle: 'rgba(251,191,36,0.10)',

  inputBg: '#0F0F12',
  inputBorder: 'rgba(255,255,255,0.08)',
  inputFocusBorder: 'rgba(212,168,83,0.45)',

  divider: 'rgba(255,255,255,0.05)',
  shadow: 'rgba(0,0,0,0.5)',
  isDark: true,
};

const light: ThemeColors = {
  bg: '#FAFAF8',
  bgSecondary: '#F4F4F0',
  bgTertiary: '#EEEDE8',

  surface: '#FFFFFF',
  surfaceHover: '#F9F8F5',
  surfaceBorder: 'rgba(0,0,0,0.06)',

  text: '#18181B',
  textSecondary: '#71717A',
  textTertiary: '#A1A1AA',

  accent: '#92710D',
  accentMuted: '#A68418',
  accentSubtle: 'rgba(146,113,13,0.08)',

  purple: '#7C3AED',
  purpleSubtle: 'rgba(124,58,237,0.08)',
  teal: '#0D9488',
  tealSubtle: 'rgba(13,148,136,0.08)',
  green: '#16A34A',
  greenSubtle: 'rgba(22,163,74,0.08)',
  amber: '#D97706',
  amberSubtle: 'rgba(217,119,6,0.08)',

  inputBg: '#F4F4F0',
  inputBorder: 'rgba(0,0,0,0.1)',
  inputFocusBorder: 'rgba(146,113,13,0.45)',

  divider: 'rgba(0,0,0,0.06)',
  shadow: 'rgba(0,0,0,0.08)',
  isDark: false,
};

interface ThemeContextType {
  theme: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: dark,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
