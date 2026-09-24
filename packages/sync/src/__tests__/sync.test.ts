import {
  VectorClockManager,
  VectorClockSchema,
  OperationFactory,
  OperationHasher,
  ConflictResolver,
  SyncEngine,
  type SyncConfig,
} from '../index';

const DEVICE_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const DEVICE_B = '01M3A7AHHP3FWBD74PAYCKE728';
const RES_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

describe('VectorClockManager', () => {
  test('increment bumps only the given device', () => {
    const next = VectorClockManager.increment({ a: 1 }, 'b');
    expect(next).toEqual({ a: 1, b: 1 });
  });

  test('merge takes element-wise max', () => {
    const merged = VectorClockManager.merge({ a: 2, b: 1 }, { a: 1, b: 3, c: 1 });
    expect(merged).toEqual({ a: 2, b: 3, c: 1 });
  });

  test('compare detects before/after/concurrent/equal relationships', () => {
    expect(VectorClockManager.compare({ a: 1 }, { a: 2 })).toBe('before');
    expect(VectorClockManager.compare({ a: 2 }, { a: 1 })).toBe('after');
    expect(VectorClockManager.compare({ a: 1, b: 1 }, { a: 2, b: 0 })).toBe('concurrent');
    expect(VectorClockManager.compare({ a: 1 }, { a: 1 })).toBe('equal');
  });

  test('isDescendant checks happened-after relation', () => {
    expect(VectorClockManager.isDescendant({ a: 3 }, { a: 1 })).toBe(true);
    expect(VectorClockManager.isDescendant({ a: 1 }, { a: 3 })).toBe(false);
  });

  test('prune keeps only the most recent entries', () => {
    const clock = { a: 1, b: 5, c: 3, d: 7 };
    const pruned = VectorClockManager.prune(clock, 2);
    expect(Object.keys(pruned).length).toBe(2);
    expect(pruned.d).toBe(7);
    expect(pruned.b).toBe(5);
  });

  test('schema accepts only non-negative integers', () => {
    expect(VectorClockSchema.safeParse({ a: 1, b: 0 }).success).toBe(true);
    expect(VectorClockSchema.safeParse({ a: -1 }).success).toBe(false);
    expect(VectorClockSchema.safeParse({ a: 1.5 }).success).toBe(false);
  });
});

describe('OperationFactory', () => {
  test('creates a validated create operation', () => {
    const op = OperationFactory.create('create', 'Patient', RES_ID, DEVICE_A, { [DEVICE_A]: 1 }, { id: RES_ID });
    expect(op.id).toBeDefined();
    expect(op.type).toBe('create');
    expect(op.author).toBe(DEVICE_A);
    expect(op.priority).toBe(0);
  });

  test('createFromResource assigns clinical priority by resource type', () => {
    const medOp = OperationFactory.createFromResource(
      { resourceType: 'MedicationAdministration', id: RES_ID },
      DEVICE_A,
      {},
      'create'
    );
    const patientOp = OperationFactory.createFromResource(
      { resourceType: 'Patient', id: RES_ID },
      DEVICE_A,
      {},
      'create'
    );
    expect(medOp.priority).toBe(95);
    expect(patientOp.priority).toBe(50);
  });
});

describe('OperationHasher', () => {
  test('produces a stable sha256 hash and verifies it', () => {
    const op = OperationFactory.create('update', 'Encounter', RES_ID, DEVICE_A, { [DEVICE_A]: 2 }, { v: 'x' });
    const hash = OperationHasher.hash(op);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(OperationHasher.verify(op, hash)).toBe(true);
    expect(OperationHasher.verify({ ...op, data: { v: 'tampered' } }, hash)).toBe(false);
  });
});

describe('ConflictResolver', () => {
  const base: SyncConfig = { deviceId: DEVICE_A };

  test('last-writer-wins prefers the newer timestamp', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const older = OperationFactory.create('update', 'Patient', RES_ID, DEVICE_A, { a: 1 }, { v: 'old' });
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:05Z'));
    const newer = OperationFactory.create('update', 'Patient', RES_ID, DEVICE_B, { b: 1 }, { v: 'new' });
    jest.useRealTimers();

    const resolver = new ConflictResolver({ ...base, conflictResolution: 'last-writer-wins' });
    expect(resolver.resolve(older, newer).data).toEqual({ v: 'new' });
  });

  test('clinical-priority prefers higher clinical priority over newer timestamp', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:05Z'));
    const lower = OperationFactory.create('update', 'Patient', RES_ID, DEVICE_A, { v: 1 }, { v: 'patient' }, undefined, 50);
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const higher = OperationFactory.create('update', 'Observation', RES_ID, DEVICE_B, { v: 2 }, { v: 'obs' }, undefined, 90);
    jest.useRealTimers();

    const resolver = new ConflictResolver({ ...base, conflictResolution: 'clinical-priority' });
    expect(resolver.resolve(lower, higher).priority).toBe(90);
  });

  test('manual mode throws asking for human intervention', () => {
    const resolver = new ConflictResolver({ ...base, conflictResolution: 'manual' });
    const op = OperationFactory.create('update', 'Patient', RES_ID, DEVICE_A, { a: 1 });
    expect(() => resolver.resolve(op, op)).toThrow(/Manual conflict resolution/);
  });
});

describe('SyncEngine', () => {
  const config: SyncConfig = { deviceId: DEVICE_A };

  test('initializes with the configured device id', () => {
    const engine = new SyncEngine(config);
    expect(engine.getState().deviceId).toBe(DEVICE_A);
    engine.destroy();
  });

  test('creates operations and bumps the local vector clock', () => {
    const engine = new SyncEngine(config);
    const before = engine.getVectorClock()[DEVICE_A] || 0;
    engine.createOperation('create', 'Patient', RES_ID, { id: RES_ID });
    const after = engine.getVectorClock()[DEVICE_A] || 0;
    expect(after).toBe(before + 1);
    engine.destroy();
  });

  test('applies a remote operation cleanly when there is no local conflict', async () => {
    const engine = new SyncEngine(config);
    const remote = OperationFactory.create('update', 'Patient', RES_ID, DEVICE_B, { [DEVICE_B]: 7 }, { v: 'B' }, undefined, 55);
    const res = await engine.applyRemoteOperation(remote);
    expect(res.success).toBe(true);
    expect(res.conflict).toBeUndefined();
    engine.destroy();
  });

  test('serialize/deserialize round-trips state', () => {
    const engine = new SyncEngine(config);
    engine.createOperation('create', 'Patient', RES_ID, { id: RES_ID });
    const serialized = engine.serialize();
    const restored = SyncEngine.deserialize(serialized);
    expect(restored.getVectorClock()).toEqual(engine.getVectorClock());
    engine.destroy();
    restored.destroy();
  });
});