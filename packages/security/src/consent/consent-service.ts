import { z } from 'zod';
import { ulid } from 'ulid';
import type {
  Consent,
  CodeableConcept,
} from '@prehospital-epr/core';
import {
  ConsentSchema,
  Reference,
  ReferenceSchema,
  CodeableConceptSchema,
  PeriodSchema,
} from '@prehospital-epr/core';

const ConsentConfigSchema = z.object({
  defaultPolicy: z.enum(['opt-in', 'opt-out']).default('opt-in'),
  requiredConsents: z.array(z.string()).default([
    'treatment',
    'data-sharing',
    'research',
    'marketing'
  ]),
  consentVersion: z.string().default('1.0'),
  expiryDays: z.number().int().positive().default(365),
  allowPartialConsent: z.boolean().default(true),
  requireWitness: z.boolean().default(false),
  minAgeForConsent: z.number().int().positive().default(18),
});

export type ConsentConfig = z.infer<typeof ConsentConfigSchema>;

export type ConsentType = 
  | 'treatment'           // Consent for treatment
  | 'data-sharing'        // Consent to share data with other providers
  | 'research'            // Consent for research participation
  | 'marketing'           // Consent for marketing communications
  | 'emergency-access'    // Consent for emergency access without explicit consent
  | 'hipaa-authorization' // HIPAA-specific authorization
  | 'minor-consent'       // Consent for minors (parent/guardian)
  | 'psychiatric'         // Special consent for psychiatric records
  | 'substance-abuse';    // 42 CFR Part 2 consent

const CONSENT_TYPE_DEFINITIONS: Record<ConsentType, {
  name: string;
  description: string;
  required: boolean;
  category: CodeableConcept;
  policyUri?: string;
}> = {
  treatment: {
    name: 'Treatment Consent',
    description: 'Consent for emergency medical treatment and transport',
    required: true,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'treatment',
        display: 'Treatment',
      }],
    },
  },
  'data-sharing': {
    name: 'Data Sharing Consent',
    description: 'Consent to share health information with other healthcare providers for continuity of care',
    required: true,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'care-trans',
        display: 'Care Transition',
      }],
    },
  },
  research: {
    name: 'Research Participation Consent',
    description: 'Consent to use de-identified data for medical research',
    required: false,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'research',
        display: 'Research',
      }],
    },
  },
  marketing: {
    name: 'Marketing Communications Consent',
    description: 'Consent to receive marketing and promotional communications',
    required: false,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'marketing',
        display: 'Marketing',
      }],
    },
  },
  'emergency-access': {
    name: 'Emergency Access Consent',
    description: 'Consent for providers to access records in emergency situations without explicit consent',
    required: true,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'emergency',
        display: 'Emergency',
      }],
    },
  },
  'hipaa-authorization': {
    name: 'HIPAA Authorization',
    description: 'Specific authorization for uses and disclosures not otherwise permitted by HIPAA',
    required: false,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'hipaa-auth',
        display: 'HIPAA Authorization',
      }],
    },
    policyUri: 'https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/authorization/index.html',
  },
  'minor-consent': {
    name: 'Minor Consent',
    description: 'Consent provided by parent or legal guardian for minor patient',
    required: false,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'minor',
        display: 'Minor Consent',
      }],
    },
  },
  psychiatric: {
    name: 'Psychiatric Records Consent',
    description: 'Special consent for access to psychiatric/mental health records (stricter privacy)',
    required: false,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'psychiatric',
        display: 'Psychiatric',
      }],
    },
  },
  'substance-abuse': {
    name: 'Substance Abuse Records Consent (42 CFR Part 2)',
    description: 'Special consent for substance use disorder records per 42 CFR Part 2',
    required: false,
    category: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
        code: 'substance-abuse',
        display: 'Substance Abuse',
      }],
    },
    policyUri: 'https://www.samhsa.gov/42-cfr-part-2',
  },
};

export class ConsentService {
  private config: ConsentConfig;
  private consents: Map<string, Consent> = new Map(); // Key: patientId:consentType
  private consentTemplates: Map<ConsentType, Partial<Consent>> = new Map();

