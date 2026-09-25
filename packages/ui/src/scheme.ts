import type { ColorScheme } from './tokens';
import { Theme, createTheme } from './tokens';

export type ThemePreference = 'light' | 'dark' | 'auto';

/**
 * Resolve a stored preference against the OS setting. `auto` follows the
 * device so crews working night shifts get a dark UI without configuring it.
 *
 * Kept free of React Native imports so it can be unit tested and reused by
 * non-native consumers.
 */
export function resolveScheme(
  preference: ThemePreference,
  systemScheme: ColorScheme | null | undefined
): ColorScheme {
  if (preference === 'auto') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}
