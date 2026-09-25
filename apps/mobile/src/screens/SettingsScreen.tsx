import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge,
  Card,
  Divider,
  ListRow,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Section,
  Text,
  useTheme,
  type ThemePreference,
} from '@prehospital-epr/ui';
import { AppDispatch, RootState } from '../store';
import { logout, setBiometricEnabled, setPinEnabled } from '../store/authSlice';
import { setTheme } from '../store/uiSlice';
import { useSync } from '../providers/SyncProvider';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { formatRelative } from '../utils/format';

const APP_VERSION =
  (Constants.expoConfig?.version as string | undefined) ??
  (Constants.manifest2?.extra?.version as string | undefined) ??
  '1.0.0';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<Nav>();

  const session = useSelector((state: RootState) => state.auth.session);
  const biometricEnabled = useSelector((state: RootState) => state.auth.biometricEnabled);
  const pinEnabled = useSelector((state: RootState) => state.auth.pinEnabled);
  const preference = useSelector((state: RootState) => state.ui.theme);
  const pendingOperations = useSelector((state: RootState) => state.sync.pendingOperations);
  const failedOperations = useSelector((state: RootState) => state.sync.failedOperations);
  const lastSyncTime = useSelector((state: RootState) => state.sync.lastSyncTime);
  const { isOnline, isSyncing, syncNow } = useSync();

  const roles = useMemo(
    () => (session?.roles ?? []).map(role => role.replace(/_/g, ' ').toLowerCase()).join(', '),
    [session]
  );

  const handleSignOut = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return (
    <Screen>
      <ScreenHeader title="Settings" subtitle="Device, account and data preferences" />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
          <View
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primarySurface,
            }}
          >
            <Text variant="subheading" tone="primary-accent">
              {session?.userId?.slice(-2).toUpperCase() ?? '··'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheading">Crew member</Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {roles || 'No roles assigned'}
            </Text>
          </View>
          <Badge
            label={isOnline ? 'Online' : 'Offline'}
            tone={isOnline ? 'success' : 'warning'}
            dot
          />
        </View>
      </Card>

      <Section title="Appearance">
        <Card>
          <SegmentedControl<ThemePreference>
            value={preference}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'System' },
            ]}
            onChange={next => dispatch(setTheme(next))}
          />
          <Text variant="caption" tone="tertiary">
            {preference === 'auto'
              ? `Following the device setting (${theme.scheme}).`
              : `Always using the ${preference} palette.`}
          </Text>
        </Card>
      </Section>

      <Section title="Account">
        <Card padded={false}>
          <ListRow
            title="Biometric unlock"
            subtitle="Use Face ID, Touch ID or a fingerprint to sign in"
            icon="finger-print-outline"
            chevron
            onPress={() => dispatch(setBiometricEnabled(!biometricEnabled))}
            meta={biometricEnabled ? 'On' : 'Off'}
          />
          <Divider inset={theme.spacing.lg} />
          <ListRow
            title="Require PIN"
            subtitle="Ask for a 4-digit PIN alongside the password"
            icon="keypad-outline"
            chevron
            onPress={() => dispatch(setPinEnabled(!pinEnabled))}
            meta={pinEnabled ? 'On' : 'Off'}
          />
          <Divider inset={theme.spacing.lg} />
          <ListRow
            title="Sign out"
            subtitle="End this session and clear the local session"
            icon="log-out-outline"
            iconTone="critical"
            onPress={handleSignOut}
          />
        </Card>
      </Section>

      <Section title="Data and sync">
        <Card padded={false}>
          <ListRow
            title="Sync now"
            subtitle={
              pendingOperations > 0
                ? `${pendingOperations} change${pendingOperations === 1 ? '' : 's'} waiting to upload`
                : 'Everything on this device is up to date'
            }
            icon="cloud-upload-outline"
            iconTone="primary"
            chevron
            disabled={isSyncing}
            onPress={syncNow}
            meta={isSyncing ? 'Syncing' : undefined}
          />
          <Divider inset={theme.spacing.lg} />
          <ListRow
            title="Last successful sync"
            icon="time-outline"
            meta={formatRelative(lastSyncTime)}
          />
          {failedOperations > 0 ? (
            <>
              <Divider inset={theme.spacing.lg} />
              <ListRow
                title="Failed operations"
                subtitle="These will be retried on the next sync"
                icon="warning-outline"
                iconTone="critical"
                meta={String(failedOperations)}
              />
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Clinical reference">
        <Card padded={false}>
          <ListRow
            title="Quality indicators"
            subtitle="DEMS ePCR modules, fields and validation rules"
            icon="checkmark-done-outline"
            iconTone="primary"
            chevron
            onPress={() => navigation.navigate('QualityIndicators')}
          />
          <Divider inset={theme.spacing.lg} />
          <ListRow
            title="Form readiness"
            subtitle="What this build can enforce, and what it still needs to capture"
            icon="stats-chart-outline"
            iconTone="primary"
            chevron
            onPress={() => navigation.navigate('FormReadiness')}
          />
        </Card>
      </Section>

      <Section title="About">
        <Card padded={false}>
          <ListRow title="Version" icon="information-circle-outline" meta={APP_VERSION} />
          <Divider inset={theme.spacing.lg} />
          <ListRow title="FHIR release" icon="git-network-outline" meta="R4" />
          <Divider inset={theme.spacing.lg} />
          <ListRow title="NEMSIS version" icon="document-text-outline" meta="3.x" />
        </Card>
      </Section>

      <Text
        variant="caption"
        tone="tertiary"
        style={{ textAlign: 'center', marginTop: theme.spacing.sm }}
      >
        Every access to patient data is recorded in the audit log.
      </Text>
    </Screen>
  );
};