  constructor(config: Partial<ConsentConfig> = {}) {
    this.config = ConsentConfigSchema.parse(config);
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    for (const [type, definition] of Object.entries(CONSENT_TYPE_DEFINITIONS)) {
      this.consentTemplates.set(type as ConsentType, {
        status: 'active',
        scope: definition.category,
        category: [definition.category],
        dateTime: new Date().toISOString(),
        policy: definition.policyUri ? [{ uri: definition.policyUri }] : [],
        policyRule: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/consentpolicycodes',
            code: this.config.defaultPolicy === 'opt-in' ? 'opt-in' : 'opt-out',
            display: this.config.defaultPolicy === 'opt-in' ? 'Opt-In' : 'Opt-Out',
          }],
        },
        provision: {
          type: 'permit',
          period: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + this.config.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
          },
          action: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/consentactioncodes',
              code: 'all',
              display: 'All Actions',
            }],
          }],
        },
      });
    }
  }

  async createConsent(
    patientId: string,
    consentType: ConsentType,
    options: {
      granted: boolean;
      grantedBy: string; // Practitioner or Patient reference
      witness?: string;
      expiryDays?: number;
      restrictions?: string[];
      note?: string;
    }
  ): Promise<Consent> {
    const template = this.consentTemplates.get(consentType);
    if (!template) {
      throw new Error(`Unknown consent type: ${consentType}`);
    }

    const consent: Consent = {
      ...template,
      resourceType: 'Consent',
      id: ulid(),
      identifier: [{
        system: 'http://prehospital-epr.org/consent',
        value: `${patientId}:${consentType}`,
        use: 'official',
      }],
      status: options.granted ? 'active' : 'rejected',
      patient: { reference: `Patient/${patientId}` },
      dateTime: new Date().toISOString(),
      performer: [{ reference: options.grantedBy }],
      verification: options.witness ? [{
        verified: true,
        verifiedWith: { reference: options.witness },
        verificationDate: new Date().toISOString(),
      }] : [],
      provision: {
        ...template.provision!,
        type: options.granted ? 'permit' : 'deny',
        period: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + (options.expiryDays || this.config.expiryDays) * 24 * 60 * 60 * 1000).toISOString(),
        },
        ...(options.restrictions && {
          data: options.restrictions.map(r => ({
            meaning: 'related' as const,
            reference: { reference: r },
          })),
        }),
      },
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString(),
        source: 'prehospital-epr-consent',
      },
    } as Consent;

    // Validate
    const validated = ConsentSchema.parse(consent);
    
    const key = `${patientId}:${consentType}`;
    this.consents.set(key, validated);

    return validated;
  }

  async getConsent(patientId: string, consentType: ConsentType): Promise<Consent | null> {
    const key = `${patientId}:${consentType}`;
    return this.consents.get(key) || null;
  }

  async getAllConsents(patientId: string): Promise<Consent[]> {
    const results: Consent[] = [];
    for (const [key, consent] of this.consents) {
      if (key.startsWith(`${patientId}:`)) {
        results.push(consent);
      }
    }
    return results;
  }

  async updateConsent(
    patientId: string,
    consentType: ConsentType,
    updates: {
      granted?: boolean;
      expiryDays?: number;
      restrictions?: string[];
      note?: string;
    }
  ): Promise<Consent | null> {
    const key = `${patientId}:${consentType}`;
    const existing = this.consents.get(key);
    if (!existing) return null;

    const updated: Consent = {
      ...existing,
      status: updates.granted !== undefined ? (updates.granted ? 'active' : 'rejected') : existing.status,
      provision: {
        ...existing.provision!,
        type: updates.granted !== undefined ? (updates.granted ? 'permit' : 'deny') : existing.provision!.type,
        period: updates.expiryDays !== undefined ? {
          start: new Date().toISOString(),
          end: new Date(Date.now() + updates.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        } : existing.provision!.period,
        ...(updates.restrictions && {
          data: updates.restrictions.map(r => ({
            meaning: 'related' as const,
            reference: { reference: r },
          })),
        }),
      },
      meta: {
        ...existing.meta!,
        versionId: String(parseInt(existing.meta?.versionId || '1') + 1),
        lastUpdated: new Date().toISOString(),
      },
    };

    this.consents.set(key, updated);
    return updated;
  }

  async revokeConsent(patientId: string, consentType: ConsentType, revokedBy: string): Promise<Consent | null> {
    return this.updateConsent(patientId, consentType, { granted: false });
  }

  // Check if consent is valid for a specific action
  async checkConsent(
    patientId: string,
    consentType: ConsentType,
    action: string,
    resourceType?: string
  ): Promise<{ allowed: boolean; reason: string; consent?: Consent }> {
    const consent = await this.getConsent(patientId, consentType);
    
    if (!consent) {
      // Check if consent is required
      const definition = CONSENT_TYPE_DEFINITIONS[consentType];
      if (definition.required) {
        return { 
          allowed: false, 
          reason: `Required consent not found: ${consentType}` 
        };
      }
      // Optional consent not given - allow by default
      return { 
        allowed: true, 
        reason: `Optional consent not required: ${consentType}` 
      };
    }

    // Check status
    if (consent.status !== 'active') {
      return { 
        allowed: false, 
        reason: `Consent not active: ${consent.status}`,
        consent 
      };
    }

    // Check expiry
    if (consent.provision?.period?.end) {
      if (new Date(consent.provision.period.end) < new Date()) {
        return { 
          allowed: false, 
          reason: 'Consent expired',
          consent 
        };
      }
    }

    // Check provision type
    if (consent.provision?.type === 'deny') {
      return { 
        allowed: false, 
        reason: 'Consent explicitly denied',
        consent 
      };
    }

    // Check action permission
    const allowedActions = consent.provision?.action?.map(a => a.coding?.[0]?.code) || [];
    if (allowedActions.length > 0 && !allowedActions.includes('all') && !allowedActions.includes(action)) {
      return { 
        allowed: false, 
        reason: `Action not permitted by consent: ${action}`,
        consent 
      };
    }

    // Check data restrictions
    if (consent.provision?.data && resourceType) {
      const allowedResources = consent.provision.data.map(d => d.reference?.reference?.split('/')[0]).filter(Boolean);
      if (allowedResources.length > 0 && !allowedResources.includes(resourceType)) {
        return { 
          allowed: false, 
          reason: `Resource type not permitted by consent: ${resourceType}`,
          consent 
        };
      }
    }

    return { allowed: true, reason: 'Consent valid', consent };
  }

  // Check multiple consents for a complex operation
  async checkConsentsForOperation(
    patientId: string,
    operation: {
      consentTypes: ConsentType[];
      action: string;
      resourceType?: string;
      requireAll?: boolean;
    }
  ): Promise<{ allowed: boolean; results: Array<{ consentType: ConsentType; allowed: boolean; reason: string }> }> {
    const results = [];
    let allAllowed = true;

    for (const consentType of operation.consentTypes) {
      const result = await this.checkConsent(patientId, consentType, operation.action, operation.resourceType);
      results.push({ consentType, ...result });
      if (!result.allowed) allAllowed = false;
    }

    // If requireAll is false, allow if any consent allows
    if (!operation.requireAll && !allAllowed) {
      allAllowed = results.some(r => r.allowed);
    }

    return { allowed: allAllowed, results };
  }

  // Generate consent form for patient
  generateConsentForm(patientId: string, consentTypes: ConsentType[]): {
    patientId: string;
    version: string;
    generatedAt: string;
    consents: Array<{
      type: ConsentType;
      name: string;
      description: string;
      required: boolean;
      policyUrl?: string;
    }>;
  } {
    return {
      patientId,
      version: this.config.consentVersion,
      generatedAt: new Date().toISOString(),
      consents: consentTypes.map(type => {
        const def = CONSENT_TYPE_DEFINITIONS[type];
        return {
          type,
          name: def.name,
          description: def.description,
          required: def.required,
          policyUrl: def.policyUri,
        };
      }),
    };
  }

  // Export consent records for compliance
  async exportConsents(patientId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const consents = await this.getAllConsents(patientId);
    
    if (format === 'json') {
      return JSON.stringify({
        patientId,
        exportedAt: new Date().toISOString(),
        version: this.config.consentVersion,
        consents,
      }, null, 2);
    }

    // CSV format
    const headers = ['consentType', 'status', 'granted', 'dateTime', 'expiryDate', 'grantedBy', 'witness'];
    const rows = consents.map(c => [
      c.category?.[0]?.coding?.[0]?.code || '',
      c.status,
      c.status === 'active' ? 'yes' : 'no',
      c.dateTime,
      c.provision?.period?.end || '',
      c.performer?.[0]?.reference || '',
      c.verification?.[0]?.verifiedWith?.reference || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // Bulk operations for mass consent updates (e.g., policy changes)
  async bulkUpdateConsents(
    patientIds: string[],
    consentType: ConsentType,
    updates: {
      granted?: boolean;
      expiryDays?: number;
    }
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const patientId of patientIds) {
      try {
        const result = await this.updateConsent(patientId, consentType, updates);
        if (result) updated++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { updated, failed };
  }

  // Get consent statistics
  getConsentStatistics(): {
    totalPatients: number;
    byType: Record<string, { active: number; rejected: number; expired: number }>;
  } {
    const stats: Record<string, { active: number; rejected: number; expired: number }> = {};
    const patientIds = new Set<string>();

    for (const consent of this.consents.values()) {
      const patientId = consent.patient?.reference?.split('/')[1];
      if (patientId) patientIds.add(patientId);

      const type = consent.category?.[0]?.coding?.[0]?.code || 'unknown';
      if (!stats[type]) {
        stats[type] = { active: 0, rejected: 0, expired: 0 };
      }

      if (consent.status === 'active') {
        if (consent.provision?.period?.end && new Date(consent.provision.period.end) < new Date()) {
          stats[type].expired++;
        } else {
          stats[type].active++;
        }
      } else if (consent.status === 'rejected') {
        stats[type].rejected++;
      }
    }

    return {
      totalPatients: patientIds.size,
      byType: stats,
    };
  }
}

export const consentService = new ConsentService();