import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  type Tone,
} from '@prehospital-epr/ui';
import { AppDispatch, RootState } from '../store';
import { createEncounter, setActiveEncounter, setCurrentEncounter } from '../store/encounterSlice';
import { setCurrentPatient } from '../store/patientSlice';
import { useSync } from '../providers/SyncProvider';
import type { MainStackParamList } from '../navigation/AppNavigator';
import {
  ENCOUNTER_PRIORITY_TONES,
  ENCOUNTER_STATUS_LABELS,
  formatDuration,
  formatRelative,
  formatTimeOfDay,
  patientDisplayName,
} from '../utils/format';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const QUICK_ACTIONS = [
  { key: 'new', label: 'New Encounter', icon: 'add-circle-outline' },
  { key: 'find', label: 'Find Patient', icon: 'search-outline' },
  { key: 'vitals', label: 'Record Vitals', icon: 'pulse-outline' },
  { key: 'report', label: 'Patient Report', icon: 'document-text-outline' },
] as const;

export const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const { isSyncing, lastSyncTime, pendingCount, syncNow: runSync } = useSync();

  const session = useSelector((state: RootState) => state.auth.session);
  const currentEncounter = useSelector((state: RootState) => state.encounter.currentEncounter);
  const encounters = useSelector((state: RootState) => state.encounter.encounters);
  const currentPatient = useSelector((state: RootState) => state.patient.currentPatient);

  const recent = useMemo(() => encounters.slice(0, 4), [encounters]);

  const handleNewEncounter = useCallback(async () => {
    const result = await dispatch(
      createEncounter({
        status: 'planned',
        class: 'emergency',
        subject: { reference: `Patient/${currentPatient?.id ?? 'unknown'}` },
        period: { start: new Date().toISOString() },
      })
    );
    if (createEncounter.fulfilled.match(result)) {
      const created = result.payload;
      // Without these the dashboard would keep showing the previous encounter
      // and the detail routes would have no id to resolve.
      dispatch(setCurrentEncounter(created));
      dispatch(setActiveEncounter(created.id));
      if (currentPatient) dispatch(setCurrentPatient(currentPatient));
      navigation.navigate('EncounterDetail', { encounterId: created.id });
    }
  }, [dispatch, currentPatient, navigation]);

  const handleQuickAction = useCallback(
    (key: (typeof QUICK_ACTIONS)[number]['key']) => {
      switch (key) {
        case 'new':
          return handleNewEncounter();
        case 'find':
          return navigation.navigate('MainTabs', { screen: 'Patients' } as never);
        case 'vitals':
          return navigation.navigate('VitalSignsDetail', {
            encounterId: currentEncounter?.id ?? '',
          });
        case 'report':
          return navigation.navigate('PatientReport', {
            encounterId: currentEncounter?.id ?? '',
          });
      }
    },
    [handleNewEncounter, navigation, currentEncounter?.id]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const providerLabel = session?.roles?.[0]?.replace(/_/g, ' ').toLowerCase() ?? 'crew member';

  return (
    <Screen
      onRefresh={runSync}
      refreshing={isSyncing}
    >
      <ScreenHeader
        title={greeting}
        subtitle={`${formatTimeOfDay()} · signed in as ${providerLabel}`}
        accessory={
          <Badge
            label={pendingCount > 0 ? `${pendingCount} queued` : 'All synced'}
            tone={pendingCount > 0 ? 'warning' : 'success'}
            dot
          />
        }
      />

      {currentEncounter ? (
        <Card padded={false} elevated>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}
            >
              <Text variant="caption" tone="tertiary">
                ACTIVE ENCOUNTER
              </Text>
              <Badge
                label={ENCOUNTER_STATUS_LABELS[currentEncounter.status]}
                tone={
                  currentEncounter.status === 'finished' ? 'success' : 'primary'
                }
                dot
              />
            </View>

            <View>
              <Text variant="title">
                {patientDisplayName(currentPatient)}
              </Text>
              {currentEncounter.priority ? (
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                  <Badge
                    label={currentEncounter.priority}
                    tone={ENCOUNTER_PRIORITY_TONES[currentEncounter.priority]}
                  />
                </View>
              ) : null}
            </View>
          </View>

          <Divider />

          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
              <View>
                <Text variant="caption" tone="tertiary">
                  Elapsed
                </Text>
                <Text variant="subheading">
                  {formatDuration(currentEncounter.period?.start)}
                </Text>
              </View>
              <View>
                <Text variant="caption" tone="tertiary">
                  Last sync
                </Text>
                <Text variant="subheading">{formatRelative(lastSyncTime)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                label="Continue encounter"
                onPress={() => navigation.navigate('EncounterDetail', { encounterId: currentEncounter.id })}
                icon="arrow-forward"
                style={{ flex: 1 }}
              />
              <Button
                label={isSyncing ? 'Syncing…' : 'Sync'}
                onPress={runSync}
                disabled={isSyncing}
                loading={isSyncing}
                variant="secondary"
                icon="sync-outline"
                accessibilityLabel="Sync queued records now"
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon="pulse-outline"
            title="No active encounter"
            message="Start an encounter when you arrive on scene to begin recording observations."
            action={{ label: 'Start encounter', onPress: handleNewEncounter }}
          />
        </Card>
      )}

      <Section title="Quick actions">
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.md,
          }}
        >
          {QUICK_ACTIONS.map(action => (
            <Pressable
              key={action.key}
              onPress={() => handleQuickAction(action.key)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => ({ flexGrow: 1, flexBasis: '45%', opacity: pressed ? 0.7 : 1 })}
            >
              <Card padded={false} elevated>
                <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
                  <Ionicons
                    name={action.icon as never}
                    size={22}
                    color={theme.colors.primary}
                  />
                  <Text variant="subheading">{action.label}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section
        title="Recent encounters"
        meta={`${encounters.length} total`}
        action={
          encounters.length > 0
            ? { label: 'Patients', onPress: () => navigation.navigate('MainTabs', { screen: 'Patients' } as never) }
            : undefined
        }
      >
        <Card padded={false}>
          {recent.length === 0 ? (
            <EmptyState
              icon="albums-outline"
              title="No encounters yet"
              message="Encounters you record will appear here, even without connectivity."
            />
          ) : (
            recent.map((encounter, index) => {
              const tone: Tone = encounter.status === 'finished' ? 'neutral' : 'primary';
              return (
                <View key={encounter.id}>
                  {index > 0 ? <Divider inset={theme.spacing.lg} /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      padding: theme.spacing.lg,
                    }}
                  >
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <Text variant="subheading" numberOfLines={1}>
                        {`Encounter ${encounter.id.slice(-6).toUpperCase()}`}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {formatRelative(encounter.period?.start)}
                      </Text>
                    </View>
                    <Badge
                      label={ENCOUNTER_STATUS_LABELS[encounter.status]}
                      tone={tone}
                    />
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
