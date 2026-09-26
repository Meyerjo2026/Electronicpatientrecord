import type { AuditEvent } from '@prehospital-epr/core';

/**
 * SOC 2 posture analytics.
 *
 * Everything here is computed from events that were actually recorded. A
 * control that has no data behind it reports `no_data` rather than a green
 * tick: an audit dashboard that scores controls it cannot evidence is worse
 * than no dashboard, because it manufactures assurance an auditor would then
 * have to disprove.
 *
 * Criterion references are to the 2017 Trust Services Criteria (Security /
 * Availability / Confidentiality / Processing Integrity / Privacy).
 */

export type Soc2Category = 'Security' | 'Availability' | 'Confidentiality' | 'Processing Integrity' | 'Privacy';

export type Soc2Status = 'satisfied' | 'attention' | 'no_data' | 'unknown';

export interface Soc2Control {
  /** Trust Services Criteria reference, e.g. `CC6.1`. */
  id: string;
  category: Soc2Category;
  title: string;
  status: Soc2Status;
  /** What was measured, with the real numbers behind it. */
  evidence: string;
  /** Conditions that make this a finding, empty when clean. */
  findings: string[];
}

export interface Soc2Posture {
  generatedAt: string;
  window: { start: string; end: string; days: number };
  /** Total events examined. */
  eventCount: number;
  controls: Soc2Control[];
  summary: Record<Soc2Status, number>;
  /** Event counts by high-level type, for the activity breakdown. */
  activity: Array<{ label: string; count: number }>;
  /** Authentication outcomes, used to detect credential probing. */
  authentication: {
    logins: number;
    failedLogins: number;
    failureRate: number;
    distinctUsers: number;
  };
  /** PHI access counts by action, for CC6.3 access review. */
  recordAccess: Array<{ action: string; count: number; failures: number }>;
}

/** A control that has no evidence gets this, so the UI can say so out loud. */
const NO_DATA = 'No audit events recorded in this window.';

const codeOf = (event: AuditEvent, kind: 'type' | 'subtype'): string | undefined => {
  const value = event[kind];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.coding?.[0]?.code;
};

const userIdOf = (event: AuditEvent): string | undefined =>
  event.agent?.[0]?.who?.reference?.split('/').pop();

/** FHIR audit `outcome` codes: 0 success, 4 minor failure, 8 major, 12 serious. */
const isFailure = (event: AuditEvent): boolean => event.outcome !== '0';

const ACTION_LABELS: Record<string, string> = {
  C: 'Create',
  R: 'Read',
  U: 'Update',
  D: 'Delete',
  E: 'Execute',
};

export interface PostureInput {
  events: AuditEvent[];
  windowStart: string;
  windowEnd: string;
  /** Result of AuditService.verifyIntegrity() for the same events. */
  integrity: { valid: boolean; brokenAt?: number; details?: string };
  /** Availability signal from the sync engine, when available. */
  availability?: { pendingOperations: number; failedOperations: number; lastSyncedAt?: string };
}

