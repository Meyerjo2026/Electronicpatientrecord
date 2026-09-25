/**
 * Design tokens for the prehospital EPR platform.
 *
 * Colour is the only token that varies between schemes; spacing, typography,
 * radii and elevation are shared. Keeping the palettes structurally identical
 * means a component can reference `colors.textPrimary` without knowing which
 * scheme is active.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Brand accent, used for primary actions and active states. */
  primary: string;
  primaryDark: string;
  primaryLight: string;
  /** Tinted background for primary accents. */
  primarySurface: string;
  onPrimary: string;

  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  secondarySurface: string;

  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  error: string;
  errorSurface: string;
  info: string;
  infoSurface: string;

  /** App background behind all content. */
  background: string;
  /** Raised card / sheet surface. */
  surface: string;
  /** Surface above `surface`, e.g. menus and popovers. */
  surfaceElevated: string;
  /** Translucent chrome such as headers and the tab bar. */
  surfaceTranslucent: string;
  /** Recessed wells, e.g. input fields and segmented controls. */
  surfaceSunken: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textOnPrimary: string;

  border: string;
  borderStrong: string;
  separator: string;
  scrim: string;
  fill: string;
  fillStrong: string;
  disabled: string;
  disabledText: string;

  white: string;
  black: string;

  /** Patient sex indicators. */
  female: string;
  femaleSurface: string;
  male: string;
  maleSurface: string;

  /**
   * Clinical severity colours. These are deliberately identical across
   * schemes: red/amber/green carry meaning that must not shift with the
   * theme, and they are chosen to stay distinguishable for the most common
   * forms of colour vision deficiency by encoding severity in luminance as
   * well as hue.
   */
  triage: {
    immediate: string;
    delayed: string;
    minimal: string;
    expectant: string;
    deceased: string;
  };

  vitals: {
    critical: string;
    abnormal: string;
    normal: string;
    unknown: string;
  };

  levelOfService: {
    BLS: string;
    ALS: string;
    CC: string;
    AIR: string;
    TACTICAL: string;
    COMMUNITY: string;
  };
}

const sharedSemantic = {
  triage: {
    immediate: '#D70015',
    delayed: '#B25000',
    minimal: '#1E7B34',
    expectant: '#6E6E73',
    deceased: '#1C1C1E',
  },
  vitals: {
    critical: '#D70015',
    abnormal: '#B25000',
    normal: '#1E7B34',
    unknown: '#6E6E73',
  },
  levelOfService: {
    BLS: '#1E7B34',
    ALS: '#0A5BD3',
    CC: '#D70015',
    AIR: '#7B3FB5',
    TACTICAL: '#B25000',
    COMMUNITY: '#0E7C86',
  },
} as const;

export const lightPalette: Palette = {
  primary: '#0A5BD3',
  primaryDark: '#073F94',
  primaryLight: '#3D82E8',
  primarySurface: '#E8F0FD',
  onPrimary: '#FFFFFF',

  secondary: '#0E7C86',
  secondaryDark: '#0A5B63',
  secondaryLight: '#3FA5AF',
  secondarySurface: '#E2F4F5',

  success: '#1E7B34',
  successSurface: '#E6F4EA',
  warning: '#B25000',
  warningSurface: '#FDF0E4',
  error: '#D70015',
  errorSurface: '#FDEAEC',
  info: '#0A5BD3',
  infoSurface: '#E8F0FD',

  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceTranslucent: 'rgba(255,255,255,0.94)',
  surfaceSunken: '#EDEFF3',

  textPrimary: '#11131A',
  textSecondary: '#4A4F5C',
  textTertiary: '#797F8C',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  border: '#E2E5EB',
  borderStrong: '#C6CBD5',
  separator: '#E8EAEF',
  scrim: 'rgba(12,14,20,0.36)',
  fill: 'rgba(20,24,34,0.05)',
  fillStrong: 'rgba(20,24,34,0.10)',
  disabled: '#C6CBD5',
  disabledText: '#9AA0AC',

  white: '#FFFFFF',
  black: '#000000',

  female: '#C2185B',
  femaleSurface: '#FCEAF1',
  male: '#0A5BD3',
  maleSurface: '#E8F0FD',

  ...sharedSemantic,
};

export const darkPalette: Palette = {
  primary: '#5B9BFF',
  primaryDark: '#8FBCFF',
  primaryLight: '#2A6FD1',
  primarySurface: '#152441',
  onPrimary: '#06101F',

  secondary: '#4FC3CE',
  secondaryDark: '#7FD8E0',
  secondaryLight: '#2A8A93',
  secondarySurface: '#0F2C2F',

  success: '#4CC66A',
  successSurface: '#12301B',
  warning: '#E8A33D',
  warningSurface: '#33240E',
  error: '#FF6B6B',
  errorSurface: '#3A1618',
  info: '#5B9BFF',
  infoSurface: '#152441',

  background: '#0B0D12',
  surface: '#151922',
  surfaceElevated: '#1D222D',
  surfaceTranslucent: 'rgba(11,13,18,0.94)',
  surfaceSunken: '#0F131A',

  textPrimary: '#F2F4F8',
  textSecondary: '#B4BAC7',
  textTertiary: '#868D9C',
  textInverse: '#11131A',
  textOnPrimary: '#06101F',

  border: '#262C38',
  borderStrong: '#39404F',
  separator: '#1F242E',
  scrim: 'rgba(0,0,0,0.6)',
  fill: 'rgba(255,255,255,0.06)',
  fillStrong: 'rgba(255,255,255,0.12)',
  disabled: '#39404F',
  disabledText: '#6B7280',

  white: '#FFFFFF',
  black: '#000000',

  female: '#F06292',
  femaleSurface: '#33162A',
  male: '#5B9BFF',
  maleSurface: '#152441',

  ...sharedSemantic,
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 64,
} as const;

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

const systemFont = 'System';

export const typography = {
  systemFont,
  monoFont: 'Courier',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const elevation = {
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
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

export const breakpoints = {
  sm: 320,
  md: 375,
  lg: 428,
  xl: 768,
  xxl: 1024,
} as const;

export const zIndex = {
  base: 0,
  sticky: 100,
  dropdown: 200,
  overlay: 250,
  modal: 300,
  popover: 400,
  toast: 500,
} as const;

export const duration = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

export const layout = {
  /** Caps the reading column on tablets and in landscape. */
  contentMaxWidth: 720,
  formMaxWidth: 680,
  /** Room for the floating tab bar plus safe area. */
  tabBarClearance: 96,
  controlHeight: 50,
  minTouchTarget: 44,
  headerHeight: 52,
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  elevation: typeof elevation;
  breakpoints: typeof breakpoints;
  zIndex: typeof zIndex;
  duration: typeof duration;
  layout: typeof layout;
}

export const createTheme = (scheme: ColorScheme): Theme => ({
  scheme,
  colors: palettes[scheme],
  spacing,
  borderRadius,
  typography,
  elevation,
  breakpoints,
  zIndex,
  duration,
  layout,
});

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');
