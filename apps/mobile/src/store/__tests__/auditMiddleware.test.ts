import { ulid } from 'ulid';
import type { AuditEvent } from '@prehospital-epr/core';
import { AuditService } from '@prehospital-epr/security';
import { MemoryAuditStore } from '@prehospital-epr/security';
import {
  PersistentAuditStore,
  type KeyValueBackend,
} from '../../security/persistent-audit-store';
import { createAuditMiddleware } from '../auditMiddleware';

const at = (offsetMinutes: number) => new Date(Date.now() - offsetMinutes * 60_000).toISOString();

function event(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: ulid(),
    resourceType: 'AuditEvent',
    recorded: at(0),
    action: 'R',
    outcome: '0',
    type: { coding: [{ system: 'x', code: 'rest' }] },
    agent: [{ who: { reference: `Practitioner/${ulid()}` }, requestor: true }],
    entity: [{ what: { reference: `Patient/${ulid()}` } }],
    ...overrides,
  } as AuditEvent;
}

/** In-memory stand-in for AsyncStorage. */
class FakeBackend implements KeyValueBackend {
  readonly map = new Map<string, string>();
  private counter = 0;

  async getAllKeys() {
    this.counter += 1;
    return [...this.map.keys()];
  }

  async multiGet(keys: string[]) {
    return keys.map(k => [k, this.map.get(k) ?? null] as [string, string | null]);
  }

  async multiSet(pairs: readonly (readonly [string, string])[]) {
    for (const [key, value] of pairs) this.map.set(key, value);
  }

  async multiRemove(keys: string[]) {
    for (const key of keys) this.map.delete(key);
  }
}

describe('PersistentAuditStore', () => {
  test('persists events so they outlive the process', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend);

    await store.append([event(), event()]);
    expect(backend.map.size).toBe(2);

    // A new instance over the same storage sees the same trail, as a restart would.
    const afterRestart = new PersistentAuditStore(backend);
    expect(await afterRestart.count()).toBe(2);
  });

  test('is idempotent when the same event is appended twice', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend);
    const one = event();

    await store.append([one]);
    await store.append([one]);
    expect(await store.count()).toBe(1);
  });

  test('stores one key per event and orders keys chronologically', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend);

    const older = event({ recorded: at(30) });
    const newer = event({ recorded: at(1) });
    await store.append([newer, older]);

    const keys = [...backend.map.keys()];
    expect(keys).toHaveLength(2);
    expect(keys[0] < keys[1]).toBe(true);
    expect((await store.all()).map(e => e.id)).toEqual([older.id, newer.id]);
  });

  test('never rewrites an existing event in place', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend);
    const original = event({ action: 'R' });

    await store.append([original]);
    // A correction is a new event, exactly as in a clinical record.
    await store.append([event({ action: 'U' })]);

    const all = await store.all();
    expect(all).toHaveLength(2);
    expect(all.map(e => e.action).sort()).toEqual(['R', 'U']);
  });

  test('queries and filters the persisted trail', async () => {
    const store = new PersistentAuditStore(new FakeBackend());
    const userId = ulid();
    // Distinct timestamps: same-millisecond events fall back to an id
    // comparison, which would make the ordering assertion nondeterministic.
    await store.append([
      event({ recorded: at(5), agent: [{ who: { reference: `Practitioner/${userId}` }, requestor: true }] }),
      event({ recorded: at(1), action: 'D', outcome: '4' }),
    ]);

    expect(await store.count({ userId })).toBe(1);
    expect(await store.count({ action: 'D' })).toBe(1);
    expect((await store.query()).map(e => e.action)).toEqual(['D', 'R']);
    expect(await store.count({ limit: 1 })).toBe(2);
  });

  test('prunes events older than the cutoff', async () => {
    const store = new PersistentAuditStore(new FakeBackend());
    await store.append([event({ recorded: at(60 * 24 * 90) }), event({ recorded: at(1) })]);
    expect(await store.prune(at(60 * 24 * 30))).toBe(1);
    expect(await store.count()).toBe(1);
  });

  test('drops the oldest events once the cap is exceeded', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend, { maxEvents: 3 });

    for (let i = 0; i < 5; i += 1) {
      await store.append([event({ recorded: at(60 - i) })]);
    }
    expect(await store.count()).toBe(3);
  });

  test('applies a codec to every payload', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend, {
      codec: { encode: () => 'sealed', decode: () => event({ id: 'decoded' }) },
    });

    await store.append([event()]);
    expect([...backend.map.values()]).toEqual(['sealed']);
    expect((await store.all())[0].id).toBe('decoded');
  });

  test('survives one unreadable record without hiding the rest', async () => {
    const backend = new FakeBackend();
    const store = new PersistentAuditStore(backend);
    const good = event();
    await store.append([good]);

    const [key] = [...backend.map.keys()];
    backend.map.set(key, '{ not json');

    expect(await store.count()).toBe(0);
  });
});