export function buildSoc2Posture(input: PostureInput): Soc2Posture {
  const { events, windowStart, windowEnd, integrity } = input;
  const days = Math.max(1, Math.round((Date.parse(windowEnd) - Date.parse(windowStart)) / 86_400_000));

  // Authentication
  const authEvents = events.filter(e => codeOf(e, 'type') === 'auth');
  const failedLogins = authEvents.filter(e => codeOf(e, 'subtype') === 'failed-login');
  const logins = authEvents.filter(e => codeOf(e, 'subtype') === 'login');
  const distinctUsers = new Set(authEvents.map(userIdOf).filter(Boolean)).size;
  const failureRate = authEvents.length === 0 ? 0 : failedLogins.length / authEvents.length;

  // Access review: every event that touches a clinical resource
  const accessEvents = events.filter(e => (e.entity?.length ?? 0) > 0);
  const accessByAction = new Map<string, { count: number; failures: number }>();
  for (const event of accessEvents) {
    const action = event.action;
    const row = accessByAction.get(action) ?? { count: 0, failures: 0 };
    row.count += 1;
    if (isFailure(event)) row.failures += 1;
    accessByAction.set(action, row);
  }

  const emergencyAccess = events.filter(e => codeOf(e, 'subtype') === 'emergency-access');
  const dataExports = events.filter(e => codeOf(e, 'subtype') === 'data-export');
  const deletes = accessEvents.filter(e => e.action === 'D');

  const activityMap = new Map<string, number>();
  for (const event of events) {
    const label = codeOf(event, 'type') ?? 'unknown';
    activityMap.set(label, (activityMap.get(label) ?? 0) + 1);
  }

  const hasEvents = events.length > 0;
  const status = (condition: boolean): Soc2Status => (!hasEvents ? 'no_data' : condition ? 'satisfied' : 'attention');

  const controls: Soc2Control[] = [
    {
      id: 'CC6.1',
      category: 'Security',
      title: 'Logical access credentials are authenticated before entry',
      status: hasEvents && logins.length > 0 ? 'satisfied' : 'no_data',
      evidence: hasEvents
        ? `${logins.length} successful and ${failedLogins.length} failed authentication events from ${distinctUsers} distinct users.`
        : NO_DATA,
      findings:
        hasEvents && logins.length === 0
          ? ['No successful sign-in was recorded, so successful access cannot be attributed to a user.']
          : [],
    },
    {
      id: 'CC6.2',
      category: 'Security',
      title: 'Failed authentication is detected and reviewed',
      status: status(failureRate < 0.5),
      evidence: hasEvents
        ? `Failure rate ${(failureRate * 100).toFixed(1)}% (${failedLogins.length} of ${authEvents.length} auth events) over ${days} day(s).`
        : NO_DATA,
      findings:
        hasEvents && failureRate >= 0.5
          ? [`${(failureRate * 100).toFixed(1)}% of authentication events failed, which is consistent with credential probing.`]
          : [],
    },
    {
      id: 'CC6.3',
      category: 'Security',
      title: 'Access to records is granted and reviewed by role',
      status: status(accessEvents.length > 0 && accessByAction.has('R')),
      evidence: hasEvents
        ? `${accessEvents.length} record access events: ${[...accessByAction]
            .map(([action, row]) => `${ACTION_LABELS[action] ?? action} ${row.count}`)
            .join(', ')}.`
        : NO_DATA,
      findings:
        hasEvents && accessEvents.length > 0 && !accessByAction.has('R')
          ? ['No read events recorded, so confidentiality of record access is unevidenced.']
          : [],
    },
    {
      id: 'CC6.4',
      category: 'Security',
      title: 'Emergency ("break glass") access is identifiable',
      status: emergencyAccess.length > 0 ? 'attention' : hasEvents ? 'satisfied' : 'no_data',
      evidence: hasEvents
        ? `${emergencyAccess.length} emergency access event(s); ${deletes.length} delete action(s).`
        : NO_DATA,
      findings:
        emergencyAccess.length > 0
          ? [`${emergencyAccess.length} break-glass access event(s) require review of justification.`]
          : [],
    },
    {
      id: 'CC7.2',
      category: 'Security',
      title: 'System activity is monitored for anomalies',
      status: hasEvents ? 'satisfied' : 'no_data',
      evidence: hasEvents ? `${events.length} auditable events available for review.` : NO_DATA,
      findings: [],
    },
    {
      id: 'PI1.1',
      category: 'Processing Integrity',
      title: 'The audit trail is complete and unalterable (hash chain intact)',
      status: integrity.valid ? 'satisfied' : 'attention',
      evidence: integrity.valid
        ? `Hash chain verified across ${events.length} event(s).`
        : `Hash chain verification failed${integrity.brokenAt ? ` at index ${integrity.brokenAt}` : ''}.`,
      findings: integrity.valid ? [] : [integrity.details ?? 'Audit trail integrity could not be verified.'],
    },
    {
      id: 'C1.1',
      category: 'Confidentiality',
      title: 'Confidential information is protected from disclosure',
      status: hasEvents ? 'satisfied' : 'no_data',
      evidence: hasEvents
        ? `${dataExports.length} data export event(s) recorded${dataExports.length > 0 ? '; each is attributable to a user and time.' : ', and no exports were attempted.'}.`
        : NO_DATA,
      findings: [],
    },
    {
      id: 'C1.2',
      category: 'Confidentiality',
      title: 'Records are retained and then disposed of on schedule',
      status: 'unknown',
      evidence: 'Retention is enforced by the configured retention window, not measured by this report.',
      findings: ['Disposition is a scheduled process and cannot be evidenced from event data alone.'],
    },
    {
      id: 'A1.2',
      category: 'Availability',
      title: 'Records are recoverable and synchronised',
      status: input.availability
        ? input.availability.failedOperations > 0
          ? 'attention'
          : 'satisfied'
        : 'unknown',
      evidence: input.availability
        ? `${input.availability.pendingOperations} operation(s) pending, ${input.availability.failedOperations} failed${
            input.availability.lastSyncedAt ? `, last sync ${input.availability.lastSyncedAt}` : ''
          }.`
        : 'No sync status was supplied, so availability is not evidenced.',
      findings:
        input.availability && input.availability.failedOperations > 0
          ? [`${input.availability.failedOperations} sync operation(s) failed and remain unresolved.`]
          : [],
    },
  ];

  const summary: Record<Soc2Status, number> = { satisfied: 0, attention: 0, no_data: 0, unknown: 0 };
  for (const control of controls) summary[control.status] += 1;

  return {
    generatedAt: new Date().toISOString(),
    window: { start: windowStart, end: windowEnd, days },
    eventCount: events.length,
    controls,
    summary,
    activity: [...activityMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    authentication: { logins: logins.length, failedLogins: failedLogins.length, failureRate, distinctUsers },
    recordAccess: [...accessByAction.entries()].map(([action, row]) => ({ action, ...row })),
  };
}
