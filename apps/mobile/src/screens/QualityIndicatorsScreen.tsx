import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Divider,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Text,
  TextField,
  useTheme,
} from '@prehospital-epr/ui';
import {
  describeQualityIndicatorFields,
  type QualityIndicatorFieldDetail,
  listQualityIndicatorModules,
  parseQualityConditions,
  qualityIndicatorCoverage,
  searchQualityIndicators,
} from '@prehospital-epr/clinical';

/**
 * Reference browser for the DEMS quality indicator modules.
 *
 * This is deliberately read-only. The modules describe governance that a crew
 * must satisfy, but the prose in the source documents is only partly
 * machine-readable, so nothing here blocks submission. Each rule is labelled
 * with whether the app can actually check it, so a clinician can see where the
 * software is enforcing something and where only the document can help.
 */
/**
 * Four distinct states, because "not mandatory" is not the same as "optional":
 * a field can be required outright, required only under a stated condition,
 * required conditionally in prose the app cannot evaluate, or optional.
 */
const RequirementBadge: React.FC<{ field: QualityIndicatorFieldDetail }> = ({ field }) => {
  if (field.mandatory) {
    return (
      <Badge
        label={field.conditionallyRequired ? 'Mandatory if' : 'Mandatory'}
        tone={field.conditionallyRequired ? 'primary' : 'info'}
      />
    );
  }
  if (field.conditionallyRequired) {
    return (
      <Badge
        label={field.requiredWhen ? 'Mandatory if' : 'Conditional'}
        tone={field.requiredWhen ? 'primary' : 'warning'}
      />
    );
  }
  return (
    <Badge
      label={/^Calculated/i.test(field.validation) ? 'Calculated' : 'Optional'}
      tone="neutral"
    />
  );
};

export const QualityIndicatorsScreen: React.FC = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const results = useMemo(
    () => (query.trim() ? searchQualityIndicators(query) : listQualityIndicatorModules()),
    [query]
  );

  const openModule = useMemo(
    () => listQualityIndicatorModules().find(module => module.id === openModuleId),
    [openModuleId]
  );

  const fields = useMemo(
    () => (openModule ? describeQualityIndicatorFields(openModule) : []),
    [openModule]
  );

  const coverage = useMemo(
    () => (openModule ? qualityIndicatorCoverage(openModule) : null),
    [openModule]
  );

  if (openModule && coverage) {
    const mandatory = fields.filter(field => field.mandatory).length;
    const conditional = fields.filter(field => field.conditionallyRequired).length;
    const optional = fields.filter(
      field => !field.mandatory && !field.conditionallyRequired
    ).length;

    return (
      <Screen>
        <ScreenHeader
          title={openModule.title}
          subtitle={openModule.sourceFile}
          accessory={
            <Button label="All modules" size="sm" variant="secondary" onPress={() => setOpenModuleId(null)} />
          }
        />

        <Card>
          <Text variant="body" tone="secondary">
            {openModule.summary}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Badge label={`${fields.length} fields`} tone="neutral" />
            <Badge label={`${mandatory} mandatory`} tone="info" />
            {conditional > 0 ? <Badge label={`${conditional} conditional`} tone="primary" /> : null}            <Badge
              label={`${coverage.machineChecked}/${coverage.total} rules auto-checked`}
              tone={coverage.machineChecked === coverage.total ? 'success' : 'warning'}
            />
          </View>
        </Card>

        <Section
          title="Fields"
          meta={`${fields.length} captured on the ePCR form`}
        >
          <Card padded={false}>
            {fields.map((field, index) => (
              <View key={field.id}>
                {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Text variant="label" tone="primary-accent">
                      {field.id}
                    </Text>
                    <Text variant="subheading" style={{ flex: 1 }}>
                      {field.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    <RequirementBadge field={field} />
                    <Badge label={field.dataType} tone="neutral" />
                  </View>
                  <Text variant="caption" tone="tertiary">
                    {field.requirementProse}
                  </Text>
                  {field.valueCodes ? (
                    <Text variant="caption" tone="tertiary">
                      Values: {field.valueCodes}
                    </Text>
                  ) : null}
                  {field.demsMapping ? (
                    <Text variant="caption" tone="tertiary">
                      DEMS: {field.demsMapping}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </Section>

        <Section
          title="Validation rules"
          meta={`${coverage.machineChecked} of ${coverage.total} checked in the app`}
        >
          <Card padded={false}>
            {openModule.rules.map((rule, index) => {
              const parsed = parseQualityConditions(rule.trigger);
              return (
                <View key={rule.id}>
                  {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                  <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Text variant="label" tone="tertiary">
                        {rule.id}
                      </Text>
                      <Badge
                        label={rule.validationClass}
                        tone={/critical/i.test(rule.validationClass) ? 'critical' : 'warning'}
                      />
                    </View>
                    <Text variant="body">{rule.trigger}</Text>
                    <Text variant="caption" tone="tertiary">
                      {rule.targetField}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {rule.action}
                    </Text>
                    {parsed.complete ? (
                      <Badge label="Checked automatically" tone="success" />
                    ) : parsed.qualifier ? (
                      <Badge label={`Not auto-checked \u00b7 ${parsed.qualifier}`} tone="warning" />
                    ) : (
                      <Badge label="Needs manual review" tone="warning" />
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </Section>

        <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
          {optional} of {fields.length} fields are optional or calculated. Rules the app cannot
          read are shown in full so the crew can still apply them. Nothing on this screen blocks
          submission.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Quality Indicators"
        subtitle="DEMS ePCR modules, fields and validation rules"
      />

      <TextField
        label="Search"
        placeholder="sepsis, pain, handover\u2026"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />

      <Section title="Modules" meta={`${results.length} of 11`}>
        <Card padded={false}>
          {results.map((module, index) => {
            const moduleCoverage = qualityIndicatorCoverage(module);
            return (
              <View key={module.id}>
                {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                <ListRow
                  title={module.title}
                  subtitle={`${module.fields.length} fields \u00b7 ${module.rules.length} rules`}
                  icon="document-text-outline"
                  chevron
                  onPress={() => setOpenModuleId(module.id)}
                  meta={`${Math.round(moduleCoverage.ratio * 100)}%`}
                />
              </View>
            );
          })}
        </Card>
      </Section>

      {results.length === 0 ? (
        <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
          No module matches that search.
        </Text>
      ) : null}
    </Screen>
  );
};
