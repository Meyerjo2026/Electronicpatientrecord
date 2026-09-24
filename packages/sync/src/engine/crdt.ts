import { z } from 'zod';
import { ulid } from 'ulid';
import * as CryptoJS from 'crypto-js';

export const VectorClockSchema = z.record(z.string(), z.number().int().nonnegative());

export type VectorClock = z.infer<typeof VectorClockSchema>;

export const OperationTypeSchema = z.enum(['create', 'update', 'delete', 'patch']);

export const OperationSchema = z.object({
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  type: OperationTypeSchema,
  resourceType: z.string(),
  resourceId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  timestamp: z.string().datetime(),
  author: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  vectorClock: VectorClockSchema,
  data: z.any().optional(),
  patch: z.array(z.object({
    op: z.enum(['add', 'remove', 'replace', 'move', 'copy', 'test']),
    path: z.string(),
    value: z.any().optional(),
    from: z.string().optional()
  })).optional(),
  priority: z.number().int().default(0),
  metadata: z.record(z.any()).optional()
});

export type Operation = z.infer<typeof OperationSchema>;

export const SyncStateSchema = z.object({
  deviceId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  lastSync: z.string().datetime().optional(),
  vectorClock: VectorClockSchema,
  pendingOperations: z.array(OperationSchema),
  syncedOperations: z.array(z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)),
  conflicts: z.array(z.object({
    operationId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
    localOperation: OperationSchema,
    remoteOperation: OperationSchema,
    resolved: z.boolean(),
    resolution: OperationSchema.optional(),
    resolvedAt: z.string().datetime().optional()
  })).optional()
});

export type SyncState = z.infer<typeof SyncStateSchema>;

