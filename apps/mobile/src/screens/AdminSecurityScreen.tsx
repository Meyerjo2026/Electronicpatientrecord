import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import type { Soc2Posture, Soc2Status } from '@prehospital-epr/security';
import { buildSoc2Posture } from '@prehospital-epr/security';
import {
  Badge,
  Button,
  Card,
  Divider,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useTheme,
} from '@prehospital-epr/ui';
import type { RootState } from '../store';
import { audit } from '../security/audit';

const WINDOW_DAYS = 30;

const STATUS_TONE: Record<Soc2Status, 'success' | 'warning' | 'critical' | 'neutral'> = {
  satisfied: 'success',
  attention: 'warning',
  no_data: 'neutral',
  unknown: 'neutral',
};

const STATUS_LABEL: Record<Soc2Status, string> = {
  satisfied: 'Satisfied',
  attention: 'Needs attention',
  no_data: 'No data',
  unknown: 'Not evidenced',
};

/**
 * Supervisor view of the SOC 2 control posture.
 *
 * Every figure is derived from audit events this device actually recorded. A
 * control with no events behind it says "No data" rather than showing a pass,
 * because an assurance report that scores what it cannot evidence is worse than
 * no report.
 */
export const AdminSecurityScreen: React.FC = () => {
  const theme = useTheme();
  const session = useSelector((state: RootState) => state.auth.session);
  const sync = useSelector((state: RootState) => state.sync);

  const [posture, setPosture] = useState<Soc2Posture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const end = new Date();
    const start = new Date(end.getTime() - WINDOW_DAYS * 86_400_000);

    try {
      // Rehydrate first so the integrity chain covers events from previous
      // sessions, not just this process.
      const integrity = await audit.rehydrateIntegrityChain();
      const events = await audit.queryEvents({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 5000,
      });

      setPosture(
        buildSoc2Posture({
          events,
          windowStart: start.toISOString(),
          windowEnd: end.toISOString(),
          integrity,
          availability: {
            pendingOperations: sync.pendingOperations,
            failedOperations: sync.failedOperations,
            lastSyncedAt: sync.lastSyncTime ?? undefined,
          },
        })
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read the audit trail');
    }
  }, [sync.pendingOperations, sync.failedOperations, sync.lastSyncTime]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, typeof posture extends null ? never : NonNullable<typeof posture>['controls']>();
    for (const control of posture?.controls ?? []) {
      const bucket = byCategory.get(control.category) ?? [];
      byCategory.set(control.category, [...bucket, control]);
    }
    return [...byCategory.entries()];
  }, [posture]);

  return (
    <Screen>
      <ScreenHeader
        title="Security posture"
        subtitle={`SOC 2 controls over the last ${WINDOW_DAYS} days`}
        accessory={
          <Button
            label={refreshing ? 'Refreshing' : 'Refresh'}
            variant="secondary"
            onPress={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
          />
        }
      />

      {error ? (
        <Card>
          <Text variant="subheading" tone="critical">
            Audit trail unavailable
          </Text>
          <Text variant="caption" tone="tertiary">
            {error}
          </Text>
        </Card>
      ) : null}

      {!posture && !error ? (
        <Card>
          <Text variant="caption" tone="tertiary">
            Reading the audit trail…
          </Text>
        </Card>
      ) : null}

      {posture ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <Badge label={`${posture.summary.satisfied} satisfied`} tone="success" />
              <Badge label={`${posture.summary.attention} need attention`} tone="warning" />
              <Badge label={`${posture.summary.no_data} no data`} tone="neutral" />
              <Badge label={`${posture.summary.unknown} not evidenced`} tone="neutral" />
            </View>
            <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
              {posture.eventCount} audit event{posture.eventCount === 1 ? '' : 's'} recorded in this window.
              {' '}
              {posture.authentication.logins} sign-in{posture.authentication.logins === 1 ? '' : 's'},
              {' '}
              {posture.authentication.failedLogins} failed attempt
              {posture.authentication.failedLogins === 1 ? '' : 's'},
              {' '}
              {posture.authentication.distinctUsers} distinct user
              {posture.authentication.distinctUsers === 1 ? '' : 's'}.
            </Text>
          </Card>

          {grouped.map(([category, controls]) => (
            <Section key={category} title={category} meta={`${controls.length} control(s)`}>
              {controls.map(control => (
                <View key={control.id}>
                  <Card>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: theme.spacing.sm,
                      }}
                    >
                      <Text variant="label" style={{ flex: 1 }}>
                        {control.id} · {control.title}
                      </Text>
                      <Badge label={STATUS_LABEL[control.status]} tone={STATUS_TONE[control.status]} />
                    </View>
                    <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.xs }}>
                      {control.evidence}
                    </Text>
                    {control.findings.map(finding => (
                      <Text
                        key={finding}
                        variant="caption"
                        tone="abnormal"
                        style={{ marginTop: theme.spacing.xs }}
                      >
                        • {finding}
                      </Text>
                    ))}
                  </Card>
                  <Divider />
                </View>
              ))}
            </Section>
          ))}

          <Section title="Audit trail">
            <Card>
              <Text variant="caption" tone="tertiary">
                Events are held on this device and never edited in place. The hash chain is
                re-verified on every load, so a tampered or truncated trail is reported as a
                finding rather than silently hidden.
              </Text>
              {session ? (
                <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.xs }}>
                  Reviewing as {session.roles.join(', ')}.
                </Text>
              ) : null}
            </Card>
          </Section>
        </>
      ) : null}
    </Screen>
  );
};

/**
 * Gates the posture report on the `AUDIT_READ` permission.
 *
 * The check is on the session's permissions, which is what
 * `RBACService.checkPermission` enforces, so the screen and the service agree.
 * Denying here as well as in the service keeps a stale navigation state from
 * revealing the report.
 */
export const AdminSecurityGate: React.FC = () => {
  const theme = useTheme();
  const session = useSelector((state: RootState) => state.auth.session);
  const allowed = session?.permissions?.includes('AUDIT_READ') ?? false;

  if (allowed) return <AdminSecurityScreen />;

  return (
    <Screen>
      <ScreenHeader title="Security posture" subtitle="Supervisor access required" />
      <Card>
        <Text variant="subheading" tone="critical">
          Not authorised
        </Text>
        <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.xs }}>
          Reading the audit trail requires the AUDIT_READ permission. Ask an administrator to
          grant it if you need to review access and authentication activity.
        </Text>
      </Card>
    </Screen>
  );
};
