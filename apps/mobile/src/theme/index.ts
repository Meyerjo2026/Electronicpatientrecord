import { Platform } from 'react-native';

const systemFont = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}) ?? 'System';

export const colors = {
  primary: '#007AFF',
  primaryDark: '#0062CC',
  primaryLight: '#EAF3FF',
  secondary: '#34C759',
  secondaryDark: '#248A3D',
  secondaryLight: '#EAF9EE',
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF3B30',
  info: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceTranslucent: 'rgba(255,255,255,0.92)',
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  white: '#FFFFFF',
  border: 'rgba(60,60,67,0.16)',
  borderFocus: '#007AFF',
  borderError: '#FF3B30',
  separator: 'rgba(60,60,67,0.16)',
  scrim: 'rgba(0,0,0,0.32)',
  fill: 'rgba(118,118,128,0.12)',
  fillStrong: 'rgba(118,118,128,0.20)',
  disabled: '#C7C7CC',
  disabledText: '#8E8E93',
  female: '#FF2D55',
  femaleLight: '#FFF0F3',
  male: '#007AFF',
  maleLight: '#EAF3FF',
  triage: {
    immediate: '#FF3B30',
    delayed: '#FF9F0A',
    minimal: '#34C759',
    expectant: '#8E8E93',
    deceased: '#000000',
  },
  vitals: {
    critical: '#FF3B30',
    abnormal: '#FF9F0A',
    normal: '#34C759',
    unknown: '#8E8E93',
  },
  levelOfService: {
    BLS: '#34C759',
    ALS: '#007AFF',
    CC: '#FF3B30',
    AIR: '#AF52DE',
    TACTICAL: '#FF9500',
    COMMUNITY: '#00A7A7',
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const typography = {
  systemFont,
  sizes: {
    xs: 11,
    sm: 13,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    xxxl: 34,
    display: 40,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  styles: {
    largeTitle: {
      fontFamily: systemFont,
      fontSize: 34,
      lineHeight: 41,
      fontWeight: '700' as const,
      letterSpacing: 0.2,
    },
    title1: {
      fontFamily: systemFont,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700' as const,
      letterSpacing: 0.2,
    },
    title2: {
      fontFamily: systemFont,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
      letterSpacing: 0.2,
    },
    title3: {
      fontFamily: systemFont,
      fontSize: 20,
      lineHeight: 25,
      fontWeight: '600' as const,
    },
    headline: {
      fontFamily: systemFont,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600' as const,
    },
    body: {
      fontFamily: systemFont,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    callout: {
      fontFamily: systemFont,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '400' as const,
    },
    subheadline: {
      fontFamily: systemFont,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    footnote: {
      fontFamily: systemFont,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
    },
    caption: {
      fontFamily: systemFont,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    caption2: {
      fontFamily: systemFont,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '400' as const,
    },
  },
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 6,
  },
};

export const breakpoints = {
  sm: 320,
  md: 375,
  lg: 428,
  xl: 768,
  xxl: 1024,
};

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
};

export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const layout = {
  maxWidth: 1200,
  contentMaxWidth: 900,
  formMaxWidth: 720,
  headerHeight: 52,
  tabBarHeight: 64,
  controlHeight: 50,
  minTouchTarget: 44,
  sideBarWidth: 280,
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  animation,
  layout,
};

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
