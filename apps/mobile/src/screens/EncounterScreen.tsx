import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
} from '@prehospital-epr/ui';
import { assessVitalSignsSet, worstVitalLevel } from '@prehospital-epr/clinical';
import { AppDispatch, RootState } from '../store';
import { updateEncounterStatus } from '../store/encounterSlice';
import type { MainStackParamList } from '../navigation/AppNavigator';
import {
  ENCOUNTER_PRIORITY_TONES,
  ENCOUNTER_STATUS_LABELS,
  formatClock,
  formatDate,
  formatDuration,
  nextEncounterStatus,
  patientAgeLabel,
  patientDisplayName,
  patientMrn,
} from '../utils/format';

type Nav = NativeStackNavigationProp<MainStackParamList>;

/** The prehospital sequence, rendered as a progress tracker. */
const TRACKER: Array<{ status: string; label: string }> = [
  { status: 'arrived', label: 'Arrived' },
  { status: 'triaged', label: 'Triaged' },
  { status: 'on-scene', label: 'On scene' },
  { status: 'in-transit', label: 'Transit' },
  { status: 'at-destination', label: 'Arrived' },
  { status: 'finished', label: 'Handover' },
];

const ACTIONS = [
  { key: 'vitals', label: 'Vital Signs', icon: 'pulse-outline' },
  { key: 'medications', label: 'Medications', icon: 'medkit-outline' },
  { key: 'procedures', label: 'Procedures', icon: 'cut-outline' },
  { key: 'notes', label: 'Notes', icon: 'create-outline' },
  { key: 'handoff', label: 'Handoff', icon: 'swap-horizontal-outline' },
  { key: 'report', label: 'PCR', icon: 'document-text-outline' },
] as const;

