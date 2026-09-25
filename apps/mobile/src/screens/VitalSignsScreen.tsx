import React, { useCallback, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useTheme,
  type Tone,
} from '@prehospital-epr/ui';
import {
  assessVitalSignsSet,
  calculateGcs,
  toQuantity,
  worstVitalLevel,
  type AbnormalityLevel,
  type GcsComponents,
  type VitalSignKey,
} from '@prehospital-epr/clinical';
import { AppDispatch, RootState } from '../store';
import { recordVitalSigns } from '../store/observationSlice';
import { formatClock, formatDate, patientAgeYears } from '../utils/format';

const VITALS_FIELDS: Array<{ key: VitalSignKey; label: string; unit: string }> = [
  { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg' },
  { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
  { key: 'respiratoryRate', label: 'Respiratory Rate', unit: '/min' },
  { key: 'spo2', label: 'SpO₂', unit: '%' },
  { key: 'etco2', label: 'EtCO₂', unit: 'mmHg' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL' },
];

const GCS_FIELDS: Array<{ key: keyof GcsComponents; label: string; max: number }> = [
  { key: 'eye', label: 'Eye', max: 4 },
  { key: 'verbal', label: 'Verbal', max: 5 },
  { key: 'motor', label: 'Motor', max: 6 },
];

const LEVEL_TONES: Record<AbnormalityLevel, Tone> = {
  critical: 'critical',
  abnormal: 'warning',
  normal: 'success',
  unknown: 'neutral',
};

const LEVEL_LABELS: Record<AbnormalityLevel, string> = {
  critical: 'Critical',
  abnormal: 'Abnormal',
  normal: 'Normal',
  unknown: 'Unknown',
};

/** GCS component scales, mirrored here so the labels stay local to the screen. */
const GCS_COMPONENT_MAX: Record<keyof GcsComponents, number> = { eye: 4, verbal: 5, motor: 6 };

export const VitalSignsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { currentVitalSigns, vitalSigns } = useSelector(
    (state: RootState) => state.observation
  );
  const patient = useSelector((state: RootState) => state.patient.currentPatient);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [gcs, setGcs] = useState<Record<keyof GcsComponents, string>>({
    eye: '',
    verbal: '',
    motor: '',
  });

  // Paediatric ranges differ, so the thresholds are resolved against the age.
  const ageYears = useMemo(() => patientAgeYears(patient) ?? 30, [patient]);

  const latestAssessment = useMemo(
    () => (currentVitalSigns ? assessVitalSignsSet(currentVitalSigns, ageYears) : []),
    [currentVitalSigns, ageYears]
  );

  const latestLevel = useMemo(
    () => (latestAssessment.length > 0 ? worstVitalLevel(latestAssessment) : 'unknown'),
    [latestAssessment]
  );

  const gcsTotal = useMemo(() => {
    const values = Object.entries(gcs) as Array<[keyof GcsComponents, string]>;
    if (values.some(([, value]) => value.trim() === '')) return null;
    try {
      return calculateGcs({
        eye: Number(gcs.eye),
        verbal: Number(gcs.verbal),
        motor: Number(gcs.motor),
      });
    } catch {
      return null;
    }
  }, [gcs]);

  const gcsOutOfRange = useMemo(
    () =>
      (Object.entries(gcs) as Array<[keyof GcsComponents, string]>).some(
        ([key, value]) => value !== '' && Number(value) > GCS_COMPONENT_MAX[key]
      ),
    [gcs]
  );

  const hasInput = useMemo(
    () => Object.values(formData).some(value => value.trim() !== '') || gcsTotal !== null,
    [formData, gcsTotal]
  );

  const handleSave = useCallback(() => {
    // Build a FHIR `VitalSignsSet`: each reading is a Quantity carrying a UCUM
    // system and code, not a bare number.
    const set: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
    };

    for (const field of VITALS_FIELDS) {
      const raw = formData[field.key];
      if (raw === undefined || raw.trim() === '') continue;
      const value = Number(raw);
      if (Number.isNaN(value)) continue;
      set[field.key] = toQuantity(field.key, value);
    }

    if (gcsTotal !== null) {
      set.gcs = {
        eye: Number(gcs.eye),
        verbal: Number(gcs.verbal),
        motor: Number(gcs.motor),
        total: gcsTotal,
      };
    }

    if (Object.keys(set).length === 1) return; // nothing entered

    dispatch(recordVitalSigns(set as never));
    setFormData({});
    setGcs({ eye: '', verbal: '', motor: '' });
  }, [dispatch, formData, gcs, gcsTotal]);

  const history = useMemo(() => vitalSigns.slice().reverse(), [vitalSigns]);

  return (
    <Screen>
      <ScreenHeader
        title="Vital Signs"
        subtitle={
          patient
            ? `Reference ranges for ${patientAgeYears(patient) ?? 'adult'} year old`
            : 'No patient selected'
        }
        accessory={
          latestAssessment.length > 0 ? (
            <Badge
              label={LEVEL_LABELS[latestLevel]}
              tone={LEVEL_TONES[latestLevel]}
              dot
            />
          ) : undefined
        }
      />

      {latestAssessment.length > 0 ? (
        <Card padded={false}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Text variant="caption" tone="tertiary">
              LATEST SET · {formatClock(currentVitalSigns?.timestamp)}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.md,
              }}
            >
              {latestAssessment.map(assessment => (
                <View
                  key={assessment.key}
                  style={{
                    minWidth: 96,
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.surfaceSunken,
                    borderLeftWidth: 3,
                    borderLeftColor: theme.colors.vitals[assessment.level],
                    gap: 2,
                  }}
                >
                  <Text variant="caption" tone="tertiary">
                    {assessment.label}
                  </Text>
                  <Text
                    variant="heading"
                    style={{ color: theme.colors.vitals[assessment.level] }}
                  >
                    {assessment.value}
                    <Text variant="caption" tone="tertiary">
                      {' '}
                      {assessment.unit}
                    </Text>
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {assessment.reference.low}–{assessment.reference.high}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primarySurface,
            }}
          >
            <Ionicons name="pulse-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading">New observation set</Text>
            <Text variant="caption" tone="tertiary">
              All fields are optional
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -theme.spacing.xs,
          }}
        >
          {VITALS_FIELDS.map(field => (
            <View
              key={field.key}
              style={{ width: '50%', paddingHorizontal: theme.spacing.xs }}
            >
              <Text variant="label" tone="tertiary" style={{ marginBottom: 2 }}>
                {field.label}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.surfaceSunken,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingHorizontal: theme.spacing.sm,
                  marginBottom: theme.spacing.md,
                }}
              >
                <VitalInput
                  value={formData[field.key] ?? ''}
                  onChange={value =>
                    setFormData(prev => ({ ...prev, [field.key]: value }))
                  }
                />
                <Text variant="caption" tone="tertiary">
                  {field.unit}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Divider />

        <View style={{ marginTop: theme.spacing.lg }}>
          <Text variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
            GCS
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
            {GCS_FIELDS.map(field => (
              <View key={field.key} style={{ flex: 1 }}>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ textAlign: 'center', marginBottom: 2 }}
                >
                  {field.label} (max {field.max})
                </Text>
                <View
                  style={{
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.surfaceSunken,
                    borderWidth: 1,
                    borderColor: gcsOutOfRange ? theme.colors.error : theme.colors.border,
                  }}
                >
                  <VitalInput
                    value={gcs[field.key]}
                    onChange={value => setGcs(prev => ({ ...prev, [field.key]: value }))}
                    maxLength={1}
                    align="center"
                  />
                </View>
              </View>
            ))}
            <View
              style={{
                width: 72,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.primarySurface,
              }}
            >
              <Text variant="heading" tone="primary-accent">
                {gcsTotal ?? '—'}
              </Text>
              <Text variant="caption" tone="tertiary">
                Total
              </Text>
            </View>
          </View>
          {gcsOutOfRange ? (
            <Text variant="caption" tone="critical" style={{ marginTop: theme.spacing.xs }}>
              A GCS component exceeds its maximum.
            </Text>
          ) : null}
        </View>

        <Button
          label="Save vital signs"
          onPress={handleSave}
          disabled={!hasInput || gcsOutOfRange}
          fullWidth
          size="lg"
          icon="checkmark"
          style={{ marginTop: theme.spacing.xl }}
        />
      </Card>

      <Section title="History" meta={`${vitalSigns.length} sets`}>
        <Card padded={false}>
          {history.length === 0 ? (
            <EmptyState
              icon="stats-chart-outline"
              title="No observations recorded"
              message="Saved sets are kept on the device and sync when connectivity returns."
            />
          ) : (
            history.map((set, index) => {
              const assessment = assessVitalSignsSet(set, ageYears);
              const level = worstVitalLevel(assessment);
              return (
                <View key={set.id ?? `${set.timestamp}-${index}`}>
                  {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      padding: theme.spacing.lg,
                    }}
                  >
                    <View style={{ width: 64 }}>
                      <Text variant="subheading">{formatClock(set.timestamp)}</Text>
                      <Text variant="caption" tone="tertiary">
                        {formatDate(set.timestamp)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                      {assessment.map(item => (
                        <Text
                          key={item.key}
                          variant="caption"
                          style={{ color: theme.colors.vitals[item.level] }}
                        >
                          {item.label} {item.value}
                        </Text>
                      ))}
                      {set.gcs ? (
                        <Text variant="caption" tone="secondary">
                          GCS {set.gcs.total}
                        </Text>
                      ) : null}
                    </View>
                    {assessment.length > 0 ? (
                      <Badge label={LEVEL_LABELS[level]} tone={LEVEL_TONES[level]} />
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </Section>
    </Screen>
  );
};

interface VitalInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  align?: 'left' | 'center';
}

/** Thin wrapper so each numeric cell can stay keyboard-only. */
const VitalInput: React.FC<VitalInputProps> = ({ value, onChange, maxLength, align = 'left' }) => {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      maxLength={maxLength}
      placeholder="—"
      placeholderTextColor={theme.colors.textTertiary}
      accessibilityLabel="Value"
      style={{
        flex: 1,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.systemFont,
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.semibold,
        textAlign: align,
        paddingVertical: theme.spacing.sm,
        minWidth: 0,
      }}
    />
  );
};
