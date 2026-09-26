import { ulid } from 'ulid';
import { AuditService } from '../audit/audit-service';
import { MemoryAuditStore, matchesAuditQuery, sortNewestFirst } from '../audit/audit-store';
import { buildSoc2Posture } from '../compliance/soc2-analytics';
import type { AuditEvent } from '@prehospital-epr/core';

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

describe('MemoryAuditStore', () => {
  test('is append-only and ignores duplicate ids', async () => {
    const store = new MemoryAuditStore();
    const one = event();
    await store.append([one]);
    await store.append([one]);
    expect(await store.count()).toBe(1);
  });

  test('returns newest first and paginates stably', async () => {
    const store = new MemoryAuditStore();
    const older = event({ recorded: at(10) });
    const newer = event({ recorded: at(1) });
    await store.append([older, newer]);

    const all = await store.query();
    expect(all.map(e => e.id)).toEqual([newer.id, older.id]);
    expect((await store.query({ limit: 1 })).map(e => e.id)).toEqual([newer.id]);
    expect((await store.query({ limit: 1, offset: 1 })).map(e => e.id)).toEqual([older.id]);
  });

  test('filters by agent, entity, action, outcome, type and date', async () => {
    const store = new MemoryAuditStore();
    const userId = ulid();
    const patientId = ulid();
    await store.append([
      event({
        recorded: at(5),
        agent: [{ who: { reference: `Practitioner/${userId}` }, requestor: true }],
        entity: [{ what: { reference: `Patient/${patientId}` } }],
      }),
      event({ action: 'D', outcome: '4' }),
      event({ type: { coding: [{ system: 'x', code: 'auth' }] }, subtype: [{ coding: [{ system: 'x', code: 'failed-login' }] }] }),
    ]);

    expect(await store.count({ userId })).toBe(1);
    expect(await store.count({ resourceType: 'Patient', resourceId: patientId })).toBe(1);
    expect(await store.count({ action: 'D' })).toBe(1);
    expect(await store.count({ outcome: '4' })).toBe(1);
    expect(await store.count({ eventType: 'auth' })).toBe(1);
    expect(await store.count({ eventSubtype: 'failed-login' })).toBe(1);
    // The window from 1 minute ago to now excludes the 5-minute-old event.
    expect(await store.count({ startDate: at(1), endDate: at(0) })).toBe(2);
    expect(await store.count({ startDate: at(10), endDate: at(4) })).toBe(1);
    expect(await store.count({ startDate: at(30), endDate: at(20) })).toBe(0);
  });

  test('count ignores limit and offset', async () => {
    const store = new MemoryAuditStore();
    await store.append([event(), event(), event()]);
    expect(await store.count({ limit: 1 })).toBe(3);
  });

  test('prunes expired events and keeps the id set consistent', async () => {
    const store = new MemoryAuditStore();
    const old = event({ recorded: at(60 * 24 * 40) });
    const recent = event({ recorded: at(1) });
    await store.append([old, recent]);

    expect(await store.prune(at(60 * 24 * 30))).toBe(1);
    expect(await store.count()).toBe(1);
    // The pruned id must be reusable, and the kept one must not be duplicated.
    await store.append([old]);
    await store.append([recent]);
    expect(await store.count()).toBe(2);
  });
});