export const EncounterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();

  const currentEncounter = useSelector((state: RootState) => state.encounter.currentEncounter);
  const currentPatient = useSelector((state: RootState) => state.patient.currentPatient);
  const vitalSigns = useSelector((state: RootState) => state.observation.vitalSigns);

  const latest = vitalSigns[0];
  const latestAssessment = useMemo(
    () => (latest ? assessVitalSignsSet(latest) : []),
    [latest]
  );
  const latestLevel = useMemo(
    () => (latestAssessment.length ? worstVitalLevel(latestAssessment) : 'unknown'),
    [latestAssessment]
  );

  const upcoming = useMemo(
    () => (currentEncounter ? nextEncounterStatus(currentEncounter.status) : null),
    [currentEncounter]
  );

  const trackerIndex = useMemo(() => {
    if (!currentEncounter) return -1;
    return TRACKER.findIndex(step => step.status === currentEncounter.status);
  }, [currentEncounter]);

  const handleAdvance = useCallback(() => {
    if (!currentEncounter || !upcoming) return;
    dispatch(
      updateEncounterStatus({ encounterId: currentEncounter.id, status: upcoming })
    );
  }, [dispatch, currentEncounter, upcoming]);

  const handleAction = useCallback(
    (key: (typeof ACTIONS)[number]['key']) => {
      const encounterId = currentEncounter?.id ?? '';
      switch (key) {
        case 'vitals':
          return navigation.navigate('VitalSignsDetail', { encounterId });
        case 'medications':
        case 'procedures':
        case 'notes':
          return navigation.navigate('Interventions', { encounterId });
        case 'handoff':
          return navigation.navigate('Handoff', { encounterId });
        case 'report':
          return navigation.navigate('PatientReport', { encounterId });
      }
    },
    [navigation, currentEncounter?.id]
  );

  if (!currentEncounter) {
    return (
      <Screen>
        <ScreenHeader title="Encounter" />
        <Card>
          <EmptyState
            icon="pulse-outline"
            title="No active encounter"
            message="An encounter is created when you accept a job or start one from the dashboard."
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={patientDisplayName(currentPatient)}
        subtitle={`${patientAgeLabel(currentPatient)}${
          patientMrn(currentPatient) ? ` · MRN ${patientMrn(currentPatient)}` : ''
        }`}
        accessory={
          <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
            <Badge
              label={ENCOUNTER_STATUS_LABELS[currentEncounter.status]}
              tone={currentEncounter.status === 'finished' ? 'success' : 'primary'}
              dot
            />
            {latestLevel !== 'unknown' ? (
              <Badge
                label={`Vitals ${latestLevel}`}
                tone={
                  latestLevel === 'critical'
                    ? 'critical'
                    : latestLevel === 'abnormal'
                      ? 'warning'
                      : 'success'
                }
              />
            ) : null}
          </View>
        }
      />

      <Card>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.lg,
          }}
        >
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="caption" tone="tertiary">
              Priority
            </Text>
            <Badge
              label={currentEncounter.priority ? currentEncounter.priority.toUpperCase() : 'Not set'}
              tone={
                currentEncounter.priority
                  ? ENCOUNTER_PRIORITY_TONES[currentEncounter.priority]
                  : 'neutral'
              }
            />
          </View>
          <Meta label="Class">{currentEncounter.class}</Meta>
          <Meta label="Elapsed">
            {formatDuration(currentEncounter.period?.start)}
          </Meta>
          <Meta label="Started">
            {currentEncounter.period?.start ? formatClock(currentEncounter.period.start) : '—'}
          </Meta>
        </View>
      </Card>

      {upcoming ? (
        <Button
          label={`Move to ${ENCOUNTER_STATUS_LABELS[upcoming].toLowerCase()}`}
          onPress={handleAdvance}
          fullWidth
          size="lg"
          icon="arrow-forward"
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            backgroundColor: theme.colors.successSurface,
          }}
        >
          <Text variant="subheading" tone="normal">
            Encounter closed
          </Text>
        </View>
      )}

      <Section title="Progress">
        <Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            {TRACKER.map((step, index) => {
              const done = trackerIndex >= 0 && index <= trackerIndex;
              return (
                <View key={step.status} style={{ flex: 1, gap: theme.spacing.xs }}>
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: done
                        ? theme.colors.primary
                        : theme.colors.surfaceSunken,
                    }}
                  />
                  <Text
                    variant="caption"
                    tone={done ? 'primary-accent' : 'tertiary'}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </Section>

      <Section title="Actions">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {ACTIONS.map(action => (
            <Button
              key={action.key}
              label={action.label}
              icon={action.icon as never}
              variant="secondary"
              size="sm"
              onPress={() => handleAction(action.key)}
              style={{ flexGrow: 1, flexBasis: '30%' }}
            />
          ))}
        </View>
      </Section>

      <Section
        title="Latest vital signs"
        meta={latest ? formatClock(latest.timestamp) : undefined}
        action={{ label: 'Record', onPress: () => handleAction('vitals') }}
      >
        <Card padded={false}>
          {latestAssessment.length === 0 ? (
            <EmptyState
              icon="stats-chart-outline"
              title="No observations"
              message="Record a set of observations to see them flagged against reference ranges."
              action={{ label: 'Record vitals', onPress: () => handleAction('vitals') }}
            />
          ) : (
            <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.md,
                }}
              >
                {latestAssessment.map(item => (
                  <View
                    key={item.key}
                    style={{
                      minWidth: 92,
                      gap: 2,
                      paddingLeft: theme.spacing.sm,
                      borderLeftWidth: 3,
                      borderLeftColor: theme.colors.vitals[item.level],
                    }}
                  >
                    <Text variant="caption" tone="tertiary">
                      {item.label}
                    </Text>
                    <Text
                      variant="subheading"
                      style={{ color: theme.colors.vitals[item.level] }}
                    >
                      {item.value} {item.unit}
                    </Text>
                  </View>
                ))}
              </View>
              {latest?.gcs ? (
                <>
                  <Divider />
                  <Text variant="caption" tone="secondary">
                    GCS {latest.gcs.total} (E{latest.gcs.eye} V{latest.gcs.verbal} M
                    {latest.gcs.motor})
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </Card>
      </Section>

      <Section title="Timeline">
        <Card padded={false}>
          <TimelineRow
            label="Encounter opened"
            at={currentEncounter.period?.start}
            icon="enter-outline"
          />
          {latest ? (
            <TimelineRow
              label="Vital signs recorded"
              at={latest.timestamp}
              icon="pulse-outline"
            />
          ) : null}
          <TimelineRow
            label="Created"
            at={currentEncounter.meta?.lastUpdated}
            icon="add-circle-outline"
            last
          />
        </Card>
      </Section>
    </Screen>
  );
};

const Meta: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  return (
    <View style={{ minWidth: 84, gap: 2 }}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="subheading" numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
};

const TimelineRow: React.FC<{
  label: string;
  at?: string;
  icon: string;
  last?: boolean;
}> = ({ label, at, icon, last }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.separator,
      }}
    >
      <Text variant="subheading" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="caption" tone="tertiary">
        {at ? formatDate(at) : '—'}
      </Text>
    </View>
  );
};
