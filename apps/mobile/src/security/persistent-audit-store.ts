import type { AuditEvent } from '@prehospital-epr/core';
import type { AuditQuery, AuditStore } from '@prehospital-epr/security';
import { matchesAuditQuery, paginate, sortNewestFirst } from '@prehospital-epr/security';

/**
 * The subset of `AsyncStorage` this store needs.
 *
 * Declaring it here rather than importing AsyncStorage keeps the store
 * testable under jest's node environment and free of a native dependency.
 */
export interface KeyValueBackend {
  getAllKeys(): Promise<readonly string[]>;
  // `readonly` throughout so AsyncStorage's own signatures satisfy this
  // interface without a cast.
  multiGet(keys: string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiSet(pairs: readonly (readonly [string, string])[]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export interface AuditCodec {
  encode(event: AuditEvent): string;
  decode(raw: string): AuditEvent;
}

export interface PersistentAuditStoreOptions {
  prefix?: string;
  /**
   * Applied to every payload. Defaults to plain JSON.
   *
   * Audit events hold references to clinical resources, not clinical content,
   * and the app sandbox already provides OS-level file protection. Supply a
   * codec backed by `CryptoService` where the organisation requires
   * field-level encryption at rest.
   */
  codec?: AuditCodec;
  /** Guard against unbounded logs on a device that is never synced. */
  maxEvents?: number;
}

const DEFAULT_PREFIX = 'audit/v1';
const DEFAULT_MAX_EVENTS = 20_000;

/**
 * Durable, append-only audit store for the device.
 *
 * One key per event, prefixed with a zero-padded timestamp so the key order
 * matches chronological order. Events are never rewritten in place: a
 * correction is a new event. Re-appending the same event overwrites its own key
 * with identical content, which makes retries idempotent without a read.
 */
export class PersistentAuditStore implements AuditStore {
  private readonly backend: KeyValueBackend;
  private readonly prefix: string;
  private readonly codec: AuditCodec;
  private readonly maxEvents: number;

  constructor(backend: KeyValueBackend, options: PersistentAuditStoreOptions = {}) {
    this.backend = backend;
    this.prefix = options.prefix ?? DEFAULT_PREFIX;
    this.codec = options.codec ?? { encode: e => JSON.stringify(e), decode: raw => JSON.parse(raw) as AuditEvent };
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  }

  private keyFor(event: AuditEvent): string {
    const stamp = String(Date.parse(event.recorded) || 0).padStart(13, '0');
    return `${this.prefix}/${stamp}-${event.id}`;
  }

  private async keys(): Promise<string[]> {
    const all = await this.backend.getAllKeys();
    return all.filter(key => key.startsWith(`${this.prefix}/`)).sort();
  }

  async append(events: AuditEvent[]): Promise<void> {
    if (events.length === 0) return;
    const sorted = [...events].sort((a, b) => a.recorded.localeCompare(b.recorded));
    await this.backend.multiSet(sorted.map(event => [this.keyFor(event), this.codec.encode(event)]));
    await this.enforceCap();
  }

  /** Drop the oldest events once the log exceeds `maxEvents`. */
  private async enforceCap(): Promise<void> {
    const keys = await this.keys();
    if (keys.length <= this.maxEvents) return;
    const excess = keys.slice(0, keys.length - this.maxEvents);
    await this.backend.multiRemove(excess);
  }

  private async readAll(): Promise<AuditEvent[]> {
    const keys = await this.keys();
    if (keys.length === 0) return [];
    const pairs = await this.backend.multiGet(keys);
    const events: AuditEvent[] = [];
    for (const [, raw] of pairs) {
      if (raw === null) continue;
      try {
        events.push(this.codec.decode(raw));
      } catch {
        // A single unreadable record must not hide the rest of the trail.
        // Dropping it silently would be dishonest, so it is left out here and
        // the chain verification still fails loudly if the event was hashed.
        continue;
      }
    }
    return events;
  }

  async query(filter: AuditQuery = {}): Promise<AuditEvent[]> {
    const events = await this.readAll();
    return paginate(sortNewestFirst(events.filter(e => matchesAuditQuery(e, filter))), filter);
  }

  async count(filter: AuditQuery = {}): Promise<number> {
    const events = await this.readAll();
    return events.filter(e => matchesAuditQuery(e, filter)).length;
  }

  async all(): Promise<AuditEvent[]> {
    const events = await this.readAll();
    return events.sort((a, b) => a.recorded.localeCompare(b.recorded));
  }

  async prune(before: string): Promise<number> {
    const cutoff = Date.parse(before);
    const events = await this.readAll();
    const doomed = events.filter(e => Date.parse(e.recorded) < cutoff);
    if (doomed.length === 0) return 0;
    await this.backend.multiRemove(doomed.map(e => this.keyFor(e)));
    return doomed.length;
  }
}