describe('AuditService with a store', () => {
  const services: AuditService[] = [];
  const make = () => {
    const svc = new AuditService({ flushInterval: 60_000, batchSize: 1000 });
    services.push(svc);
    return svc;
  };
  afterEach(() => {
    services.forEach(s => s.shutdown());
    services.length = 0;
  });

  test('queryEvents returns recorded events instead of an empty stub', async () => {
    const svc = make();
    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'update');

    const events = await svc.queryEvents();
    expect(events).toHaveLength(2);
    expect(events[0].recorded >= events[1].recorded).toBe(true);
  });

  test('sees buffered events before a flush', async () => {
    const svc = make();
    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    expect(await svc.countEvents()).toBe(1);
  });

  test('does not double-count an event that a flush already stored', async () => {
    const store = new MemoryAuditStore();
    const svc = new AuditService({ flushInterval: 60_000, batchSize: 2 }, store);
    services.push(svc);

    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    // batchSize 2 triggers an automatic flush during the second log.
    expect(await store.count()).toBe(2);
    expect(await svc.countEvents()).toBe(2);
  });

  test('persists through the injected store on flush', async () => {
    const store = new MemoryAuditStore();
    const svc = new AuditService({ flushInterval: 60_000 }, store);
    services.push(svc);

    await svc.logSecurityEvent('login', ulid(), { device: 'unknown' });
    expect(await store.count()).toBe(0);
    expect(await svc.flush()).toBe(1);
    expect(await store.count()).toBe(1);
  });

  test('distinguishes create, read, update and delete in the access trail', async () => {
    const svc = make();
    const userId = ulid();
    const resourceId = ulid();
    // Regression: the action code used to be looked up by the English word
    // against an enum keyed by the codes, so every event was recorded as 'R'
    // and a delete was indistinguishable from a read.
    for (const action of ['create', 'read', 'update', 'delete'] as const) {
      await svc.logAccess(userId, 'EMS_ADMIN', 'Patient', resourceId, action);
    }
    const codes = (await svc.queryEvents()).map(e => e.action).sort();
    expect(codes).toEqual(['C', 'D', 'R', 'U']);
  });

  test('marks a failed login with a non-success outcome', async () => {
    const svc = make();
    const failed = await svc.logSecurityEvent('failed-login', ulid(), { reason: 'bad password' }, 'failure');
    expect(failed.outcome).not.toBe('0');
  });

  test('prunes beyond the retention window', async () => {
    const store = new MemoryAuditStore();
    const svc = new AuditService({ flushInterval: 60_000, retentionDays: 30 }, store);
    services.push(svc);

    await store.append([event({ recorded: at(60 * 24 * 90) }), event({ recorded: at(1) })]);
    expect(await svc.pruneExpired()).toBe(1);
    expect(await store.count()).toBe(1);
  });

  test('rehydrates the integrity chain from the store and detects tampering', async () => {
    const store = new MemoryAuditStore();
    const first = new AuditService({ flushInterval: 60_000 }, store);
    services.push(first);
    await first.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    await first.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'update');
    await first.flush();
    expect((await store.all()).length).toBe(2);

    // A fresh process reading the same store must rebuild and verify the chain.
    const restarted = new AuditService({ flushInterval: 60_000 }, store);
    services.push(restarted);
    const ok = await restarted.rehydrateIntegrityChain();
    expect(ok.valid).toBe(true);

    const tampered = (await store.all())[0];
    await store.append([]);
    const chain = (restarted as any).integrityChain;
    chain[0].eventId = 'tampered';
    expect((await restarted.verifyIntegrity()).valid).toBe(false);
    expect(tampered).toBeDefined();
  });
});

