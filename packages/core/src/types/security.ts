import { z } from 'zod';
import {
  BaseResourceSchema,
  ReferenceSchema,
  CodeableConceptSchema,
  PeriodSchema,
  ulidSchema,
  generateId
} from './fhir-base';

export const AuditEventActionSchema = z.enum([
  'C', // Create
  'R', // Read/Access
  'U', // Update
  'D', // Delete
  'E'  // Execute
]);

export const AuditEventOutcomeSchema = z.enum([
  '0', // Success
  '4', // Minor failure
  '8', // Serious failure
  '12' // Major failure
]);

export const AuditEventAgentSchema = z.object({
  type: CodeableConceptSchema.optional(),
  role: z.array(CodeableConceptSchema).optional(),
  who: ReferenceSchema,
  altId: z.string().optional(),
  name: z.string().optional(),
  requestor: z.boolean(),
  location: ReferenceSchema.optional(),
  policy: z.array(z.string().url()).optional(),
  media: CodeableConceptSchema.optional(),
  network: z.object({
    address: z.string(),
    type: z.enum(['1', '2', '3', '4', '5']) // Machine, LAN, WAN, Internet, Other
  }).optional()
});

export const AuditEventSourceSchema = z.object({
  site: z.string().optional(),
  identifier: z.string().url(),
  type: z.array(CodeableConceptSchema).optional()
});

export const AuditEventEntitySchema = z.object({
  what: ReferenceSchema,
  type: CodeableConceptSchema.optional(),
  role: z.enum(['1', '2', '3', '4']).optional(), // Patient, Location, Report, Resource
  lifecycle: CodeableConceptSchema.optional(),
  securityLabel: z.array(CodeableConceptSchema).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  query: z.string().optional(),
  detail: z.array(z.object({
    type: z.string(),
    valueString: z.string().optional(),
    valueBase64Binary: z.string().optional()
  })).optional()
});

export const AuditEventSchema = BaseResourceSchema.extend({
  resourceType: z.literal('AuditEvent'),
  type: CodeableConceptSchema,
  subtype: z.array(CodeableConceptSchema).optional(),
  action: AuditEventActionSchema,
  period: PeriodSchema.optional(),
  recorded: z.string().datetime(),
  outcome: AuditEventOutcomeSchema,
  outcomeDesc: z.string().optional(),
  purposeOfEvent: z.array(CodeableConceptSchema).optional(),
  agent: z.array(AuditEventAgentSchema),
  source: AuditEventSourceSchema,
  entity: z.array(AuditEventEntitySchema).optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueQuantity: z.object({
      value: z.number(),
      unit: z.string().optional(),
      system: z.string().url().optional(),
      code: z.string().optional()
    }).optional(),
    valueBoolean: z.boolean().optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditEventCreateSchema = AuditEventSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('AuditEvent').default('AuditEvent')
});

export type AuditEventCreate = z.infer<typeof AuditEventCreateSchema>;

export function createAuditEvent(data: z.infer<typeof AuditEventCreateSchema>): AuditEvent {
  return AuditEventSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'AuditEvent',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr-audit'
    }
  });
}

// Security-related types
export const SecurityRoleSchema = z.enum([
  'EMS_PROVIDER',
  'EMS_SUPERVISOR',
  'EMS_MEDICAL_DIRECTOR',
  'EMS_ADMIN',
  'HOSPITAL_STAFF',
  'HOSPITAL_PHYSICIAN',
  'DISPATCHER',
  'QUALITY_MANAGER',
  'AUDITOR',
  'SYSTEM_ADMIN'
]);

export const SecurityPermissionSchema = z.enum([
  'PATIENT_READ',
  'PATIENT_WRITE',
  'PATIENT_DELETE',
  'ENCOUNTER_READ',
  'ENCOUNTER_WRITE',
  'ENCOUNTER_DELETE',
  'OBSERVATION_READ',
  'OBSERVATION_WRITE',
  'MEDICATION_ADMINISTER',
  'PROCEDURE_PERFORM',
  'DOCUMENT_SIGN',
  'HANDOFF_CREATE',
  'HANDOFF_RECEIVE',
  'AUDIT_READ',
  'ADMIN_USERS',
  'ADMIN_SYSTEM',
  'PROTOCOL_MANAGE',
  'DEVICE_MANAGE',
  'REPORT_GENERATE',
  'DATA_EXPORT'
]);

export const RolePermissionsSchema = z.object({
  role: SecurityRoleSchema,
  permissions: z.array(SecurityPermissionSchema),
  constraints: z.array(z.object({
    resource: z.string(),
    filter: z.record(z.string(), z.any())
  })).optional()
});

export const SessionSchema = z.object({
  id: ulidSchema,
  userId: ulidSchema,
  deviceId: z.string(),
  roles: z.array(SecurityRoleSchema),
  permissions: z.array(SecurityPermissionSchema),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastActivity: z.string().datetime(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accuracy: z.number().optional()
  }).optional()
});

export type Session = z.infer<typeof SessionSchema>;

export const ConsentSchema = BaseResourceSchema.extend({
  resourceType: z.literal('Consent'),
  identifier: z.array(z.object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: CodeableConceptSchema.optional(),
    system: z.string().url().optional(),
    value: z.string(),
    period: PeriodSchema.optional(),
    assigner: ReferenceSchema.optional()
  })).optional(),
  status: z.enum(['draft', 'proposed', 'active', 'rejected', 'inactive', 'entered-in-error']),
  scope: CodeableConceptSchema,
  category: z.array(CodeableConceptSchema).optional(),
  patient: ReferenceSchema,
  dateTime: z.string().datetime(),
  performer: z.array(ReferenceSchema).optional(),
  organization: z.array(ReferenceSchema).optional(),
  sourceAttachment: z.object({
    contentType: z.string(),
    language: z.string().optional(),
    data: z.string().optional(),
    url: z.string().url().optional(),
    title: z.string().optional(),
    creation: z.string().datetime().optional()
  }).optional(),
  sourceReference: ReferenceSchema.optional(),
  policy: z.array(z.object({
    authority: z.string().url().optional(),
    uri: z.string().url().optional()
  })).optional(),
  policyRule: CodeableConceptSchema.optional(),
  verification: z.array(z.object({
    verified: z.boolean(),
    verifiedWith: ReferenceSchema.optional(),
    verificationDate: z.string().datetime().optional()
  })).optional(),
  provision: z.object({
    type: z.enum(['deny', 'permit']),
    period: PeriodSchema.optional(),
    actor: z.array(z.object({
      role: CodeableConceptSchema.optional(),
      reference: ReferenceSchema
    })).optional(),
    action: z.array(CodeableConceptSchema).optional(),
    securityLabel: z.array(CodeableConceptSchema).optional(),
    purpose: z.array(CodeableConceptSchema).optional(),
    class: z.array(z.object({
      code: CodeableConceptSchema,
      period: PeriodSchema.optional()
    })).optional(),
    code: z.array(CodeableConceptSchema).optional(),
    data: z.array(z.object({
      meaning: z.enum(['instance', 'related', 'dependents', 'authoredby']),
      reference: ReferenceSchema
    })).optional()
  }).optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueBoolean: z.boolean().optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type Consent = z.infer<typeof ConsentSchema>;