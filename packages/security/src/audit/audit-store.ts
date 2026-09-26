import type { AuditEvent } from '@prehospital-epr/core';

/**
 * Filter accepted by {@link AuditStore.query} and {@link AuditStore.count}.
 *
 * Dates are ISO-8601 instants and are matched inclusively on both ends.
 */
export interface AuditQuery {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  outcome?: string;
  eventType?: string;
  eventSubtype?: string;
  limit?: number;
  offset?: number;
}

/**
 * Append-only persistence for audit events.
 *
 * SOC 2 CC7.2 and processing integrity both depend on the audit trail being
 * complete and unalterable, so the interface deliberately has no update or
 * delete. Corrections are recorded as new events, the way a clinical record is
 * amended rather than rewritten.
 */
export interface AuditStore {
  /** Append a batch. Implementations must preserve order and reject duplicates by id. */
  append(events: AuditEvent[]): Promise<void>;
  /** Return events newest-first, filtered. */
  query(filter?: AuditQuery): Promise<AuditEvent[]>;
  /** Number of events matching the filter, ignoring limit/offset. */
  count(filter?: AuditQuery): Promise<number>;
  /** Every retained event in append order, used to rehydrate the integrity chain. */
  all(): Promise<AuditEvent[]>;
  /** Remove events recorded before an instant. Returns how many were removed. */
  prune(before: string): Promise<number>;
}

/**
 * First coding of a `type`/`subtype`.
 *
 * The schema types `type` as a single CodeableConcept and `subtype` as an
 * array, so both shapes are handled rather than assumed.
 */
const codeOf = (event: AuditEvent, kind: 'type' | 'subtype'): string | undefined => {
  const value = event[kind];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.coding?.[0]?.code;
};

const referenceOf = (event: AuditEvent, agent: boolean): string | undefined =>
  agent ? event.agent?.[0]?.who?.reference : event.entity?.[0]?.what?.reference;

export function matchesAuditQuery(event: AuditEvent, filter: AuditQuery = {}): boolean {
  if (filter.userId) {
    const reference = referenceOf(event, true);
    if (!reference || !reference.includes(filter.userId)) return false;
  }
  if (filter.resourceType || filter.resourceId) {
    const reference = referenceOf(event, false) ?? '';
    const [type, id] = reference.split('/');
    if (filter.resourceType && type !== filter.resourceType) return false;
    if (filter.resourceId && id !== filter.resourceId) return false;
  }
  if (filter.action && event.action !== filter.action) return false;
  if (filter.outcome && event.outcome !== filter.outcome) return false;
  if (filter.eventType && codeOf(event, 'type') !== filter.eventType) return false;
  if (filter.eventSubtype && codeOf(event, 'subtype') !== filter.eventSubtype) return false;
  if (filter.startDate && Date.parse(event.recorded) < Date.parse(filter.startDate)) return false;
  if (filter.endDate && Date.parse(event.recorded) > Date.parse(filter.endDate)) return false;
  return true;
}

/**
 * Sort newest-first. Ties break on id so pagination is stable when several
 * events share a millisecond.
 */
export function sortNewestFirst(events: AuditEvent[]): AuditEvent[] {
  return [...events].sort((a, b) => {
    const delta = Date.parse(b.recorded) - Date.parse(a.recorded);
    return delta !== 0 ? delta : b.id.localeCompare(a.id);
  });
}

/** Applies limit/offset to an already-filtered, newest-first list. */
export function paginate<T>(events: T[], filter: AuditQuery = {}): T[] {
  const offset = filter.offset ?? 0;
  const limited = filter.limit === undefined ? events.slice(offset) : events.slice(offset, offset + filter.limit);
  return limited;
}

/**
 * Process-lifetime store. Used by tests and by platforms with no persistence
 * configured, so audit recording degrades to "kept in memory" rather than
 * silently throwing.
 */
export class MemoryAuditStore implements AuditStore {
  private events: AuditEvent[] = [];
  private readonly ids = new Set<string>();

  async append(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      if (this.ids.has(event.id)) continue;
      this.ids.add(event.id);
      this.events.push(event);
    }
  }

  async query(filter: AuditQuery = {}): Promise<AuditEvent[]> {
    return paginate(sortNewestFirst(this.events.filter(e => matchesAuditQuery(e, filter))), filter);
  }

  async count(filter: AuditQuery = {}): Promise<number> {
    return this.events.filter(e => matchesAuditQuery(e, filter)).length;
  }

  async all(): Promise<AuditEvent[]> {
    return [...this.events];
  }

  async prune(before: string): Promise<number> {
    const cutoff = Date.parse(before);
    const kept = this.events.filter(e => Date.parse(e.recorded) >= cutoff);
    const removed = this.events.length - kept.length;
    this.events = kept;
    this.ids.clear();
    for (const event of kept) this.ids.add(event.id);
    return removed;
  }
}
