import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Card,
  DateTimeField,
  Screen,
  ScreenHeader,
  SelectField,
  Text,
  TextField,
  useTheme,
} from '@prehospital-epr/ui';
import {
  FORM_SECTIONS,
  getFormSections,
  getValueSetForElement,
  validatePatientReportFormData,
  type FormElementConfig,
} from '@prehospital-epr/nemsis';
import type { AppDispatch, RootState } from '../store';
import { createEncounter, setActiveEncounter, setCurrentEncounter } from '../store/encounterSlice';
import { createPatient, setCurrentPatient } from '../store/patientSlice';
import { demographicsFrom, type FormData } from '../utils/nemsis-demographics';
import { ENCOUNTER_STATUS_LABELS, formatClock, formatTimeOfDay } from '../utils/format';

const EMPTY: FormData = FORM_SECTIONS.reduce<FormData>((acc, sectionId) => {
  acc[sectionId] = {};
  return acc;
}, {});

const CONTROL_LABEL: Record<string, string> = {
  textarea: 'Narrative',
  datetime: 'Timestamp',
  date: 'Date',
  number: 'Numeric',
  multiselect: 'Multi-select',
  radio: 'Single choice',
  select: 'Coded list',
  gps: 'Location',
  text: 'Free text',
};

export const PatientReportScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const patient = useSelector((state: RootState) => state.patient.currentPatient);
  const encounter = useSelector((state: RootState) => state.encounter.currentEncounter);

  const sections = useMemo(() => getFormSections(), []);
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? 'ePatient');
  const [formData, setFormData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const current = useMemo(
    () => sections.find(section => section.id === activeSection) ?? sections[0],
    [sections, activeSection]
  );

  /**
   * Validation returns human readable messages; map them back onto element
   * codes so the error renders next to the field that produced it.
   */
  const errorsByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const message of errors) {
      const match = /\(([A-Za-z]+\.\d+)\)\s*$/.exec(message);
      if (match?.[1]) map[match[1]] = message;
    }
    return map;
  }, [errors]);

  const completion = useMemo(() => {
    const all = sections.flatMap(section => section.elements);
    const answered = all.filter(element => {
      const value = formData[element.sectionId]?.[element.code];
      return typeof value === 'string' && value.trim() !== '';
    });
    const required = all.filter(element => element.required);
    const answeredRequired = required.filter(element => {
      const value = formData[element.sectionId]?.[element.code];
      return typeof value === 'string' && value.trim() !== '';
    });
    return {
      total: all.length,
      answered: answered.length,
      requiredTotal: required.length,
      requiredAnswered: answeredRequired.length,
    };
  }, [sections, formData]);

  const setValue = useCallback((sectionId: string, code: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [code]: value },
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const found = validatePatientReportFormData(formData);
    setErrors(found);
    if (found.length > 0) {
      // Jump to the first section that still has a problem.
      const firstCode = /\(([A-Za-z]+\.\d+)\)/.exec(found[0] ?? '')?.[1];
      const owner = sections.find(section =>
        section.elements.some(element => element.code === firstCode)
      );
      if (owner) setActiveSection(owner.id);
      return;
    }
    setSubmitted(true);

    // A completed report must never be orphaned: ensure both the patient and
    // the encounter it documents exist, seeding demographics from ePatient.
    let patientId = patient?.id;
    if (!patientId) {
      const created = await dispatch(createPatient(demographicsFrom(formData)));
      if (createPatient.fulfilled.match(created)) {
        patientId = created.payload.id;
        dispatch(setCurrentPatient(created.payload));
      }
    }

    if (!encounter && patientId) {
      const createdEncounter = await dispatch(
        createEncounter({
          status: 'in-progress',
          class: 'emergency',
          subject: { reference: `Patient/${patientId}` },
          period: { start: new Date().toISOString() },
        })
      );
      if (createEncounter.fulfilled.match(createdEncounter)) {
        dispatch(setCurrentEncounter(createdEncounter.payload));
        dispatch(setActiveEncounter(createdEncounter.payload.id));
      }
    }
  }, [dispatch, formData, patient, encounter, sections]);

  if (!current) {
    return (
      <Screen>
        <ScreenHeader title="Patient report" />
        <Card>
          <Text variant="body" tone="tertiary">
            The NEMSIS dictionary did not return any form sections.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Patient report"
        subtitle="NEMSIS v3 prehospital care report"
        accessory={<Badge label={submitted ? 'Submitted' : 'Draft'} tone={submitted ? 'success' : 'warning'} dot />}
      />

      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
            }}
          >
            <Text variant="label" tone="secondary">
              {encounter ? 'Linked encounter' : 'No encounter yet'}
            </Text>
            <Text variant="label" tone={encounter ? 'primary-accent' : 'tertiary'}>
              {encounter
                ? `${ENCOUNTER_STATUS_LABELS[encounter.status]} · ${formatClock(encounter.period?.start)}`
                : 'Created on submit'}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.colors.surfaceSunken,
              overflow: 'hidden',
            }}
            accessibilityRole="progressbar"
            accessibilityValue={{
              now: completion.requiredAnswered,
              min: 0,
              max: completion.requiredTotal,
            }}
          >
            <View
              style={{
                width: `${
                  completion.requiredTotal === 0
                    ? 0
                    : (completion.requiredAnswered / completion.requiredTotal) * 100
                }%`,
                height: '100%',
                backgroundColor:
                  completion.requiredAnswered === completion.requiredTotal
                    ? theme.colors.success
                    : theme.colors.primary,
              }}
            />
          </View>
          <Text variant="caption" tone="tertiary">
            {completion.requiredAnswered}/{completion.requiredTotal} required ·{' '}
            {completion.answered}/{completion.total} elements completed · {formatTimeOfDay()}
          </Text>
        </View>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.lg }}
      >
        {sections.map(section => {
          const active = section.id === activeSection;
          return (
            <Button
              key={section.id}
              label={section.name}
              size="sm"
              variant={active ? 'primary' : 'secondary'}
              onPress={() => setActiveSection(section.id)}
            />
          );
        })}
      </ScrollView>

      <Card>
        <View style={{ marginBottom: theme.spacing.lg, gap: 2 }}>
          <Text variant="heading">{current.name}</Text>
          {current.description ? (
            <Text variant="caption" tone="tertiary">
              {current.description}
            </Text>
          ) : null}
        </View>

        {current.elements.map(element => (
          <NemsisField
            key={element.code}
            element={element}
            value={formData[current.id]?.[element.code] ?? ''}
            error={errorsByCode[element.code]}
            onChange={value => setValue(current.id, element.code, value)}
          />
        ))}
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label="Submit report"
          onPress={handleSubmit}
          fullWidth
          size="lg"
          icon="checkmark-done"
        />
        {errors.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.warningSurface,
            }}
            accessibilityLiveRegion="polite"
          >
            <Text variant="caption" tone="abnormal" style={{ flex: 1 }}>
              {errors.length} required field{errors.length === 1 ? '' : 's'} still to complete.
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
};

