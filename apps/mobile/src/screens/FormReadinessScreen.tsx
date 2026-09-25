import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  Badge,
  Card,
  Divider,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useTheme,
} from '@prehospital-epr/ui';
import { enforcementReadiness, sectionCoverage } from '../utils/quality-indicator-coverage';

/**
 * Shows how much of the DEMS quality indicator regime this build can enforce.
 *
 * The catalogue of rules is only half the story: a rule is worth enforcing once
 * the form can record the values it reads. This screen keeps that honest by
 * listing the DEMS sections the regime depends on and marking the ones the
 * NEMSIS form does not yet collect, which doubles as the build order for the
 * remaining capture work.
 */
export const FormReadinessScreen: React.FC = () => {
  const theme = useTheme();

  const readiness = useMemo(() => enforcementReadiness(), []);
  const coverage = useMemo(() => sectionCoverage(), []);

  const missing = coverage.filter(entry => !entry.implemented);
  const implemented = coverage.filter(entry => entry.implemented);
  const capturedFields = implemented.reduce((total, entry) => total + entry.qualityFields, 0);
  const requiredFields = coverage.reduce((total, entry) => total + entry.qualityFields, 0);

  return (
    <Screen>
      <ScreenHeader
        title="Form readiness"
        subtitle="What this build can enforce, and what it still needs to capture"
      />

      <Card>
        <Text variant="subheading">Rule enforcement</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Badge label={`${readiness.enforceable} enforceable`} tone="critical" />
          <Badge label={`${readiness.machineReadable} readable`} tone="warning" />
          <Badge label={`${readiness.totalRules} rules`} tone="neutral" />
        </View>
        <Text variant="caption" tone="tertiary">
          A rule is only enforceable once the form captures every field it reads. Right now
          {' '}
          {readiness.machineReadable - readiness.enforceable} rules are understood but have nowhere to
          read their values from.
        </Text>
      </Card>

      <Card>
        <Text variant="subheading">Capture coverage</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Badge label={`${implemented.length} of ${coverage.length} sections`} tone="warning" />
          <Badge label={`${capturedFields} of ${requiredFields} fields`} tone="warning" />
        </View>
        <Text variant="caption" tone="tertiary">
          The quality indicator documents reference {coverage.length} DEMS sections. The NEMSIS form in
          this build collects {implemented.length} of them.
        </Text>
      </Card>

      {missing.length > 0 ? (
        <Section
          title="Not yet captured"
          meta={`${missing.length} sections, largest first`}
        >
          <Card padded={false}>
            {missing.map((entry, index) => (
              <View key={entry.section}>
                {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xs }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <Text variant="subheading">{entry.section}</Text>
                    <Badge label={`${entry.qualityFields} fields`} tone="warning" />
                  </View>
                  <Text variant="caption" tone="tertiary">
                    Needed by {entry.modules.length} module
                    {entry.modules.length === 1 ? '' : 's'}: {entry.modules.join(', ')}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title="Already captured" meta={`${implemented.length} sections`}>
        <Card padded={false}>
          {implemented.map((entry, index) => (
            <View key={entry.section}>
              {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
              <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xs }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: theme.spacing.sm,
                  }}
                >
                  <Text variant="subheading">{entry.section}</Text>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                    <Badge label={`${entry.implementedElements} elements`} tone="info" />
                    <Badge label={`${entry.qualityFields} fields`} tone="success" />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
        This is a build tool. It reports what the software enforces; it does not judge whether a
        completed patient report is compliant.
      </Text>
    </Screen>
  );
};
