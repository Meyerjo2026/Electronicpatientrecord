import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-context';
import { Text } from './primitives';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  const { colors, borderRadius, spacing, typography } = theme;
  const isDisabled = disabled || loading;

  const variants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.primarySurface, fg: colors.primary, border: 'transparent' },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.error, fg: '#FFFFFF', border: colors.error },
  };
  const palette = variants[variant];

  const sizes: Record<ButtonSize, { height: number; px: number; text: 'label' | 'subheading' }> = {
    sm: { height: 36, px: spacing.md, text: 'label' },
    md: { height: 48, px: spacing.lg, text: 'subheading' },
    lg: { height: 56, px: spacing.xl, text: 'subheading' },
  };
  const metrics = sizes[size];

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        {
          height: metrics.height,
          minWidth: theme.layout.minTouchTarget,
          paddingHorizontal: metrics.px,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderRadius: borderRadius.md,
          backgroundColor: isDisabled ? colors.fill : palette.bg,
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : StyleSheet.hairlineWidth,
          borderColor: isDisabled ? colors.border : variant === 'ghost' ? colors.border : palette.border,
          opacity: pressed && !isDisabled ? 0.75 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          flexGrow: fullWidth ? 1 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDisabled ? colors.disabledText : palette.fg} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={size === 'sm' ? 15 : 18}
          color={isDisabled ? colors.disabledText : palette.fg}
        />
      ) : null}
      <Text
        variant={metrics.text}
        numberOfLines={1}
        style={{
          color: isDisabled ? colors.disabledText : palette.fg,
          fontWeight: typography.weights.semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
  size?: number;
  tone?: 'default' | 'primary' | 'critical';
  disabled?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  label,
  size = 20,
  tone = 'default',
  disabled = false,
  style,
}) => {
  const theme = useTheme();
  const { colors, borderRadius } = theme;

  const fg =
    tone === 'primary' ? colors.primary : tone === 'critical' ? colors.error : colors.textSecondary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: theme.layout.minTouchTarget,
          height: theme.layout.minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius.md,
          backgroundColor: pressed && !disabled ? colors.fill : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={disabled ? colors.disabledText : fg} />
    </Pressable>
  );
};
