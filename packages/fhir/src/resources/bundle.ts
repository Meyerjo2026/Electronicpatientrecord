import { z } from 'zod';
import {
  Patient,
  PatientCreate,
  Encounter,
  EncounterCreate,
  Observation,
  ObservationCreate,
  VitalSignsSet,
  MedicationAdministration,
  MedicationAdministrationCreate,
  Procedure,
  ProcedureCreate,
  Condition,
  ConditionCreate,
  AuditEvent,
  AuditEventCreate,
  Consent
} from '@prehospital-epr/core';

export const FHIRResourceSchema = z.union([
  z.object({ resourceType: z.literal('Patient') }),
  z.object({ resourceType: z.literal('Encounter') }),
  z.object({ resourceType: z.literal('Observation') }),
  z.object({ resourceType: z.literal('MedicationAdministration') }),
  z.object({ resourceType: z.literal('Procedure') }),
  z.object({ resourceType: z.literal('Condition') }),
  z.object({ resourceType: z.literal('AuditEvent') }),
  z.object({ resourceType: z.literal('Consent') }),
  z.object({ resourceType: z.literal('Bundle') }),
  z.object({ resourceType: z.literal('DocumentReference') }),
  z.object({ resourceType: z.literal('DiagnosticReport') }),
  z.object({ resourceType: z.literal('ServiceRequest') }),
  z.object({ resourceType: z.literal('Medication') }),
  z.object({ resourceType: z.literal('Device') }),
  z.object({ resourceType: z.literal('Practitioner') }),
  z.object({ resourceType: z.literal('Organization') }),
  z.object({ resourceType: z.literal('Location') }),
  z.object({ resourceType: z.literal('PractitionerRole') })
]);

export type FHIRResource = z.infer<typeof FHIRResourceSchema>;

export const BundleTypeSchema = z.enum([
  'document',
  'message',
  'transaction',
  'transaction-response',
  'batch',
  'batch-response',
  'history',
  'searchset',
  'collection'
]);

export const BundleEntrySchema = z.object({
  fullUrl: z.string().url().optional(),
  resource: FHIRResourceSchema,
  search: z.object({
    mode: z.enum(['match', 'include', 'outcome']),
    score: z.number().optional()
  }).optional(),
  request: z.object({
    method: z.enum(['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']),
    url: z.string(),
    ifNoneMatch: z.string().optional(),
    ifModifiedSince: z.string().optional(),
    ifMatch: z.string().optional(),
    ifNoneExist: z.string().optional()
  }).optional(),
  response: z.object({
    status: z.string(),
    location: z.string().optional(),
    etag: z.string().optional(),
    lastModified: z.string().optional(),
    outcome: FHIRResourceSchema.optional()
  }).optional()
});

export const BundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  id: z.string().optional(),
  meta: z.object({
    versionId: z.string().optional(),
    lastUpdated: z.string().datetime().optional(),
    profile: z.array(z.string().url()).optional()
  }).optional(),
  identifier: z.object({
    use: z.string().optional(),
    type: z.object({
      coding: z.array(z.object({
        system: z.string().url(),
        code: z.string(),
        display: z.string().optional()
      })).optional()
    }).optional(),
    system: z.string().url().optional(),
    value: z.string(),
    period: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional(),
    assigner: z.object({
      reference: z.string().optional(),
      display: z.string().optional()
    }).optional()
  }).optional(),
  type: BundleTypeSchema,
  total: z.number().int().nonnegative().optional(),
  link: z.array(z.object({
    relation: z.string(),
    url: z.string().url()
  })).optional(),
  entry: z.array(BundleEntrySchema).optional(),
  signature: z.object({
    type: z.array(z.object({
      system: z.string().url(),
      code: z.string(),
      display: z.string().optional()
    })),
    when: z.string().datetime(),
    who: z.object({
      reference: z.string().optional(),
      display: z.string().optional()
    }),
    onBehalfOf: z.object({
      reference: z.string().optional(),
      display: z.string().optional()
    }).optional(),
    targetFormat: z.string().optional(),
    sigFormat: z.string().optional(),
    data: z.string()
  }).optional()
});

export type Bundle = z.infer<typeof BundleSchema>;
export type BundleEntry = z.infer<typeof BundleEntrySchema>;

export function createBundle(
  type: z.infer<typeof BundleTypeSchema>,
  entries: BundleEntry[] = [],
  options: { total?: number; identifier?: z.infer<typeof BundleSchema>['identifier'] } = {}
): Bundle {
  return BundleSchema.parse({
    resourceType: 'Bundle',
    type,
    entry: entries,
    total: options.total ?? entries.length,
    identifier: options.identifier,
    meta: {
      lastUpdated: new Date().toISOString()
    }
  });
}

export function createTransactionBundle(entries: BundleEntry[]): Bundle {
  return createBundle('transaction', entries);
}

export function createSearchsetBundle(
  entries: BundleEntry[],
  total: number,
  links: z.infer<typeof BundleSchema>['link'] = []
): Bundle {
  const bundle = createBundle('searchset', entries, { total });
  return BundleSchema.parse({
    ...bundle,
    link: links
  });
}

export function createDocumentBundle(
  composition: FHIRResource,
  entries: BundleEntry[] = []
): Bundle {
  const allEntries = [
    { fullUrl: `urn:uuid:${(composition as any).id}`, resource: composition },
    ...entries
  ];
  return createBundle('document', allEntries);
}

// Resource validators
export const resourceValidators: Record<string, z.ZodSchema> = {
  Patient: z.any(), // Will be replaced with actual schema
  Encounter: z.any(),
  Observation: z.any(),
  MedicationAdministration: z.any(),
  Procedure: z.any(),
  Condition: z.any(),
  AuditEvent: z.any(),
  Consent: z.any()
};

export function validateResource(resource: unknown): { success: boolean; data?: FHIRResource; error?: z.ZodError } {
  const resourceType = (resource as any)?.resourceType;
  const validator = resourceValidators[resourceType];
  
  if (!validator) {
    return { success: false, error: new z.ZodError([{
      code: 'custom',
      message: `Unknown resource type: ${resourceType}`,
      path: ['resourceType']
    }]) };
  }
  
  const result = validator.safeParse(resource);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateBundle(bundle: unknown): { success: boolean; data?: Bundle; error?: z.ZodError } {
  const result = BundleSchema.safeParse(bundle);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}