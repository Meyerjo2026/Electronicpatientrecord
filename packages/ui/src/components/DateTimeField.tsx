import React, { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-context';
import { Text } from './primitives';
import { ControlFrame, Field } from './fields';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Relative offsets, phrased the way crews talk on scene. NEMSIS time fields
 * are overwhelmingly "now" or a few minutes either side of it, so these cover
 * the common cases without a calendar.
 */
const PRESETS: Array<{ label: string; ms: number | null }> = [
  { label: 'Now', ms: 0 },
  { label: '5 min ago', ms: -5 * MINUTE },
  { label: '10 min ago', ms: -10 * MINUTE },
  { label: '15 min ago', ms: -15 * MINUTE },
  { label: '30 min ago', ms: -30 * MINUTE },
  { label: '1 hour ago', ms: -HOUR },
  { label: '2 hours ago', ms: -2 * HOUR },
  { label: 'On arrival', ms: -10 * MINUTE },
  { label: 'At handover', ms: null },
];

export interface DateTimeFieldProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  hint?: string;
  /** ISO-8601 timestamp. */
  value?: string;
  onChange: (iso: string) => void;
  /** Only the date portion is meaningful for this field. */
  dateOnly?: boolean;
  disabled?: boolean;
}

const toLocalInput = (iso: string | undefined, dateOnly: boolean): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (dateOnly) return day;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInput = (input: string, dateOnly: boolean): string | null => {
  if (!input.trim()) return null;
  // A bare date is anchored to the start of that day.
  const parsed = dateOnly ? new Date(`${input}T00:00:00`) : new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const formatDisplay = (iso: string | undefined, dateOnly: boolean): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (dateOnly) {
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return `${date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} ${date.toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' }
  )}`;
};

/**
 * Timestamp capture without a native picker dependency.
 *
 * Offers relative presets for the common case and falls back to typed
 * `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` entry, which round-trips through
 * `Date` without timezone surprises.
 */
export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  required,
  help,
  error,
  hint,
  value,
  onChange,
  dateOnly = false,
  disabled = false,
}) => {
  const theme = useTheme();
  const { colors, spacing, borderRadius, elevation, typography } = theme;
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => toLocalInput(value, dateOnly));

  React.useEffect(() => {
    if (!open) setDraft(toLocalInput(value, dateOnly));
  }, [open, value, dateOnly]);

  const close = () => setOpen(false);

  const applyPreset = (ms: number | null) => {
    if (ms === null) return; // placeholder preset, no timestamp to apply
    onChange(new Date(Date.now() + ms).toISOString());
    setDraft(toLocalInput(new Date(Date.now() + ms).toISOString(), dateOnly));
    close();
  };

  const commitDraft = () => {
    const iso = fromLocalInput(draft, dateOnly);
    if (iso) onChange(iso);
    close();
  };

  const display = useMemo(() => formatDisplay(value, dateOnly), [value, dateOnly]);

  return (
    <Field label={label} required={required} help={help} error={error} hint={hint}>
      <ControlFrame invalid={Boolean(error)} onPress={disabled ? undefined : () => setOpen(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="time-outline" size={17} color={colors.textTertiary} />
          <Text
            variant="body"
            tone={display ? 'primary' : 'tertiary'}
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {display || (dateOnly ? 'Select date…' : 'Select time…')}
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
                backgroundColor: colors.surfaceElevated,
                borderTopLeftRadius: borderRadius.xl,
                borderTopRightRadius: borderRadius.xl,
                padding: spacing.lg,
                gap: spacing.lg,
              },
              elevation.lg,
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="heading">{label}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {!dateOnly ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {PRESETS.filter(preset => preset.ms !== null).map(preset => {
                  const iso = new Date(Date.now() + (preset.ms as number)).toISOString();
                  const active = value === iso;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => applyPreset(preset.ms)}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.full,
                        backgroundColor: pressed ? colors.fillStrong : colors.surfaceSunken,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: active ? colors.primary : colors.border,
                      })}
                    >
                      <Text variant="label" tone={active ? 'primary-accent' : 'secondary'}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View>
              <Text variant="caption" tone="tertiary" style={{ marginBottom: spacing.xs }}>
                {dateOnly ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm'}
              </Text>
              <ControlFrame>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  autoCorrect={false}
                  placeholder={dateOnly ? '2026-01-31' : '2026-01-31T14:05'}
                  placeholderTextColor={colors.textTertiary}
                  accessibilityLabel={label}
                  style={{
                    color: colors.textPrimary,
                    fontFamily: typography.monoFont,
                    fontSize: typography.sizes.md,
                    paddingVertical: spacing.sm,
                  }}
                />
              </ControlFrame>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text
                  variant="label"
                  tone="primary-accent"
                  onPress={commitDraft}
                  style={{ paddingVertical: spacing.md, textAlign: 'center' }}
                >
                  Set
                </Text>
              </View>
              {value ? (
                <View style={{ flex: 1 }}>
                  <Text
                    variant="label"
                    tone="tertiary"
                    onPress={() => {
                      onChange('');
                      close();
                    }}
                    style={{ paddingVertical: spacing.md, textAlign: 'center' }}
                  >
                    Clear
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </Field>
  );
};