interface FieldProps {
  element: FormElementConfig;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const NemsisField: React.FC<FieldProps> = ({ element, value, error, onChange }) => {
  const valueSet = useMemo(
    () => getValueSetForElement(element as never),
    [element]
  );

  const options = useMemo(
    () =>
      (valueSet?.values ?? []).map(option => ({
        value: option.code,
        label: option.label,
      })),
    [valueSet]
  );

  const help = element.definition
    ? element.definition.length > 140
      ? `${element.definition.slice(0, 140)}…`
      : element.definition
    : undefined;

  const hint = CONTROL_LABEL[element.controlType];

  const label = `${element.name} (${element.code})`;

  switch (element.controlType) {
    case 'select':
    case 'radio':
    case 'multiselect':
      return (
        <SelectField
          label={label}
          required={element.required}
          hint={hint}
          help={help}
          error={error}
          value={value}
          options={options}
          onChange={onChange}
        />
      );
    case 'datetime':
      return (
        <DateTimeField
          label={label}
          required={element.required}
          hint={hint}
          help={help}
          error={error}
          value={value || undefined}
          onChange={onChange}
        />
      );
    case 'date':
      return (
        <DateTimeField
          label={label}
          required={element.required}
          hint={hint}
          help={help}
          error={error}
          value={value || undefined}
          onChange={onChange}
          dateOnly
        />
      );
    case 'textarea':
      return (
        <TextField
          label={label}
          required={element.required}
          hint={hint}
          help={help}
          error={error}
          value={value}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
          placeholder="Enter narrative…"
        />
      );
    case 'number':
      return (
        <TextField
          label={label}
          required={element.required}
          hint={hint}
          help={help}
          error={error}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
        />
      );
    default:
      return (
        <TextField
          label={label}
          required={element.required}
          hint={hint}
          help={help}
          error={error}
          value={value}
          onChangeText={onChange}
        />
      );
  }
};
