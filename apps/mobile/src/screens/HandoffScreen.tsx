import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Section,
  Text,
  useTheme,
} from '@prehospital-epr/ui';
import {
  HandoffService,
  VITAL_REFERENCES,
  assessVitalSignsSet,
  vitalSignsSetToObservations,
  type HandoffFormat,
} from '@prehospital-epr/clinical';
import type { RootState } from '../store';
import {
  ENCOUNTER_STATUS_LABELS,
  formatClock,
  formatDate,
  formatDuration,
  patientAgeLabel,
  patientAgeYears,
  patientDisplayName,
} from '../utils/format';

const VITAL_LABELS = Object.fromEntries(
  Object.values(VITAL_REFERENCES).map(reference => [reference.key, reference.label])
) as Record<string, string>;

const FORMATS: Array<{ value: HandoffFormat; label: string; icon: string; blurb: string }> = [
  {
    value: 'IMIST-AMBO',
    label: 'IMIST-AMBO',
    icon: 'list-outline',
    blurb: 'Mnemonic for the verbal handover, aligned to the PBEC supervision guidelines.',
  },
  {
    value: 'SBAR',
    label: 'SBAR',
    icon: 'chatbox-ellipses-outline',
    blurb: 'Situation, Background, Assessment, Recommendation.',
  },
  {
    value: 'CDA-CCD',
    label: 'CDA document',
    icon: 'document-outline',
    blurb: 'Continuity of Care Document for the receiving facility.',
  },
  {
    value: 'FHIR-BUNDLE',
    label: 'FHIR bundle',
    icon: 'git-network-outline',
    blurb: 'Transaction bundle of the FHIR R4 resources recorded so far.',
  },
];

type PreviewFormat = 'IMIST-AMBO' | 'SBAR';

export const HandoffScreen: React.FC = () => {
  const theme = useTheme();
  const [format, setFormat] = useState<PreviewFormat>('IMIST-AMBO');
  const [sent, setSent] = useState(false);

  const encounter = useSelector((state: RootState) => state.encounter.currentEncounter);
  const patient = useSelector((state: RootState) => state.patient.currentPatient);
  const latest = useSelector((state: RootState) => state.observation.vitalSigns[0]);
  const session = useSelector((state: RootState) => state.auth.session);
  const { medications, procedures } = useSelector((state: RootState) => state.intervention);

  const service = useMemo(() => new HandoffService(), []);

  /**
   * Built from the live encounter rather than a fixed string, so the preview
   * reflects what would actually be handed over.
   */
  const preview = useMemo(() => {
    if (!encounter || !patient) return null;

    const ageYears = patientAgeYears(patient);
    const assessment = latest
      ? [
          `Vitals ${formatClock(latest.timestamp)}`,
          ...assessVitalSignsSet(latest, ageYears ?? 30).map(
            item =>
              `${VITAL_LABELS[item.key] ?? item.key} ${item.value}${
                item.unit ? ` ${item.unit}` : ''
              } (${item.level})`
          ),
        ].join(', ')
      : 'No observations recorded';

    // Flat capture -> LOINC-coded FHIR Observations, so the narrative is built
    // from the same resources the server would receive.
    const observations = latest
      ? vitalSignsSetToObservations(latest, {
          subject: `Patient/${patient.id}`,
          encounter: `Encounter/${encounter.id}`,
        })
      : [];

    return service.generateIMISTAMBO({
      encounter,
      patient,
      vitalSigns: observations,
      medications,
      procedures,
      conditions: [],
      assessment: assessment || 'No observations recorded',
      plan: `Destination per receiving facility protocol. ETA ${formatDuration(encounter.period?.start)}.`,
    });
  }, [service, encounter, patient, latest, medications, procedures]);

  const handleSend = useCallback(() => {
    if (!encounter || !patient || !preview) return;
    service.createHandoff({
      encounterId: encounter.id,
      patientId: patient.id,
      format,
      priority: encounter.priority ?? 'urgent',
      fromFacility: { reference: 'Facility/ems-unit' },
      toFacility: { reference: 'Facility/receiving-hospital' },
      fromProvider: { reference: `Practitioner/${session?.userId ?? 'unknown'}` },
      content: preview,
    });
    setSent(true);
  }, [service, encounter, patient, preview, format, session?.userId]);

  if (!encounter || !patient) {
    return (
      <Screen>
        <ScreenHeader title="Handoff" />
        <Card>
          <EmptyState
            icon="swap-horizontal-outline"
            title="No encounter to hand over"
            message="Start an encounter and record some observations before preparing a handoff."
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Handoff"
        subtitle={patientDisplayName(patient)}
        accessory={
          <Badge
            label={ENCOUNTER_STATUS_LABELS[encounter.status]}
            tone={encounter.status === 'finished' ? 'success' : 'primary'}
            dot
          />
        }
      />

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xl }}>
          <View>
            <Text variant="caption" tone="tertiary">
              Patient
            </Text>
            <Text variant="subheading">{patientDisplayName(patient)}</Text>
          </View>
          <View>
            <Text variant="caption" tone="tertiary">
              Age / sex
            </Text>
            <Text variant="subheading">
              {patientAgeLabel(patient)} · {patient.gender ?? 'unknown'}
            </Text>
          </View>
          <View>
            <Text variant="caption" tone="tertiary">
              On scene
            </Text>
            <Text variant="subheading">{formatDuration(encounter.period?.start)}</Text>
          </View>
        </View>
      </Card>

      <Section title="Format">
        <Card padded={false}>
          {FORMATS.map((option, index) => (
            <View key={option.value}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: theme.colors.separator }} /> : null}
              <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="subheading" style={{ flex: 1 }}>
                    {option.label}
                  </Text>
                  {format === option.value ? <Badge label="Previewing" tone="primary" /> : null}
                </View>
                <Text variant="caption" tone="tertiary">
                  {option.blurb}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Preview">
        <Card padded={false}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <Text variant="caption" tone="tertiary">
              LIVE · regenerated from the current record
            </Text>
            <View
              style={{
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.surfaceSunken,
              }}
            >
              <Text
                variant="mono"
                tone="secondary"
                style={{ lineHeight: theme.typography.sizes.md * 1.5 }}
              >
                {preview ?? 'No preview available.'}
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title="Deliver">
        <SegmentedControl
          value={format}
          options={FORMATS.filter(f => f.value === 'IMIST-AMBO' || f.value === 'SBAR').map(f => ({
            value: f.value as PreviewFormat,
            label: f.label,
          }))}
          onChange={next => {
            setFormat(next);
            setSent(false);
          }}
        />
        <Button
          label={sent ? 'Handoff recorded' : 'Complete handoff'}
          onPress={handleSend}
          icon={sent ? 'checkmark-circle' : 'paper-plane-outline'}
          variant={sent ? 'secondary' : 'primary'}
          fullWidth
          size="lg"
        />
        <Text variant="caption" tone="tertiary">
          Recording the handoff closes the encounter at{' '}
          {formatDate(new Date().toISOString())} {formatClock(new Date().toISOString())}.
        </Text>
      </Section>
    </Screen>
  );
};