describe('SOC 2 posture', () => {
  const start = at(60 * 24 * 7);
  const end = at(0);

  test('reports no_data rather than success when nothing was recorded', async () => {
    const svc = new AuditService({ flushInterval: 60_000 });
    const integrity = await svc.verifyIntegrity();
    const posture = buildSoc2Posture({ events: [], windowStart: start, windowEnd: end, integrity });

    expect(posture.eventCount).toBe(0);
    const evidenced = posture.controls.filter(c => c.id !== 'PI1.1' && c.id !== 'C1.2' && c.id !== 'A1.2');
    expect(evidenced.every(c => c.status === 'no_data')).toBe(true);
    expect(evidenced.every(c => c.evidence === 'No audit events recorded in this window.')).toBe(true);
    expect(posture.summary.attention).toBe(0);
    svc.shutdown();
  });

  test('scores satisfied when authentication and reads are recorded', async () => {
    const svc = new AuditService({ flushInterval: 60_000 });
    const user = ulid();
    await svc.logSecurityEvent('login', user, {});
    await svc.logAccess(user, 'EMS_PROVIDER', 'Patient', ulid(), 'read');

    const events = await svc.queryEvents();
    const posture = buildSoc2Posture({ events, windowStart: start, windowEnd: end, integrity: await svc.verifyIntegrity() });

    const byId = (id: string) => posture.controls.find(c => c.id === id)!;
    expect(byId('CC6.1').status).toBe('satisfied');
    expect(byId('CC6.2').status).toBe('satisfied');
    expect(byId('CC6.3').status).toBe('satisfied');
    expect(byId('PI1.1').status).toBe('satisfied');
    expect(posture.authentication.logins).toBe(1);
    expect(posture.authentication.distinctUsers).toBe(1);
    expect(posture.recordAccess).toEqual([{ action: 'R', count: 1, failures: 0 }]);
    svc.shutdown();
  });

  test('flags a failed-login burst as a CC6.2 finding', async () => {
    const svc = new AuditService({ flushInterval: 60_000 });
    const user = ulid();
    for (let i = 0; i < 5; i += 1) {
      await svc.logSecurityEvent('failed-login', user, { attempt: i }, 'failure');
    }

    const events = await svc.queryEvents();
    const posture = buildSoc2Posture({ events, windowStart: start, windowEnd: end, integrity: await svc.verifyIntegrity() });
    const cc62 = posture.controls.find(c => c.id === 'CC6.2')!;

    expect(cc62.status).toBe('attention');
    expect(cc62.findings[0]).toMatch(/credential probing/);
    expect(posture.authentication.failureRate).toBe(1);
    svc.shutdown();
  });

  test('flags break-glass access and failed syncs as findings', async () => {
    const svc = new AuditService({ flushInterval: 60_000 });
    await svc.logSecurityEvent('emergency-access', ulid(), { reason: 'unconscious patient' });
    const events = await svc.queryEvents();
    const posture = buildSoc2Posture({
      events,
      windowStart: start,
      windowEnd: end,
      integrity: await svc.verifyIntegrity(),
      availability: { pendingOperations: 2, failedOperations: 3 },
    });

    expect(posture.controls.find(c => c.id === 'CC6.4')!.status).toBe('attention');
    expect(posture.controls.find(c => c.id === 'A1.2')!.status).toBe('attention');
    svc.shutdown();
  });

  test('reports unknown when availability was not supplied', () => {
    const posture = buildSoc2Posture({
      events: [event()],
      windowStart: start,
      windowEnd: end,
      integrity: { valid: true },
    });
    expect(posture.controls.find(c => c.id === 'A1.2')!.status).toBe('unknown');
  });

  test('surfaces a broken integrity chain as an attention finding', () => {
    const posture = buildSoc2Posture({
      events: [event()],
      windowStart: start,
      windowEnd: end,
      integrity: { valid: false, brokenAt: 3, details: 'Hash mismatch at index 3' },
    });
    const pi11 = posture.controls.find(c => c.id === 'PI1.1')!;
    expect(pi11.status).toBe('attention');
    expect(pi11.findings).toContain('Hash mismatch at index 3');
  });
});

describe('audit query helpers', () => {
  test('sortNewestFirst breaks ties on id', () => {
    const a = event({ recorded: at(0), id: 'a' });
    const b = event({ recorded: at(0), id: 'b' });
    expect(sortNewestFirst([a, b]).map(e => e.id)).toEqual(['b', 'a']);
  });

  test('matchesAuditQuery tolerates an event with no entity', () => {
    expect(matchesAuditQuery(event({ entity: [] }), { resourceType: 'Patient' })).toBe(false);
    expect(matchesAuditQuery(event({ entity: [] }), {})).toBe(true);
  });
});
