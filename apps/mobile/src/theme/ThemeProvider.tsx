import React from 'react';
import { useSelector } from 'react-redux';
import {
  ThemeProvider as UIThemeProvider,
  useResolvedScheme,
  type ThemePreference,
} from '@prehospital-epr/ui';
import { RootState } from '../store';

/**
 * Bridges the persisted theme preference in `uiSlice` to the design system.
 *
 * `auto` tracks the device appearance, so crews get the dark palette for night
 * shifts without changing a setting.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const preference = useSelector(
    (state: RootState) => state.ui.theme
  ) as ThemePreference;
  const scheme = useResolvedScheme(preference);

  return <UIThemeProvider scheme={scheme}>{children}</UIThemeProvider>;
};

export { useTheme, useThemedStyles } from '@prehospital-epr/ui';
export { setTheme } from '../store/uiSlice';
