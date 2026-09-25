import { z } from 'zod';
import type {
  Operation,
  VectorClock,
  SyncState,
  SyncConfig,
} from './crdt';
import {
  OperationSchema,
  SyncStateSchema,
  SyncConfigSchema,
  VectorClockManager,
  OperationFactory,
  ConflictResolver,
} from './crdt';

export const SyncEventSchema = z.object({
  type: z.enum([
    'sync-started',
    'sync-completed',
    'sync-failed',
    'operation-created',
    'operation-applied',
    'operation-rejected',
    'conflict-detected',
    'conflict-resolved',
    'state-saved',
    'state-loaded',
    'peer-connected',
    'peer-disconnected'
  ]),
  timestamp: z.string().datetime(),
  deviceId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  data: z.any().optional(),
  error: z.string().optional()
});

export type SyncEvent = z.infer<typeof SyncEventSchema>;

export type SyncEventListener = (event: SyncEvent) => void;

export class SyncEngine {
  private config: SyncConfig;
  private state: SyncState;
  private listeners: Set<SyncEventListener> = new Set();
  private conflictResolver: ConflictResolver;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingOutbox: Operation[] = [];
  private appliedOperations: Set<string> = new Set();

  constructor(config: SyncConfig) {
    this.config = SyncConfigSchema.parse(config);
    this.state = this.initializeState();
    this.conflictResolver = new ConflictResolver(this.config);
  }

  private initializeState(): SyncState {
    return SyncStateSchema.parse({
      deviceId: this.config.deviceId,
      vectorClock: {},
      pendingOperations: [],
      syncedOperations: []
    });
  }

  // Event system
  on(eventListener: SyncEventListener): () => void {
    this.listeners.add(eventListener);
    return () => this.listeners.delete(eventListener);
  }

