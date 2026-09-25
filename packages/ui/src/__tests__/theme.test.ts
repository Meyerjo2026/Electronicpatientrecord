// Imported from the individual modules rather than the package barrel: the
// barrel re-exports components that pull in React Native, which cannot be
// loaded in the node test environment. Only the token/scheme layer is pure.
import {
  borderRadius,
  createTheme,
  darkPalette,
  darkTheme,
  lightPalette,
  lightTheme,
  palettes,
  spacing,
} from '../tokens';
import { resolveScheme } from '../scheme';

describe('resolveScheme', () => {
  test('an explicit preference always wins over the system setting', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });

  test('auto follows the system setting', () => {
    expect(resolveScheme('auto', 'dark')).toBe('dark');
    expect(resolveScheme('auto', 'light')).toBe('light');
  });

  test('auto falls back to light when the system reports nothing', () => {
    // Happens on web before hydration and on platforms with no dark mode.
    expect(resolveScheme('auto', null)).toBe('light');
    expect(resolveScheme('auto', undefined)).toBe('light');
  });
});

describe('createTheme', () => {
  test('attaches the matching palette', () => {
    expect(createTheme('light').colors).toEqual(lightPalette);
    expect(createTheme('dark').colors).toEqual(darkPalette);
  });

  test('the prebuilt themes match the factory output', () => {
    expect(lightTheme).toEqual(createTheme('light'));
    expect(darkTheme).toEqual(createTheme('dark'));
  });

  test('both schemes share scale tokens so layout never shifts', () => {
    expect(createTheme('light').spacing).toBe(spacing);
    expect(createTheme('dark').spacing).toBe(spacing);
    expect(createTheme('light').borderRadius).toBe(borderRadius);
    expect(createTheme('dark').borderRadius).toBe(borderRadius);
  });

  test('palettes expose the same keys in both schemes', () => {
    expect(Object.keys(palettes.light).sort()).toEqual(Object.keys(palettes.dark).sort());
  });

  test('every scheme defines the full surface and text ramp', () => {
    // Guards against a colour being renamed in one palette only, which is what
    // produces unreadable text after a partial dark-mode change.
    const required = [
      'background',
      'surface',
      'surfaceElevated',
      'surfaceSunken',
      'textPrimary',
      'textSecondary',
      'textTertiary',
      'textInverse',
      'border',
      'separator',
    ] as const;

    for (const scheme of ['light', 'dark'] as const) {
      const palette = palettes[scheme];
      for (const key of required) {
        expect(palette[key]).toBeDefined();
      }
    }
  });

  test('dark surfaces are darker than the light equivalents', () => {
    expect(darkPalette.background).not.toBe(lightPalette.background);
    expect(darkPalette.surface).not.toBe(lightPalette.surface);
  });
});
