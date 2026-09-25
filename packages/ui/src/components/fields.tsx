import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-context';
import { Text } from './primitives';

export interface FieldProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
  /** Rendered on the label row, e.g. a "List" marker for coded fields. */
  hint?: string;
}

/**
 * Shared chrome for every form control: label, optional helper text and an
 * error message. Errors are announced rather than only coloured.
 */
export const Field: React.FC<FieldProps> = ({ label, required, help, error, hint, children }) => {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xs + 2,
          gap: spacing.sm,
        }}
      >
        <Text variant="label" tone="secondary" style={{ flexShrink: 1 }}>
          {label}
          {required ? (
            <Text variant="label" tone="critical">
              {'  *'}
            </Text>
          ) : null}
        </Text>
        {hint ? (
          <Text variant="caption" tone="tertiary">
            {hint}
          </Text>
        ) : null}
      </View>

      {children}

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.xs + 2,
          }}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="alert-circle" size={13} color={colors.error} />
          <Text variant="caption" tone="critical" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : help ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.xs + 2 }}>
          {help}
        </Text>
      ) : null}
    </View>
  );
};

interface ControlFrameProps {
  invalid?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  multiline?: boolean;
  minHeight?: number;
}

export const ControlFrame: React.FC<ControlFrameProps> = ({
  invalid,
  children,
  onPress,
  multiline,
  minHeight,
}) => {
  const theme = useTheme();
  const { colors, borderRadius, spacing } = theme;

  const frame = {
    minHeight: minHeight ?? theme.layout.controlHeight,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: invalid ? colors.error : colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: multiline ? spacing.md : spacing.sm,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [frame, pressed ? { opacity: 0.7 } : null]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={frame}>{children}</View>;
};

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  hint?: string;
  /** Trailing unit label, e.g. `mmHg`. */
  unit?: string;
  /** Text shown when the field is empty and unfocused. */
  placeholder?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  required,
  help,
  error,
  hint,
  unit,
  placeholder,
  onFocus,
  onBlur,
  ...rest
}) => {
  const theme = useTheme();
  const { colors, typography, spacing } = theme;

  return (
    <Field label={label} required={required} help={help} error={error} hint={hint}>
      <ControlFrame invalid={Boolean(error)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            {...rest}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel={label}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontFamily: typography.systemFont,
              fontSize: typography.sizes.md,
              paddingVertical: spacing.sm,
            }}
          />
          {unit ? (
            <Text variant="caption" tone="tertiary" style={{ marginLeft: spacing.sm }}>
              {unit}
            </Text>
          ) : null}
        </View>
      </ControlFrame>
    </Field>
  );
};

export interface SelectOption {
  value: string;
  label: string;
  /** Optional secondary line, e.g. a SNOMED description. */
  description?: string;
}

export interface SelectFieldProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  hint?: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show a search box once the option list exceeds this length. */
  searchThreshold?: number;
  disabled?: boolean;
}

/**
 * Modal picker for coded fields. Coded lists in NEMSIS run to dozens of
 * entries, so the list is searchable past a threshold and each option is a
 * full-width tap target.
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  required,
  help,
  error,
  hint,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchThreshold = 8,
  disabled = false,
}) => {
  const theme = useTheme();
  const { colors, spacing, borderRadius, elevation } = theme;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selected = options.find(option => option.value === value);
  const showSearch = options.length > searchThreshold;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      option =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q) ||
        (option.description ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <Field label={label} required={required} help={help} error={error} hint={hint}>
      <ControlFrame
        invalid={Boolean(error)}
        onPress={disabled ? undefined : () => setOpen(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text
            variant="body"
            tone={selected ? 'primary' : 'tertiary'}
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {selected ? selected.label : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
        </View>
      </ControlFrame>

      {open ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: theme.zIndex.modal }]}>
          <Pressable
            style={{ flex: 1, backgroundColor: colors.scrim }}
            onPress={close}
            accessibilityLabel="Dismiss"
          />
          <View
            style={[
              {
                maxHeight: '75%',
                backgroundColor: colors.surfaceElevated,
                borderTopLeftRadius: borderRadius.xl,
                borderTopRightRadius: borderRadius.xl,
                paddingBottom: spacing.xl,
              },
              elevation.lg,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.lg,
                paddingBottom: spacing.md,
              }}
            >
              <Text variant="heading">{label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {showSearch ? (
              <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
                <ControlFrame>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Ionicons name="search" size={15} color={colors.textTertiary} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search…"
                      placeholderTextColor={colors.textTertiary}
                      autoCorrect={false}
                      accessibilityLabel={`Search ${label}`}
                      style={{
                        flex: 1,
                        color: colors.textPrimary,
                        fontSize: theme.typography.sizes.md,
                        paddingVertical: spacing.xs,
                      }}
                    />
                  </View>
                </ControlFrame>
              </View>
            ) : null}

            <ScrollView
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: spacing.sm }}
            >
              {filtered.length === 0 ? (
                <Text variant="body" tone="tertiary" style={{ padding: spacing.lg }}>
                  No matching options
                </Text>
              ) : (
                filtered.map(option => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        onChange(option.value);
                        close();
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.md,
                        borderRadius: borderRadius.md,
                        backgroundColor: pressed ? colors.fill : 'transparent',
                      })}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={19}
                        color={isSelected ? colors.primary : colors.textTertiary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="body" tone={isSelected ? 'primary-accent' : 'primary'}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text variant="caption" tone="tertiary">
                            {option.description}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </Field>
  );
};

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label?: string;
  value?: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const { colors, borderRadius, spacing, elevation } = theme;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text variant="label" tone="secondary" style={{ marginBottom: spacing.xs + 2 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceSunken,
          borderRadius: borderRadius.md,
          padding: 3,
          gap: 3,
        }}
      >
        {options.map(option => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: theme.layout.minTouchTarget - 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: spacing.sm,
                  borderRadius: borderRadius.sm,
                  backgroundColor: active ? colors.surface : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
                active ? elevation.none : null,
              ]}
            >
              <Text
                variant="label"
                numberOfLines={1}
                style={{ color: active ? colors.primary : colors.textSecondary }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
