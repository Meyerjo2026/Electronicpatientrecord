import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
  View,
  ViewProps,
} from 'react-native';
import { useTheme } from '../theme-context';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'label'
  | 'caption'
  | 'mono';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'primary-accent'
  | 'critical'
  | 'abnormal'
  | 'normal'
  | 'unknown';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  children?: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  tone = 'primary',
  weight,
  style,
  children,
  ...rest
}) => {
  const theme = useTheme();
  const { typography, colors } = theme;

  const base = useMemo<TextStyle>(() => {
    const { sizes, systemFont, monoFont } = typography;
    switch (variant) {
      case 'display':
        return { fontSize: sizes.display, lineHeight: sizes.display * 1.15, fontWeight: '700', letterSpacing: -0.5 };
      case 'title':
        return { fontSize: sizes.xxl, lineHeight: sizes.xxl * 1.2, fontWeight: '700', letterSpacing: -0.3 };
      case 'heading':
        return { fontSize: sizes.lg, lineHeight: sizes.lg * 1.3, fontWeight: '600' };
      case 'subheading':
        return { fontSize: sizes.md, lineHeight: sizes.md * 1.4, fontWeight: '500' };
      case 'body':
        return { fontSize: sizes.md, lineHeight: sizes.md * 1.45, fontWeight: '400' };
      case 'label':
        return { fontSize: sizes.sm, lineHeight: sizes.sm * 1.35, fontWeight: '600' };
      case 'caption':
        return { fontSize: sizes.xs, lineHeight: sizes.xs * 1.4, fontWeight: '400' };
      case 'mono':
        return {
          fontSize: sizes.sm,
          lineHeight: sizes.sm * 1.4,
          fontWeight: '400',
          fontFamily: monoFont,
        };
    }
  }, [variant, typography]);

  const toneColor: Record<TextTone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    inverse: colors.textInverse,
    'primary-accent': colors.primary,
    critical: colors.vitals.critical,
    abnormal: colors.vitals.abnormal,
    normal: colors.vitals.normal,
    unknown: colors.vitals.unknown,
  };

  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: toneColor[tone], fontFamily: base.fontFamily ?? typography.systemFont },
        weight ? { fontWeight: typography.weights[weight] } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

interface CardProps extends ViewProps {
  padded?: boolean;
  elevated?: boolean;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  padded = true,
  elevated = false,
  style,
  children,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        elevated ? theme.elevation.md : theme.elevation.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'critical' | 'info';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Optional leading dot, used to reinforce severity. */
  dot?: boolean;
  style?: object;
}

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', dot = false, style }) => {
  const theme = useTheme();
  const { colors, borderRadius, spacing } = theme;

  const tones: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.fill, fg: colors.textSecondary },
    primary: { bg: colors.primarySurface, fg: colors.primary },
    success: { bg: colors.successSurface, fg: colors.success },
    warning: { bg: colors.warningSurface, fg: colors.warning },
    critical: { bg: colors.errorSurface, fg: colors.error },
    info: { bg: colors.infoSurface, fg: colors.info },
  };
  const palette = tones[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: spacing.xs + 2,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs + 1,
          borderRadius: borderRadius.full,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: palette.fg,
          }}
        />
      ) : null}
      <Text variant="label" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
  );
};
