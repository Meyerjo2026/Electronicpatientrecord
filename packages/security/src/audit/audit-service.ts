import { z } from 'zod';
import { ulid } from 'ulid';
import * as CryptoJS from 'crypto-js';
import {
  AuditEvent,
  AuditEventCreate,
  AuditEventActionSchema,
  AuditEventOutcomeSchema,
  AuditEventAgentSchema,
  AuditEventSourceSchema,
  AuditEventEntitySchema,
  SecurityRoleSchema
} from '@prehospital-epr/core';

const AuditConfigSchema = z.object({
  serviceName: z.string().default('prehospital-epr'),
  serviceVersion: z.string().default('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  retentionDays: z.number().int().positive().default(2555), // 7 years for HIPAA
  enableIntegrityChain: z.boolean().default(true),
  batchSize: z.number().int().positive().default(100),
  flushInterval: z.number().int().positive().default(5000), // 5 seconds
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;

interface IntegrityRecord {
  index: number;
  previousHash: string;
  currentHash: string;
  timestamp: string;
  eventId: string;
}

export class AuditService {
  private config: AuditConfig;
  private eventBuffer: AuditEvent[] = [];
  private integrityChain: IntegrityRecord[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private eventIndex: number = 0;
  private lastHash: string = '0'.repeat(64); // Genesis hash

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = AuditConfigSchema.parse(config);
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async logEvent(event: Omit<AuditEventCreate, 'id' | 'meta' | 'resourceType'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      ...event,
      id: ulid(),
      resourceType: 'AuditEvent',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString(),
        source: this.config.serviceName,
      },
      recorded: event.recorded || new Date().toISOString(),
    };

    // Add integrity hash if enabled
    if (this.config.enableIntegrityChain) {
      const eventHash = this.computeEventHash(auditEvent);
      const integrityRecord: IntegrityRecord = {
        index: ++this.eventIndex,
        previousHash: this.lastHash,
        currentHash: eventHash,
        timestamp: auditEvent.recorded,
        eventId: auditEvent.id,
      };
      
      // Verify chain integrity
      const chainHash = this.computeChainHash(integrityRecord);
      integrityRecord.currentHash = chainHash;
      
      this.integrityChain.push(integrityRecord);
      this.lastHash = chainHash;
      
      // Store hash in event extension
      auditEvent.extension = auditEvent.extension || [];
      auditEvent.extension.push({
        url: 'http://prehospital-epr.org/fhir/StructureDefinition/audit-integrity',
        valueString: chainHash,
      });
    }

    this.eventBuffer.push(auditEvent);

    // Flush if buffer full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush();
    }

    return auditEvent;
  }

  // Convenience methods for common audit events
  async logAccess(
    userId: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    details?: Record<string, any>,
    outcome: 'success' | 'failure' = 'success'
  ): Promise<AuditEvent> {
    return this.logEvent({
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
          code: 'rest',
          display: 'RESTful Operation',
        }],
      },
      subtype: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/audit-event-subtype',
          code: action,
          display: action.charAt(0).toUpperCase() + action.slice(1),
        }],
      }],
      action: AuditEventActionSchema.Enum[action.toUpperCase() as keyof typeof AuditEventActionSchema.Enum] || 'R',
      outcome: outcome === 'success' ? '0' : '4',
      outcomeDesc: outcome === 'success' ? 'Success' : 'Access denied or error',
      agent: [{
        who: { reference: `Practitioner/${userId}` },
        requestor: true,
        role: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: userRole,
            display: userRole,
          }],
        }],
      }],
      source: {
        identifier: this.config.serviceName,
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: '4',
            display: 'Application Server',
          }],
        }],
      },
      entity: [{
        what: { reference: `${resourceType}/${resourceId}` },
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
            code: '2',
            display: 'System Object',
          }],
        },
        role: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/object-role',
            code: '4',
            display: 'Domain Resource',
          }],
        },
      }],
      extension: details ? [{
        url: 'http://prehospital-epr.org/fhir/StructureDefinition/audit-details',
        valueString: JSON.stringify(details),
      }] : undefined,
    });
  }

  async logClinicalEvent(
    userId: string,
    userRole: string,
    encounterId: string,
    eventType: 'assessment' | 'vital-signs' | 'medication' | 'procedure' | 'diagnosis' | 'handoff',
    details: Record<string, any>,
    outcome: 'success' | 'failure' = 'success'
  ): Promise<AuditEvent> {
    return this.logEvent({
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
          code: 'clinical',
          display: 'Clinical Event',
        }],
      },
      subtype: [{
        coding: [{
          system: 'http://prehospital-epr.org/fhir/CodeSystem/clinical-event-type',
          code: eventType,
          display: eventType,
        }],
      }],
      action: 'E',
      outcome: outcome === 'success' ? '0' : '4',
      outcomeDesc: `Clinical ${eventType} ${outcome}`,
      agent: [{
        who: { reference: `Practitioner/${userId}` },
        requestor: true,
        role: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: userRole,
            display: userRole,
          }],
        }],
      }],
      source: {
        identifier: this.config.serviceName,
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: '4',
            display: 'Application Server',
          }],
        }],
      }],
      entity: [
        {
          what: { reference: `Encounter/${encounterId}` },
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
              code: '2',
              display: 'System Object',
            }],
          },
          role: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/object-role',
              code: '4',
              display: 'Domain Resource',
            }],
          },
        },
      ],
      extension: [{
        url: 'http://prehospital-epr.org/fhir/StructureDefinition/audit-clinical-details',
        valueString: JSON.stringify(details),
      }],
    });
  }

  async logSecurityEvent(
    eventType: 'login' | 'logout' | 'failed-login' | 'password-change' | 'permission-change' | 'data-export' | 'emergency-access',
    userId: string,
    details: Record<string, any>,
    outcome: 'success' | 'failure' = 'success'
  ): Promise<AuditEvent> {
    return this.logEvent({
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
          code: 'auth',
          display: 'Authentication/Authorization',
        }],
      },
      subtype: [{
        coding: [{
          system: 'http://prehospital-epr.org/fhir/CodeSystem/security-event-type',
          code: eventType,
          display: eventType,
        }],
      }],
      action: eventType.includes('failed') ? 'E' : 'E',
      outcome: outcome === 'success' ? '0' : '4',
      outcomeDesc: `Security event: ${eventType} ${outcome}`,
      agent: [{
        who: { reference: `Practitioner/${userId}` },
        requestor: false,
      }],
      source: {
        identifier: this.config.serviceName,
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: '4',
            display: 'Application Server',
          }],
        }],
      }],
      entity: [],
      extension: [{
        url: 'http://prehospital-epr.org/fhir/StructureDefinition/audit-security-details',
        valueString: JSON.stringify(details),
      }],
    });
  }

  async logSystemEvent(
    eventType: 'startup' | 'shutdown' | 'config-change' | 'backup' | 'restore' | 'sync' | 'error',
    details: Record<string, any>,
    outcome: 'success' | 'failure' = 'success'
  ): Promise<AuditEvent> {
    return this.logEvent({
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
          code: 'system',
          display: 'System Event',
        }],
      },
      subtype: [{
        coding: [{
          system: 'http://prehospital-epr.org/fhir/CodeSystem/system-event-type',
          code: eventType,
          display: eventType,
        }],
      }],
      action: 'E',
      outcome: outcome === 'success' ? '0' : '8',
      outcomeDesc: `System event: ${eventType} ${outcome}`,
      agent: [],
      source: {
        identifier: this.config.serviceName,
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
            code: '4',
            display: 'Application Server',
          }],
        }],
      }],
      entity: [],
      extension: [{
        url: 'http://prehospital-epr.org/fhir/StructureDefinition/audit-system-details',
        valueString: JSON.stringify(details),
      }],
    });
  }

  async flush(): Promise<number> {
    if (this.eventBuffer.length === 0) return 0;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // In production, would write to:
      // - Secure append-only log file
      // - Database with audit table
      // - SIEM system (Splunk, Elastic, etc.)
      // - CloudWatch/Stackdriver
      
      // For now, simulate persistence
      await this.persistEvents(eventsToFlush);
      
      // Also persist integrity chain
      if (this.config.enableIntegrityChain) {
        await this.persistIntegrityChain();
      }
      
      return eventsToFlush.length;
    } catch (error) {
      // On failure, put events back in buffer
      this.eventBuffer.unshift(...eventsToFlush);
      throw error;
    }
  }

  private async persistEvents(events: AuditEvent[]): Promise<void> {
    // Implementation would depend on storage backend
    // Example: await db.auditEvents.insertMany(events);
    console.log(`[AUDIT] Persisted ${events.length} events`);
  }

  private async persistIntegrityChain(): Promise<void> {
    // Persist integrity chain to tamper-evident storage
    console.log(`[AUDIT] Integrity chain length: ${this.integrityChain.length}`);
  }

  // Verify integrity of audit log
  async verifyIntegrity(): Promise<{ valid: boolean; brokenAt?: number; details?: string }> {
    if (!this.config.enableIntegrityChain) {
      return { valid: true, details: 'Integrity chain not enabled' };
    }

    let previousHash = '0'.repeat(64);
    
    for (const record of this.integrityChain) {
      if (record.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: record.index,
          details: `Hash mismatch at index ${record.index}: expected ${previousHash}, got ${record.previousHash}`,
        };
      }
      
      const computedHash = this.computeChainHash(record);
      if (computedHash !== record.currentHash) {
        return {
          valid: false,
          brokenAt: record.index,
          details: `Record hash mismatch at index ${record.index}`,
        };
      }
      
      previousHash = record.currentHash;
    }

    return { valid: true };
  }

  private computeEventHash(event: AuditEvent): string {
    const canonical = JSON.stringify({
      id: event.id,
      type: event.type,
      action: event.action,
      recorded: event.recorded,
      agent: event.agent,
      entity: event.entity,
    }, Object.keys({}).sort());
    
    return CryptoJS.SHA256(canonical).toString(CryptoJS.enc.Hex);
  }

  private computeChainHash(record: IntegrityRecord): string {
    const input = `${record.index}:${record.previousHash}:${record.timestamp}:${record.eventId}`;
    return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
  }

  // Query audit events
  async queryEvents(filter: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    // In production, would query database
    // This is a mock implementation
    return [];
  }

  // Generate audit report
  async generateReport(params: {
    startDate: string;
    endDate: string;
    userId?: string;
    eventTypes?: string[];
  }): Promise<{
    summary: Record<string, number>;
    events: AuditEvent[];
    integrityVerified: boolean;
  }> {
    const events = await this.queryEvents({
      startDate: params.startDate,
      endDate: params.endDate,
      userId: params.userId,
      limit: 10000,
    });

    const summary: Record<string, number> = {};
    for (const event of events) {
      const key = `${event.type?.coding?.[0]?.code || 'unknown'}.${event.subtype?.[0]?.coding?.[0]?.code || 'unknown'}`;
      summary[key] = (summary[key] || 0) + 1;
    }

    const integrity = await this.verifyIntegrity();

    return { summary, events, integrityVerified: integrity.valid };
  }

  // Export for compliance (HIPAA, etc.)
  async exportForCompliance(format: 'json' | 'csv' | 'xml', filter: any): Promise<string> {
    const events = await this.queryEvents(filter);
    
    if (format === 'json') {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        eventCount: events.length,
        events,
      }, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'userId', 'action', 'resourceType', 'resourceId', 'outcome', 'details'];
      const rows = events.map(e => [
        e.id,
        e.recorded,
        e.agent?.[0]?.who?.reference || '',
        e.action,
        e.entity?.[0]?.what?.reference?.split('/')[0] || '',
        e.entity?.[0]?.what?.reference?.split('/')[1] || '',
        e.outcome,
        e.extension?.find(ex => ex.url.includes('details'))?.valueString || '',
      ]);
      
      return [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    }
    
    throw new Error(`Unsupported format: ${format}`);
  }

  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // Final flush
  }
}

export const auditService = new AuditService();