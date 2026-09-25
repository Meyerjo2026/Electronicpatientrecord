import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-context';
import { Text } from './primitives';

export interface ScreenProps {
  children: React.ReactNode;
  /** Scrolls by default; set false for screens that own their own list. */
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: ViewStyle;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentStyle,
}) => {
  const theme = useTheme();
  const { colors, spacing, layout } = theme;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          // Leave room for the floating tab bar.
          paddingBottom: layout.tabBarClearance + spacing.lg,
          gap: spacing.lg,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1 },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return <View style={{ flex: 1, backgroundColor: colors.background }}>{body}</View>;
};

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Rendered on the trailing edge, e.g. a sync status pill. */
  accessory?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, accessory }) => {
  const theme = useTheme();
  const { spacing } = theme;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subheading" tone="secondary" style={{ marginTop: spacing.xxs }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory}
    </View>
  );
};

export interface SectionProps {
  title?: string;
  /** Rendered on the title row, e.g. a count. */
  meta?: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({ title, meta, action, children, style }) => {
  const theme = useTheme();
  const { spacing } = theme;

  return (
    <View style={[{ gap: spacing.md }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flex: 1 }}>
            <Text variant="heading">{title}</Text>
            {meta ? (
              <Text variant="caption" tone="tertiary">
                {meta}
              </Text>
            ) : null}
          </View>
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
              <Text variant="label" tone="primary-accent">
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: 'default' | 'primary' | 'critical';
  onPress?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  meta,
  icon,
  iconTone = 'default',
  onPress,
  chevron = false,
  disabled = false,
  style,
}) => {
  const theme = useTheme();
  const { colors, spacing, borderRadius } = theme;

  const iconColor =
    iconTone === 'primary' ? colors.primary : iconTone === 'critical' ? colors.error : colors.textSecondary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: theme.layout.minTouchTarget + 6,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: pressed && onPress ? colors.fill : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: borderRadius.sm,
            backgroundColor: colors.surfaceSunken,
          }}
        >
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text variant="subheading" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {meta ? (
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {chevron && onPress ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
      ) : null}
    </Pressable>
  );
};

export const Divider: React.FC<{ inset?: number }> = ({ inset = 0 }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.separator,
        marginLeft: inset,
      }}
    />
  );
};

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  const theme = useTheme();
  const { colors, spacing, borderRadius } = theme;
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
      <View
        style={{
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surfaceSunken,
        }}
      >
        <Ionicons name={icon} size={26} color={colors.textTertiary} />
      </View>
      <Text variant="subheading" tone="secondary">
        {title}
      </Text>
      {message ? (
        <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', maxWidth: 280 }}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <Text
          variant="label"
          tone="primary-accent"
          onPress={action.onPress}
          accessibilityRole="button"
          style={{ paddingVertical: spacing.sm }}
        >
          {action.label}
        </Text>
      ) : null}
    </View>
  );
};
