import { z } from 'zod';
import { Operation, OperationSchema, SyncState, SyncStateSchema, VectorClock } from '../engine/crdt';

export const StorageConfigSchema = z.object({
  dbName: z.string().default('prehospital-epr'),
  version: z.number().int().positive().default(1),
  stores: z.array(z.object({
    name: z.string(),
    keyPath: z.string().optional(),
    autoIncrement: z.boolean().optional(),
    indexes: z.array(z.object({
name: z.string(),
      keyPath: z.string(),
      unique: z.boolean().optional(),
      multiEntry: z.boolean().optional()
    })).optional()
  })).optional()
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export interface IDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore;
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
  close(): void;
}

export interface IDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  indexNames: DOMStringList;
  transaction: IDBTransaction;
  add(value: any, key?: IDBValidKey): IDBRequest;
  put(value: any, key?: IDBValidKey): IDBRequest;
  delete(key: IDBValidKey | IDBKeyRange): IDBRequest;
  clear(): IDBRequest;
  get(key: IDBValidKey): IDBRequest;
  getAll(key?: IDBValidKey | IDBKeyRange, count?: number): IDBRequest;
  getAllKeys(key?: IDBValidKey | IDBKeyRange, count?: number): IDBRequest;
  count(key?: IDBValidKey | IDBKeyRange): IDBRequest;
  openCursor(range?: IDBValidKey | IDBKeyRange, direction?: IDBCursorDirection): IDBRequest;
  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex;
  deleteIndex(name: string): void;
  index(name: string): IDBIndex;
}

export interface IDBIndex {
  name: string;
  objectStore: IDBObjectStore;
  keyPath: string | string[];
  multiEntry: boolean;
  unique: boolean;
  get(key: IDBValidKey): IDBRequest;
  getKey(key: IDBValidKey): IDBRequest;
  getAll(key?: IDBValidKey | IDBKeyRange, count?: number): IDBRequest;
  getAllKeys(key?: IDBValidKey | IDBKeyRange, count?: number): IDBRequest;
  count(key?: IDBValidKey | IDBKeyRange): IDBRequest;
  openCursor(range?: IDBValidKey | IDBKeyRange, direction?: IDBCursorDirection): IDBRequest;
}

export interface IDBTransaction {
  db: IDBDatabase;
  mode: IDBTransactionMode;
  objectStoreNames: DOMStringList;
  objectStore(name: string): IDBObjectStore;
  abort(): void;
  commit(): void;
}

export interface IDBRequest<T = any> extends EventTarget {
  result: T;
  error: DOMException | null;
  source: IDBObjectStore | IDBIndex | IDBCursor;
  transaction: IDBTransaction;
  readyState: 'pending' | 'done';
  onsuccess: ((this: IDBRequest<T>, ev: Event) => any) | null;
  onerror: ((this: IDBRequest<T>, ev: Event) => any) | null;
}

export interface IDBCursor {
  source: IDBObjectStore | IDBIndex;
  direction: IDBCursorDirection;
  key: IDBValidKey;
  primaryKey: IDBValidKey;
  value: any;
  update(value: any): IDBRequest;
  advance(count: number): void;
  continue(key?: IDBValidKey): void;
  continuePrimaryKey(key: IDBValidKey, primaryKey: IDBValidKey): void;
  delete(): IDBRequest;
}

export type IDBValidKey = string | number | Date | ArrayBuffer | ArrayBufferView | IDBArrayKey;
export type IDBKeyRange = any;
export type IDBArrayKey = any[];
export type IDBTransactionMode = 'readonly' | 'readwrite' | 'versionchange';
export type IDBCursorDirection = 'next' | 'nextunique' | 'prev' | 'prevunique';