describe('audit middleware', () => {
  const run = async (actions: Array<{ type: string; payload?: unknown }>, session?: unknown) => {
    const memory = new MemoryAuditStore();
    const service = new AuditService({ flushInterval: 60_000, batchSize: 1000 }, memory);
    const middleware = createAuditMiddleware(service);

    const next = jest.fn(action => action);
    const dispatched: unknown[] = [];
    const api = { getState: () => ({ auth: { session } }) };
    const dispatch = (middleware as any)(api)(next);

    for (const action of actions) {
      dispatched.push(dispatch(action));
    }
    // Let the fire-and-forget audit writes settle.
    await new Promise(resolve => setTimeout(resolve, 0));
    service.shutdown();
    return { service, memory, next, dispatched };
  };

  test('records a successful sign-in against the session user', async () => {
    const userId = ulid();
    const { memory } = await run(
      [{ type: 'auth/login/fulfilled', payload: { id: 'session-1' } }],
      { userId, roles: ['EMS_SUPERVISOR'] }
    );

    const events = await memory.all();
    expect(events).toHaveLength(1);
    expect(events[0].subtype?.[0]?.coding?.[0]?.code).toBe('login');
    expect(events[0].agent?.[0]?.who?.reference).toBe(`Practitioner/${userId}`);
  });

  test('records a failed sign-in with a failure outcome', async () => {
    const { memory } = await run(
      [{ type: 'auth/login/rejected', payload: 'Invalid credentials' }],
      { userId: ulid(), roles: ['EMS_PROVIDER'] }
    );

    const events = await memory.all();
    expect(events[0].subtype?.[0]?.coding?.[0]?.code).toBe('failed-login');
    expect(events[0].outcome).not.toBe('0');
  });

  test('records record access with the right FHIR action', async () => {
    const userId = ulid();
    const patientId = ulid();
    const { memory } = await run(
      [
        { type: 'patient/addPatient', payload: { id: patientId } },
        { type: 'patient/setCurrentPatient', payload: { id: patientId } },
        { type: 'patient/updatePatient', payload: { id: patientId } },
        { type: 'patient/removePatient', payload: patientId },
      ],
      { userId, roles: ['EMS_ADMIN'] }
    );

    const events = await memory.all();
    expect(events).toHaveLength(4);
    expect(events.map(e => e.action).sort()).toEqual(['C', 'D', 'R', 'U']);
    expect(events.every(e => e.entity?.[0]?.what?.reference === `Patient/${patientId}`)).toBe(true);
  });

  test('records medication and procedure administration', async () => {
    const { memory } = await run(
      [
        { type: 'intervention/recordMedication/fulfilled', payload: { id: 'med-1' } },
        { type: 'intervention/recordProcedure/fulfilled', payload: { id: 'proc-1' } },
      ],
      { userId: ulid(), roles: ['EMS_PROVIDER'] }
    );

    const events = await memory.all();
    expect(events).toHaveLength(2);
    expect(events.every(e => e.type?.coding?.[0]?.code === 'clinical')).toBe(true);
  });

  test('records sync success and failure', async () => {
    const { memory } = await run(
      [
        { type: 'sync/syncNow/fulfilled', payload: { syncedCount: 5 } },
        { type: 'sync/syncNow/rejected', payload: 'offline' },
      ],
      { userId: ulid(), roles: ['EMS_PROVIDER'] }
    );

    const events = await memory.all();
    expect(events).toHaveLength(2);
    expect(events.filter(e => e.outcome === '0')).toHaveLength(1);
    expect(events.filter(e => e.outcome !== '0')).toHaveLength(1);
  });

  test('ignores actions that are not auditable', async () => {
    const { memory, next } = await run(
      [{ type: 'ui/setTheme', payload: 'dark' }, { type: 'patient/clearError' }],
      { userId: ulid(), roles: ['EMS_PROVIDER'] }
    );

    expect(await memory.count()).toBe(0);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('still dispatches the action and returns its result', async () => {
    const { dispatched, next } = await run([{ type: 'ui/setTheme' }], undefined);
    expect(next).toHaveBeenCalled();
    expect(dispatched).toEqual([{ type: 'ui/setTheme' }]);
  });

  test('does not throw when there is no session yet', async () => {
    const { memory } = await run([{ type: 'auth/login/fulfilled', payload: {} }], undefined);
    const events = await memory.all();
    expect(events[0].agent?.[0]?.who?.reference).toBe('Practitioner/unknown');
  });
});
