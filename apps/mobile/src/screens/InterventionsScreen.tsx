import React, { useCallback, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  SelectField,
  Text,
  TextField,
  useTheme,
} from '@prehospital-epr/ui';
import type {
  MedicationAdministrationCategory,
  ProcedureCategory,
  Route,
} from '@prehospital-epr/core';
import type { AppDispatch, RootState } from '../store';
import {
  MEDICATION_CATEGORIES,
  PROCEDURE_CATEGORIES,
  ROUTES,
  recordMedication,
  recordProcedure,
  removeMedication,
  removeProcedure,
} from '../store/interventionSlice';
import { formatClock } from '../utils/format';

type Mode = 'medication' | 'procedure';

export const InterventionsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { medications, procedures } = useSelector((state: RootState) => state.intervention);

  const [mode, setMode] = useState<Mode>('medication');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState<Route>('IV');
  const [medCategory, setMedCategory] = useState<MedicationAdministrationCategory>('emergency');
  const [procCategory, setProcCategory] = useState<ProcedureCategory>('airway');
  const [error, setError] = useState<string | undefined>();

  const total = medications.length + procedures.length;

  const row = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  } as const;

  const sheet = {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  } as const;

  const close = useCallback(() => {
    setSheetOpen(false);
    setName('');
    setDose('');
    setError(undefined);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(mode === 'medication' ? 'Enter the medication given.' : 'Enter the procedure performed.');
      return;
    }

    const subject = { reference: 'Patient/current' };
    const now = new Date().toISOString();

    if (mode === 'medication') {
      const amount = dose.trim() ? Number(dose) : undefined;
      if (dose.trim() && (amount === undefined || Number.isNaN(amount))) {
        setError('Dose must be a number.');
        return;
      }
      await dispatch(
        recordMedication({
          medicationCodeableConcept: { text: trimmed },
          category: [{ text: MEDICATION_CATEGORIES.find(c => c.value === medCategory)?.label ?? '' }],
          subject,
          effectiveDateTime: now,
          dosage: {
            text: [amount === undefined ? undefined : `${amount}`, route].filter(Boolean).join(' '),
            route: { text: route },
            ...(amount === undefined
              ? {}
              : { dose: { value: amount, unit: 'mg', system: 'http://unitsofmeasure.org' } }),
          },
        })
      );
    } else {
      await dispatch(
        recordProcedure({
          code: { text: trimmed },
          category: {
            text: PROCEDURE_CATEGORIES.find(c => c.value === procCategory)?.label ?? '',
          },
          subject,
          performedDateTime: now,
        })
      );
    }
    close();
  }, [dispatch, mode, name, dose, route, medCategory, procCategory, close]);

  const switchMode = useCallback((next: Mode) => setMode(next), []);

  return (
    <Screen>
      <ScreenHeader
        title="Interventions"
        subtitle="Treatments and procedures given on this encounter"
        accessory={
          <Button
            label="Record"
            icon="add"
            size="sm"
            onPress={() => setSheetOpen(true)}
          />
        }
      />

      <SegmentedControl
        value={mode}
        options={[
          { value: 'medication', label: `Medications (${medications.length})` },
          { value: 'procedure', label: `Procedures (${procedures.length})` },
        ]}
        onChange={switchMode}
      />

      <Card padded={false}>
        {total === 0 ? (
          <EmptyState
            icon="medkit-outline"
            title="Nothing recorded yet"
            message="Record medications and procedures as you perform them. They are carried into the handoff automatically."
            action={{ label: 'Record intervention', onPress: () => setSheetOpen(true) }}
          />
        ) : mode === 'medication' ? (
          medications.length === 0 ? (
            <EmptyState icon="medkit-outline" title="No medications" />
          ) : (
            medications.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                <View style={row}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="subheading" numberOfLines={1}>
                      {item.medicationCodeableConcept?.text ?? 'Medication'}
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {[
                        item.dosage?.text,
                        item.category?.[0]?.text,
                        item.effectiveDateTime ? formatClock(item.effectiveDateTime) : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <IconButton
                    icon="trash-outline"
                    label="Remove medication"
                    size={17}
                    tone="critical"
                    onPress={() => dispatch(removeMedication(item.id))}
                  />
                </View>
              </View>
            ))
          )
        ) : procedures.length === 0 ? (
          <EmptyState icon="cut-outline" title="No procedures" />
        ) : (
          procedures.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
              <View style={row}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="subheading" numberOfLines={1}>
                    {item.code?.text ?? 'Procedure'}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {[
                      item.category?.text,
                      item.performedDateTime ? formatClock(item.performedDateTime) : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <IconButton
                  icon="trash-outline"
                  label="Remove procedure"
                  size={17}
                  tone="critical"
                  onPress={() => dispatch(removeProcedure(item.id))}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Dismiss" />
          <View style={sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="heading">Record intervention</Text>
              <IconButton icon="close" label="Close" onPress={close} />
            </View>

            <SegmentedControl
              value={mode}
              options={[
                { value: 'medication', label: 'Medication' },
                { value: 'procedure', label: 'Procedure' },
              ]}
              onChange={switchMode}
            />

            <TextField
              label={mode === 'medication' ? 'Medication' : 'Procedure'}
              required
              value={name}
              onChangeText={value => {
                setName(value);
                if (error) setError(undefined);
              }}
              placeholder={mode === 'medication' ? 'e.g. Adrenaline' : 'e.g. Cricoid pressure'}
              error={error}
            />

            {mode === 'medication' ? (
              <>
                <TextField
                  label="Dose (mg)"
                  value={dose}
                  onChangeText={setDose}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 0.5"
                />
                <SelectField
                  label="Route"
                  value={route}
                  onChange={value => setRoute(value as Route)}
                  options={ROUTES.map(item => ({ value: item, label: item }))}
                />
                <SelectField
                  label="Category"
                  value={medCategory}
                  onChange={value => setMedCategory(value as MedicationAdministrationCategory)}
                  options={MEDICATION_CATEGORIES.map(item => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
              </>
            ) : (
              <SelectField
                label="Category"
                value={procCategory}
                onChange={value => setProcCategory(value as ProcedureCategory)}
                options={PROCEDURE_CATEGORIES.map(item => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            )}

            <Button label="Save" onPress={handleSave} fullWidth size="lg" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};