const DEFAULT_STORES = [
  {
    name: 'resources',
    keyPath: 'id',
    indexes: [
      { name: 'resourceType', keyPath: 'resourceType', unique: false },
      { name: 'patientId', keyPath: 'subject.reference', unique: false },
      { name: 'encounterId', keyPath: 'encounter.reference', unique: false },
      { name: 'lastUpdated', keyPath: 'meta.lastUpdated', unique: false },
      { name: 'status', keyPath: 'status', unique: false }
    ]
  },
  {
    name: 'operations',
    keyPath: 'id',
    indexes: [
      { name: 'resourceType', keyPath: 'resourceType', unique: false },
      { name: 'resourceId', keyPath: 'resourceId', unique: false },
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'author', keyPath: 'author', unique: false },
      { name: 'synced', keyPath: 'synced', unique: false }
    ]
  },
  {
    name: 'syncState',
    keyPath: 'deviceId'
  },
  {
    name: 'auditEvents',
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'recorded', unique: false },
      { name: 'userId', keyPath: 'agent.0.who.reference', unique: false },
      { name: 'action', keyPath: 'action', unique: false },
      { name: 'resourceType', keyPath: 'entity.0.what.reference', unique: false }
    ]
  },
  {
    name: 'devices',
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name', unique: false },
      { name: 'lastSeen', keyPath: 'lastSeen', unique: false }
    ]
  },
  {
    name: 'settings',
    keyPath: 'key'
  }
];