export const SyncConfigSchema = z.object({
  deviceId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  maxPendingOperations: z.number().int().positive().default(10000),
  maxVectorClockSize: z.number().int().positive().default(1000),
  syncInterval: z.number().int().positive().default(30000),
  conflictResolution: z.enum(['last-writer-wins', 'clinical-priority', 'manual', 'merge']).default('clinical-priority'),
  priorityWeights: z.object({
    clinical: z.number().default(100),
    temporal: z.number().default(10),
    device: z.number().default(1)
  }).default({}),
  batchSize: z.number().int().positive().default(100),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(true)
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export class VectorClockManager {
  static increment(clock: VectorClock, deviceId: string): VectorClock {
    const newClock = { ...clock };
    newClock[deviceId] = (newClock[deviceId] || 0) + 1;
    return newClock;
  }

  static merge(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = { ...clock1 };
    for (const [device, time] of Object.entries(clock2)) {
      merged[device] = Math.max(merged[device] || 0, time);
    }
    return merged;
  }

  static compare(clock1: VectorClock, clock2: VectorClock): 'before' | 'after' | 'concurrent' | 'equal' {
    let clock1Greater = false;
    let clock2Greater = false;

    const allDevices = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

    for (const device of allDevices) {
      const t1 = clock1[device] || 0;
      const t2 = clock2[device] || 0;
      if (t1 > t2) clock1Greater = true;
      if (t2 > t1) clock2Greater = true;
    }

    if (clock1Greater && !clock2Greater) return 'after';
    if (clock2Greater && !clock1Greater) return 'before';
    if (!clock1Greater && !clock2Greater) return 'equal';
    return 'concurrent';
  }

  static isDescendant(clock1: VectorClock, clock2: VectorClock): boolean {
    // Returns true if clock1 is a descendant of clock2 (clock1 happened after clock2)
    for (const [device, time] of Object.entries(clock2)) {
      if ((clock1[device] || 0) < time) return false;
    }
    return true;
  }

  static prune(clock: VectorClock, maxSize: number): VectorClock {
    if (Object.keys(clock).length <= maxSize) return clock;
    
    // Keep the most recent entries
    const sorted = Object.entries(clock)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxSize);
    
    return Object.fromEntries(sorted);
  }
}

export class OperationFactory {
  static create(
    type: 'create' | 'update' | 'delete' | 'patch',
    resourceType: string,
    resourceId: string,
    author: string,
    vectorClock: VectorClock,
    data?: any,
    patch?: Operation['patch'],
    priority: number = 0
  ): Operation {
    return OperationSchema.parse({
      id: ulid(),
      type,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
      author,
      vectorClock,
      data,
      patch,
      priority
    });
  }

  static createFromResource(
    resource: any,
    author: string,
    vectorClock: VectorClock,
    type: 'create' | 'update' = 'create'
  ): Operation {
    return this.create(
      type,
      resource.resourceType,
      resource.id,
      author,
      vectorClock,
      resource,
      undefined,
      this.calculateClinicalPriority(resource)
    );
  }

  private static calculateClinicalPriority(resource: any): number {
    // Higher priority for critical clinical data
    const priorities: Record<string, number> = {
      Observation: 90,      // Vital signs
      MedicationAdministration: 95,  // Medications
      Procedure: 95,        // Procedures
      Condition: 80,        // Diagnoses
      Encounter: 70,        // Encounter status
      Patient: 50,          // Demographics
      AuditEvent: 10,       // Audit logs
      Consent: 60           // Consent
    };
    return priorities[resource.resourceType] || 10;
  }
}

export class OperationHasher {
  private static canonicalize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map(v => this.canonicalize(v)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      return `{${Object.keys(obj)
        .sort()
        .map(k => `${JSON.stringify(k)}:${this.canonicalize(obj[k])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  static hash(operation: Operation): string {
    const canonical = this.canonicalize({
      id: operation.id,
      type: operation.type,
      resourceType: operation.resourceType,
      resourceId: operation.resourceId,
      timestamp: operation.timestamp,
      author: operation.author,
      vectorClock: operation.vectorClock,
      data: operation.data,
      patch: operation.patch
    });

    return CryptoJS.SHA256(canonical).toString(CryptoJS.enc.Hex);
  }

  static verify(operation: Operation, expectedHash: string): boolean {
    return this.hash(operation) === expectedHash;
  }
}

export class ConflictResolver {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  resolve(local: Operation, remote: Operation): Operation {
    switch (this.config.conflictResolution) {
      case 'last-writer-wins':
        return this.lastWriterWins(local, remote);
      case 'clinical-priority':
        return this.clinicalPriority(local, remote);
      case 'merge':
        return this.merge(local, remote);
      case 'manual':
      default:
        // Mark for manual resolution
        throw new Error('Manual conflict resolution required');
    }
  }

  private lastWriterWins(local: Operation, remote: Operation): Operation {
    return new Date(local.timestamp) > new Date(remote.timestamp) ? local : remote;
  }

  private clinicalPriority(local: Operation, remote: Operation): Operation {
    if (local.priority !== remote.priority) {
      return local.priority > remote.priority ? local : remote;
    }
    // Fallback to timestamp
    return this.lastWriterWins(local, remote);
  }

  private merge(local: Operation, remote: Operation): Operation {
    // For patch operations, attempt to merge patches
    if (local.type === 'patch' && remote.type === 'patch' && local.patch && remote.patch) {
      const mergedPatch = this.mergePatches(local.patch, remote.patch);
      return {
        ...local,
        id: ulid(),
        patch: mergedPatch,
        vectorClock: VectorClockManager.merge(local.vectorClock, remote.vectorClock),
        timestamp: new Date().toISOString()
      };
    }
    // For full resource updates, prefer the one with more recent clinical data
    return this.clinicalPriority(local, remote);
  }

  private mergePatches(localPatch: Operation['patch'], remotePatch: Operation['patch']): Operation['patch'] {
    if (!localPatch || !remotePatch) return localPatch || remotePatch;
    
    const merged = [...localPatch];
    const localPaths = new Set(localPatch.map(p => p.path));
    
    for (const remoteOp of remotePatch) {
      if (!localPaths.has(remoteOp.path)) {
        merged.push(remoteOp);
      } else {
        // Path conflict - use timestamp
        const localOp = localPatch.find(p => p.path === remoteOp.path);
        if (localOp && new Date(remoteOp.value?.timestamp || 0) > new Date(localOp.value?.timestamp || 0)) {
          const idx = merged.findIndex(p => p.path === remoteOp.path);
          if (idx >= 0) merged[idx] = remoteOp;
        }
      }
    }
    
    return merged;
  }
}