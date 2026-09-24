export const colors = {
  // Primary brand colors
  primary: '#0066CC',
  primaryDark: '#0052A3',
  primaryLight: '#E6F0FA',
  
  // Secondary colors
  secondary: '#009944',
  secondaryDark: '#007A33',
  secondaryLight: '#E6F7ED',
  
  // Semantic colors
  success: '#009944',
  warning: '#FF9900',
  error: '#CC0000',
  info: '#0066CC',
  
  // Background colors
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Text colors
  textPrimary: '#1A1A1A',
  textSecondary: '#4A4A4A',
  textTertiary: '#8A8A8A',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Border colors
  border: '#E0E0E0',
  borderFocus: '#0066CC',
  borderError: '#CC0000',
  
  // Status colors (EMS specific)
  triage: {
    immediate: '#CC0000',    // Red - Immediate
    delayed: '#FF9900',      // Yellow - Delayed
    minimal: '#009944',      // Green - Minimal
    expectant: '#666666',    // Gray - Expectant
    deceased: '#000000',     // Black - Deceased
  },
  
  // Vital signs thresholds
  vitals: {
    critical: '#CC0000',
    abnormal: '#FF9900',
    normal: '#009944',
    unknown: '#8A8A8A',
  },
  
  // Level of service colors
  levelOfService: {
    BLS: '#009944',
    ALS: '#0066CC',
    CC: '#CC0000',
    AIR: '#9933CC',
    TACTICAL: '#FF6600',
    COMMUNITY: '#009999',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
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
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
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
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
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
  headerHeight: 56,
  tabBarHeight: 64,
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