  private emit(event: Omit<SyncEvent, 'timestamp' | 'deviceId'>): void {
    const fullEvent: SyncEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      deviceId: this.config.deviceId
    };
    this.listeners.forEach(listener => {
      try {
        listener(fullEvent);
      } catch (e) {
        console.error('Sync event listener error:', e);
      }
    });
  }

  // State management
  getState(): SyncState {
    return { ...this.state };
  }

  getVectorClock(): VectorClock {
    return { ...this.state.vectorClock };
  }

  // Operation creation
  createOperation(
    type: 'create' | 'update' | 'delete' | 'patch',
    resourceType: string,
    resourceId: string,
    data?: any,
    patch?: Operation['patch'],
    priority?: number
  ): Operation {
    const vectorClock = VectorClockManager.increment(this.state.vectorClock, this.config.deviceId);
    this.state.vectorClock = vectorClock;

    const operation = OperationFactory.create(
      type,
      resourceType,
      resourceId,
      this.config.deviceId,
      vectorClock,
      data,
      patch,
      priority
    );

    this.addToOutbox(operation);
    this.emit({ type: 'operation-created', data: operation });
    return operation;
  }

  createOperationFromResource(
    resource: any,
    type: 'create' | 'update' = 'create'
  ): Operation {
    const operation = OperationFactory.createFromResource(
      resource,
      this.config.deviceId,
      this.state.vectorClock,
      type
    );
    this.addToOutbox(operation);
    this.emit({ type: 'operation-created', data: operation });
    return operation;
  }

  private addToOutbox(operation: Operation): void {
    this.state.pendingOperations.push(operation);
    
    // Prune if exceeding max
    if (this.state.pendingOperations.length > this.config.maxPendingOperations) {
      this.state.pendingOperations = this.state.pendingOperations
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.maxPendingOperations);
    }
    
    this.emit({ type: 'state-saved', data: { pendingCount: this.state.pendingOperations.length } });
  }

  // Apply remote operations
  async applyRemoteOperation(operation: Operation, isFromPeer: boolean = false): Promise<{ success: boolean; conflict?: boolean }> {
    // Check if already applied
    if (this.appliedOperations.has(operation.id)) {
      return { success: true };
    }

    // Check for conflicts with local pending operations
    const localOp = this.state.pendingOperations.find(
      op => op.resourceType === operation.resourceType && op.resourceId === operation.resourceId
    );

    if (localOp) {
      const comparison = VectorClockManager.compare(localOp.vectorClock, operation.vectorClock);
      
      if (comparison === 'concurrent') {
        // Conflict detected
        this.emit({ 
          type: 'conflict-detected', 
          data: { local: localOp, remote: operation } 
        });

        try {
          const resolved = this.conflictResolver.resolve(localOp, operation);
          
          // Replace local with resolved
          const idx = this.state.pendingOperations.indexOf(localOp);
          if (idx >= 0) {
            this.state.pendingOperations[idx] = resolved;
          }
          
          this.emit({ 
            type: 'conflict-resolved', 
            data: { local: localOp, remote: operation, resolved } 
          });
          
          // Apply the resolved operation
          await this.applyOperationInternal(resolved);
          this.appliedOperations.add(operation.id);
          return { success: true, conflict: true };
        } catch (e) {
          // Store conflict for manual resolution
          this.state.conflicts = this.state.conflicts || [];
          this.state.conflicts.push({
            operationId: operation.id,
            localOperation: localOp,
            remoteOperation: operation,
            resolved: false
          });
          this.emit({ type: 'sync-failed', error: 'Conflict requires manual resolution', data: { operation } });
          return { success: false, conflict: true };
        }
      } else if (comparison === 'before') {
        // Remote is newer, apply it
        await this.applyOperationInternal(operation);
        this.appliedOperations.add(operation.id);
        return { success: true };
      } else {
        // Local is newer, keep local
        return { success: true };
      }
    }

    // No local conflict, apply directly
    await this.applyOperationInternal(operation);
    this.appliedOperations.add(operation.id);
    return { success: true };
  }

  private async applyOperationInternal(operation: Operation): Promise<void> {
    // Update vector clock
    this.state.vectorClock = VectorClockManager.merge(this.state.vectorClock, operation.vectorClock);
    
    // Prune vector clock
    this.state.vectorClock = VectorClockManager.prune(this.state.vectorClock, this.config.maxVectorClockSize);
    
    // Remove from pending if it was there
    this.state.pendingOperations = this.state.pendingOperations.filter(op => op.id !== operation.id);
    
    // Add to synced
    this.state.syncedOperations.push(operation.id);
    if (this.state.syncedOperations.length > this.config.maxVectorClockSize) {
      this.state.syncedOperations = this.state.syncedOperations.slice(-this.config.maxVectorClockSize);
    }

    this.emit({ type: 'operation-applied', data: operation });
  }

  // Sync process
  async sync(peerStates: Map<string, SyncState>): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.emit({ type: 'sync-started' });

    try {
      // Merge vector clocks from peers
      for (const [peerId, peerState] of peerStates) {
        this.state.vectorClock = VectorClockManager.merge(this.state.vectorClock, peerState.vectorClock);
      }

      // Get operations to send (priority sorted)
      const toSend = [...this.state.pendingOperations]
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.config.batchSize);

      // In a real implementation, this would send to peers/server
      // For now, we simulate successful sync
      for (const operation of toSend) {
        this.state.syncedOperations.push(operation.id);
        this.state.pendingOperations = this.state.pendingOperations.filter(op => op.id !== operation.id);
      }

      this.state.lastSync = new Date().toISOString();
      this.emit({ type: 'sync-completed', data: { syncedCount: toSend.length } });
    } catch (error) {
      this.emit({ type: 'sync-failed', error: String(error) });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Start automatic sync
  startAutoSync(peerProvider: () => Promise<Map<string, SyncState>>): void {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(async () => {
      try {
        const peerStates = await peerProvider();
        await this.sync(peerStates);
      } catch (e) {
        console.error('Auto-sync failed:', e);
      }
    }, this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Conflict resolution
  resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedOperation?: Operation): void {
    const conflict = this.state.conflicts?.find(c => c.operationId === conflictId);
    if (!conflict) throw new Error('Conflict not found');

    let resolvedOp: Operation;
    if (resolution === 'local') {
      resolvedOp = conflict.localOperation;
    } else if (resolution === 'remote') {
      resolvedOp = conflict.remoteOperation;
    } else {
      if (!mergedOperation) throw new Error('Merged operation required for merge resolution');
      resolvedOp = mergedOperation;
    }

    conflict.resolved = true;
    conflict.resolution = resolvedOp;
    conflict.resolvedAt = new Date().toISOString();

    // Apply resolved operation
    this.applyOperationInternal(resolvedOp);
    this.emit({ type: 'conflict-resolved', data: { conflict, resolution: resolvedOp } });
  }

  // Persistence
  serialize(): string {
    return JSON.stringify({
      config: this.config,
      state: this.state
    });
  }

  static deserialize(data: string): SyncEngine {
    const parsed = JSON.parse(data);
    const engine = new SyncEngine(parsed.config);
    engine.state = parsed.state;
    // Rebuild applied operations set
    engine.appliedOperations = new Set(engine.state.syncedOperations);
    return engine;
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSync();
    this.listeners.clear();
  }
}

// Multi-device sync coordinator
export class MultiDeviceSyncCoordinator {
  private engines: Map<string, SyncEngine> = new Map();
  private primaryDeviceId: string;

  constructor(primaryDeviceId: string) {
    this.primaryDeviceId = primaryDeviceId;
  }

  registerEngine(deviceId: string, config: SyncConfig): SyncEngine {
    const engine = new SyncEngine(config);
    this.engines.set(deviceId, engine);
    return engine;
  }

  getEngine(deviceId: string): SyncEngine | undefined {
    return this.engines.get(deviceId);
  }

  getAllStates(): Map<string, SyncState> {
    const states = new Map<string, SyncState>();
    for (const [deviceId, engine] of this.engines) {
      states.set(deviceId, engine.getState());
    }
    return states;
  }

  async syncAll(): Promise<void> {
    const states = this.getAllStates();
    const promises: Promise<void>[] = [];
    
    for (const [deviceId, engine] of this.engines) {
      const peerStates = new Map(states);
      peerStates.delete(deviceId);
      promises.push(engine.sync(peerStates));
    }
    
    await Promise.all(promises);
  }

  // Get operations that need to be sent to server
  getOutboxForServer(): Operation[] {
    const allOps: Operation[] = [];
    for (const engine of this.engines.values()) {
      allOps.push(...engine.getState().pendingOperations);
    }
    return allOps.sort((a, b) => b.priority - a.priority);
  }

  // Apply operations received from server
  async applyServerOperations(operations: Operation[]): Promise<void> {
    for (const engine of this.engines.values()) {
      for (const op of operations) {
        await engine.applyRemoteOperation(op);
      }
    }
  }
}