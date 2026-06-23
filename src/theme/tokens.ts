/**
 * Design system tokens for the Notes App.
 * Supports light/dark modes with a premium, modern aesthetic.
 */

import { Platform } from 'react-native';

// ── Color Palette ────────────────────────────────────────────────────

export const palette = {
  // Primary brand colors
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main primary
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  // Accent / Secondary
  accent: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Main accent
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  // Success
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  // Warning
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  // Error
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
  },
  // Neutrals
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    850: '#1C1C1E',
    900: '#171717',
    950: '#0A0A0F',
  },
} as const;

// ── Note Colors ──────────────────────────────────────────────────────

export const noteColors = [
  { name: 'Default', light: '#FFFFFF', dark: '#1C1C1E' },
  { name: 'Coral', light: '#FAECEC', dark: '#3D2020' },
  { name: 'Peach', light: '#FFF0E6', dark: '#3D2E1A' },
  { name: 'Sand', light: '#FFF8E1', dark: '#3D3520' },
  { name: 'Sage', light: '#E8F5E9', dark: '#1B3D1B' },
  { name: 'Fog', light: '#E8EAF6', dark: '#1A1D3D' },
  { name: 'Storm', light: '#EDE7F6', dark: '#2D1A3D' },
  { name: 'Dusk', light: '#F3E5F5', dark: '#3D1A35' },
  { name: 'Mist', light: '#E0F7FA', dark: '#1A2F3D' },
] as const;

// ── Light Theme ──────────────────────────────────────────────────────

export const lightTheme = {
  colors: {
    // Backgrounds
    background: palette.neutral[0],
    backgroundSecondary: palette.neutral[50],
    backgroundTertiary: palette.neutral[100],
    surface: palette.neutral[0],
    surfaceElevated: palette.neutral[0],

    // Text
    text: palette.neutral[900],
    textSecondary: palette.neutral[600],
    textTertiary: palette.neutral[400],
    textInverse: palette.neutral[0],

    // Brand
    primary: palette.primary[500],
    primaryLight: palette.primary[100],
    primaryDark: palette.primary[700],
    accent: palette.accent[500],

    // Status
    success: palette.success[500],
    warning: palette.warning[500],
    error: palette.error[500],

    // UI Elements
    border: palette.neutral[200],
    borderLight: palette.neutral[100],
    divider: palette.neutral[100],
    icon: palette.neutral[600],
    iconSecondary: palette.neutral[400],

    // Interactive
    buttonPrimary: palette.primary[500],
    buttonPrimaryText: palette.neutral[0],
    buttonSecondary: palette.neutral[100],
    buttonSecondaryText: palette.neutral[900],
    buttonDanger: palette.error[500],
    buttonDangerText: palette.neutral[0],

    // Specific
    card: palette.neutral[0],
    cardBorder: palette.neutral[100],
    searchBar: palette.neutral[100],
    tabBar: palette.neutral[0],
    tabBarBorder: palette.neutral[200],
    fab: palette.primary[500],
    fabText: palette.neutral[0],

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    scrim: 'rgba(0, 0, 0, 0.3)',
  },
  isDark: false,
} as const;

// ── Dark Theme ───────────────────────────────────────────────────────

export const darkTheme = {
  colors: {
    // Backgrounds
    background: palette.neutral[950],
    backgroundSecondary: palette.neutral[900],
    backgroundTertiary: palette.neutral[850],
    surface: palette.neutral[900],
    surfaceElevated: palette.neutral[850],

    // Text
    text: palette.neutral[50],
    textSecondary: palette.neutral[400],
    textTertiary: palette.neutral[500],
    textInverse: palette.neutral[900],

    // Brand
    primary: palette.primary[400],
    primaryLight: palette.primary[900],
    primaryDark: palette.primary[300],
    accent: palette.accent[400],

    // Status
    success: palette.success[400],
    warning: palette.warning[400],
    error: palette.error[400],

    // UI Elements
    border: palette.neutral[800],
    borderLight: palette.neutral[850],
    divider: palette.neutral[850],
    icon: palette.neutral[400],
    iconSecondary: palette.neutral[500],

    // Interactive
    buttonPrimary: palette.primary[500],
    buttonPrimaryText: palette.neutral[0],
    buttonSecondary: palette.neutral[800],
    buttonSecondaryText: palette.neutral[100],
    buttonDanger: palette.error[600],
    buttonDangerText: palette.neutral[0],

    // Specific
    card: palette.neutral[900],
    cardBorder: palette.neutral[800],
    searchBar: palette.neutral[850],
    tabBar: palette.neutral[950],
    tabBarBorder: palette.neutral[850],
    fab: palette.primary[500],
    fabText: palette.neutral[0],

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
  isDark: true,
} as const;

// ── Typography ───────────────────────────────────────────────────────

export const typography = {
  fonts: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
    hero: 48,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

// ── Spacing ──────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ── Border Radius ────────────────────────────────────────────────────

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ── Shadows ──────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

// ── Animation ────────────────────────────────────────────────────────

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
  },
  spring: {
    default: { damping: 15, stiffness: 150, mass: 1 },
    bouncy: { damping: 10, stiffness: 200, mass: 0.8 },
    gentle: { damping: 20, stiffness: 100, mass: 1.2 },
    snappy: { damping: 18, stiffness: 250, mass: 0.8 },
  },
} as const;

// ── Theme Type ───────────────────────────────────────────────────────

export interface Theme {
  readonly colors: {
    readonly [K in keyof typeof lightTheme.colors]: string;
  };
  readonly isDark: boolean;
}
export type ThemeColors = Theme['colors'];