export class IndexedDBStorage {
  private db: any = null;
  private config: StorageConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = StorageConfigSchema.parse({
      dbName: 'prehospital-epr',
      version: 1,
      stores: DEFAULT_STORES,
      ...config
    });
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private doInitialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        for (const storeConfig of this.config.stores || []) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement
            });
            
            if (storeConfig.indexes) {
              for (const indexConfig of storeConfig.indexes) {
                store.createIndex(indexConfig.name, indexConfig.keyPath, {
                  unique: indexConfig.unique,
                  multiEntry: indexConfig.multiEntry
                });
              }
            }
          }
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) await this.initialize();
    return this.db!;
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readwrite'): Promise<IDBObjectStore> {
    return this.ensureDB().then(db => {
      const tx = db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    });
  }

  // Resource operations
  async putResource(resource: any): Promise<void> {
    const store = await this.getStore('resources');
    const resourceWithMeta = {
      ...resource,
      _synced: false,
      _updatedAt: new Date().toISOString()
    };
    return this.promisifyRequest(store.put(resourceWithMeta));
  }

  async getResource(id: string): Promise<any | null> {
    const store = await this.getStore('resources', 'readonly');
    return this.promisifyRequest(store.get(id));
  }

  async getResourcesByType(resourceType: string, limit: number = 100): Promise<any[]> {
    const store = await this.getStore('resources', 'readonly');
    const index = store.index('resourceType');
    return this.promisifyRequest(index.getAll(resourceType, limit));
  }

  async getResourcesByPatient(patientId: string, limit: number = 100): Promise<any[]> {
    const store = await this.getStore('resources', 'readonly');
    const index = store.index('patientId');
    const ref = `Patient/${patientId}`;
    return this.promisifyRequest(index.getAll(ref, limit));
  }

  async getResourcesByEncounter(encounterId: string, limit: number = 100): Promise<any[]> {
    const store = await this.getStore('resources', 'readonly');
    const index = store.index('encounterId');
    const ref = `Encounter/${encounterId}`;
    return this.promisifyRequest(index.getAll(ref, limit));
  }

  async deleteResource(id: string): Promise<void> {
    const store = await this.getStore('resources');
    return this.promisifyRequest(store.delete(id));
  }

  async markResourceSynced(id: string): Promise<void> {
    const resource = await this.getResource(id);
    if (resource) {
      resource._synced = true;
      resource._updatedAt = new Date().toISOString();
      await this.putResource(resource);
    }
  }

  async getUnsyncedResources(limit: number = 100): Promise<any[]> {
    const store = await this.getStore('resources', 'readonly');
    const index = store.index('_synced');
    return this.promisifyRequest(index.getAll(false, limit));
  }

  // Operation operations
  async putOperation(operation: Operation): Promise<void> {
    const store = await this.getStore('operations');
    const opWithMeta = {
      ...operation,
      _synced: false,
      _createdAt: new Date().toISOString()
    };
    return this.promisifyRequest(store.put(opWithMeta));
  }

  async getOperation(id: string): Promise<Operation | null> {
    const store = await this.getStore('operations', 'readonly');
    return this.promisifyRequest(store.get(id));
  }

  async getPendingOperations(limit: number = 1000): Promise<Operation[]> {
    const store = await this.getStore('operations', 'readonly');
    const index = store.index('_synced');
    return this.promisifyRequest(index.getAll(false, limit));
  }

  async getOperationsByResource(resourceType: string, resourceId: string): Promise<Operation[]> {
    const store = await this.getStore('operations', 'readonly');
    const index = store.index('resourceType');
    const ops = await this.promisifyRequest(index.getAll(resourceType));
    return ops.filter((op: any) => op.resourceId === resourceId);
  }

  async markOperationSynced(id: string): Promise<void> {
    const op = await this.getOperation(id);
    if (op) {
      (op as any)._synced = true;
      await this.putOperation(op);
    }
  }

  async deleteOperation(id: string): Promise<void> {
    const store = await this.getStore('operations');
    return this.promisifyRequest(store.delete(id));
  }

  // Sync state operations
  async saveSyncState(state: SyncState): Promise<void> {
    const store = await this.getStore('syncState');
    return this.promisifyRequest(store.put(state));
  }

  async getSyncState(deviceId: string): Promise<SyncState | null> {
    const store = await this.getStore('syncState', 'readonly');
    return this.promisifyRequest(store.get(deviceId));
  }

  // Audit events
  async addAuditEvent(event: any): Promise<void> {
    const store = await this.getStore('auditEvents');
    return this.promisifyRequest(store.put({
      ...event,
      _createdAt: new Date().toISOString()
    }));
  }

  async getAuditEvents(filter: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    const store = await this.getStore('auditEvents', 'readonly');
    let request: IDBRequest;
    
    if (filter.userId) {
      const index = store.index('userId');
      request = index.getAll(filter.userId, filter.limit || 100);
    } else if (filter.resourceType) {
      const index = store.index('resourceType');
      request = index.getAll(filter.resourceType, filter.limit || 100);
    } else if (filter.action) {
      const index = store.index('action');
      request = index.getAll(filter.action, filter.limit || 100);
    } else {
      const index = store.index('timestamp');
      request = index.getAll(filter.limit || 100);
    }
    
    let events = await this.promisifyRequest(request);
    
    if (filter.startDate || filter.endDate) {
      events = events.filter((e: any) => {
        const ts = new Date(e.recorded).getTime();
        if (filter.startDate && ts < new Date(filter.startDate).getTime()) return false;
        if (filter.endDate && ts > new Date(filter.endDate).getTime()) return false;
        return true;
      });
    }
    
    return events.slice(0, filter.limit || 100);
  }

  // Device registry
  async registerDevice(device: { id: string; name: string; type: string; capabilities: string[] }): Promise<void> {
    const store = await this.getStore('devices');
    return this.promisifyRequest(store.put({
      ...device,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    }));
  }

  async updateDeviceLastSeen(deviceId: string): Promise<void> {
    const store = await this.getStore('devices');
    const device = await this.promisifyRequest(store.get(deviceId));
    if (device) {
      device.lastSeen = new Date().toISOString();
      return this.promisifyRequest(store.put(device));
    }
  }

  async getDevices(): Promise<any[]> {
    const store = await this.getStore('devices', 'readonly');
    return this.promisifyRequest(store.getAll());
  }

  // Settings
  async setSetting(key: string, value: any): Promise<void> {
    const store = await this.getStore('settings');
    return this.promisifyRequest(store.put({ key, value, updatedAt: new Date().toISOString() }));
  }

  async getSetting(key: string): Promise<any> {
    const store = await this.getStore('settings', 'readonly');
    const result = await this.promisifyRequest(store.get(key));
    return result?.value;
  }

  async deleteSetting(key: string): Promise<void> {
    const store = await this.getStore('settings');
    return this.promisifyRequest(store.delete(key));
  }

  // Utility
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const storeNames = Array.from(db.objectStoreNames);
    
    for (const storeName of storeNames) {
      const store = await this.getStore(String(storeName));
      await this.promisifyRequest(store.clear());
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// React Native / Expo SQLite alternative
export class SQLiteStorage {
  private db: any = null;
  
  async initialize(dbName: string = 'prehospital-epr.db'): Promise<void> {
    // This would use expo-sqlite or react-native-sqlite-storage
    // Implementation depends on platform
    throw new Error('SQLiteStorage not implemented - use platform-specific implementation');
  }
  
  // Same interface as IndexedDBStorage...
}

// Factory for platform-appropriate storage
export async function createStorage(): Promise<IndexedDBStorage | SQLiteStorage> {
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    const storage = new IndexedDBStorage();
    await storage.initialize();
    return storage;
  }
  
  // For React Native, would return SQLiteStorage
  throw new Error('No suitable storage backend found for this platform');
}