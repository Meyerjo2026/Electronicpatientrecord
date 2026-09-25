import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ColorScheme, Theme } from './tokens';
import { createTheme } from './tokens';
import type { ThemePreference } from './scheme';
import { resolveScheme } from './scheme';

export type { ThemePreference } from './scheme';
export { resolveScheme } from './scheme';

const ThemeContext = createContext<Theme>(createTheme('light'));

export const useResolvedScheme = (preference: ThemePreference): ColorScheme => {
  const systemScheme = useColorScheme();
  return resolveScheme(preference, systemScheme);
};

interface ThemeProviderProps {
  scheme: ColorScheme;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ scheme, children }) => {
  const value = useMemo(() => createTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => useContext(ThemeContext);

/**
 * Build a `StyleSheet` from the active theme and keep it stable for as long as
 * the scheme is unchanged.
 *
 * React Native's `StyleSheet.create` is not theme-aware, so styles that
 * reference colours must be created per scheme rather than at module scope.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
