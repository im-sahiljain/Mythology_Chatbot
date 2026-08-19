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
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // Stitch Primary & Containers
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  primaryFixedDim: string;

  // Stitch Secondary & Containers
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Outline / Borders
  outline: string;
  outlineVariant: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Accents
  accent: string;
  accentMuted: string;
  accentSubtle: string;
  goldLight: string;

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
  surfaceBorder: 'rgba(212,168,83,0.2)',
  surfaceContainerLowest: '#141417',
  surfaceContainerLow: '#18181C',
  surfaceContainer: '#1F1F24',
  surfaceContainerHigh: '#28282F',
  surfaceContainerHighest: '#32323A',

  primary: '#EAC25C',
  primaryContainer: '#D4A853',
  onPrimaryContainer: '#18181B',
  primaryFixedDim: '#EAC25C',

  secondary: '#A1A1AA',
  secondaryContainer: '#27272A',
  onSecondaryContainer: '#FAFAFA',

  outline: '#71717A',
  outlineVariant: 'rgba(212,168,83,0.25)',

  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',

  accent: '#D4A853',
  accentMuted: '#B8912A',
  accentSubtle: 'rgba(212,168,83,0.12)',
  goldLight: '#FDE047',

  purple: '#A78BFA',
  purpleSubtle: 'rgba(167,139,250,0.12)',
  teal: '#2DD4BF',
  tealSubtle: 'rgba(45,212,191,0.12)',
  green: '#4ADE80',
  greenSubtle: 'rgba(74,222,128,0.12)',
  amber: '#FBBF24',
  amberSubtle: 'rgba(251,191,36,0.12)',

  inputBg: '#141417',
  inputBorder: 'rgba(212,168,83,0.25)',
  inputFocusBorder: '#D4A853',

  divider: 'rgba(255,255,255,0.08)',
  shadow: 'rgba(0,0,0,0.5)',
  isDark: true,
};

const light: ThemeColors = {
  bg: '#FAFAF8',
  bgSecondary: '#F5F2EB',
  bgTertiary: '#F0EDF1',

  surface: '#FBF8FC',
  surfaceHover: '#F6F2F7',
  surfaceBorder: '#D1C5B1',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F6F2F7',
  surfaceContainer: '#F0EDF1',
  surfaceContainerHigh: '#EAE7EB',
  surfaceContainerHighest: '#E4E1E6',

  primary: '#755900',
  primaryContainer: '#92710D',
  onPrimaryContainer: '#FFFEFF',
  primaryFixedDim: '#EAC25C',

  secondary: '#5F5E59',
  secondaryContainer: '#E5E2DB',
  onSecondaryContainer: '#65645F',

  outline: '#7F7665',
  outlineVariant: '#D1C5B1',

  text: '#1B1B1E',
  textSecondary: '#5F5E59',
  textTertiary: '#7F7665',

  accent: '#92710D',
  accentMuted: '#755900',
  accentSubtle: 'rgba(146,113,13,0.09)',
  goldLight: '#EAC25C',

  purple: '#7C3AED',
  purpleSubtle: 'rgba(124,58,237,0.08)',
  teal: '#0D9488',
  tealSubtle: 'rgba(13,148,136,0.08)',
  green: '#16A34A',
  greenSubtle: 'rgba(22,163,74,0.08)',
  amber: '#D97706',
  amberSubtle: 'rgba(217,119,6,0.08)',

  inputBg: '#FFFFFF',
  inputBorder: '#D1C5B1',
  inputFocusBorder: '#92710D',

  divider: '#D1C5B1',
  shadow: 'rgba(146,113,13,0.12)',
  isDark: false,
};

interface ThemeContextType {
  theme: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: light,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
