import { z } from 'zod';
import {
  BaseResourceSchema,
  IdentifierSchema,
  ReferenceSchema,
  CodeableConceptSchema,
  PeriodSchema,
  ulidSchema,
  generateId
} from './fhir-base';

export const EncounterStatusSchema = z.enum([
  'planned',
  'arrived',
  'triaged',
  'in-progress',
  'on-scene',
  'in-transit',
  'at-destination',
  'finished',
  'cancelled',
  'entered-in-error',
  'unknown'
]);

export const EncounterClassSchema = z.enum([
  'emergency',
  'non-emergency',
  'interfacility',
  'medical-transport',
  'community-paramedicine',
  'standby'
]);

export const EncounterPrioritySchema = z.enum([
  'routine',
  'urgent',
  'emergent',
  'critical'
]);

export const EMSUnitLevelSchema = z.enum(['BLS', 'ALS', 'CC', 'AIR', 'TACTICAL', 'COMMUNITY']);

export const EMSUnitSchema = z.object({
  id: ulidSchema,
  identifier: IdentifierSchema,
  name: z.string(),
  level: EMSUnitLevelSchema,
  station: z.string().optional(),
  gpsLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    timestamp: z.string().datetime()
  }).optional(),
  crew: z.array(z.object({
    providerId: ulidSchema,
    role: z.enum(['driver', 'attendant', 'lead', 'student', 'observer']),
    primary: z.boolean()
  })).optional()
});

export const SceneDetailsSchema = z.object({
  locationType: CodeableConceptSchema.optional(),
  address: z.string().optional(),
  gpsCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional()
  }).optional(),
  mechanismOfInjury: z.string().optional(),
  hazards: z.array(CodeableConceptSchema).optional(),
  patientAccess: z.enum(['easy', 'difficult', 'extrication', 'hazardous']).optional(),
  sceneTime: z.object({
    arrival: z.string().datetime().optional(),
    departure: z.string().datetime().optional()
  }).optional()
});

export const TransportDetailsSchema = z.object({
  mode: z.enum(['ground', 'air-fixed-wing', 'air-rotor', 'water', 'non-transport']),
  priority: EncounterPrioritySchema,
  destination: ReferenceSchema.optional(),
  destinationType: z.enum(['emergency-department', 'trauma-center', 'specialty-center', 'hospital', 'clinic', 'home', 'other']).optional(),
  lightsAndSirens: z.boolean().optional(),
  transportTime: z.object({
    departureScene: z.string().datetime().optional(),
    arrivalDestination: z.string().datetime().optional()
  }).optional(),
  patientPosition: z.enum(['supine', 'fowlers', 'left-lateral', 'right-lateral', 'prone', 'sitting', 'trendelenburg']).optional()
});

export const TriageSchema = z.object({
  system: z.enum(['START', 'ESI', 'MTS', 'CTAS', 'SALT', 'JUMPSTART', 'CUSTOM']),
  category: z.enum(['immediate', 'delayed', 'minimal', 'expectant', 'deceased', '1', '2', '3', '4', '5']),
  score: z.number().optional(),
  assessedBy: ReferenceSchema,
  assessedAt: z.string().datetime(),
  tags: z.array(CodeableConceptSchema).optional()
});

export const ProtocolSchema = z.object({
  identifier: IdentifierSchema,
  name: z.string(),
  version: z.string(),
  deviation: z.boolean().optional(),
  deviationReason: z.string().optional(),
  deviationApprovedBy: ReferenceSchema.optional()
});

export const EncounterSchema = BaseResourceSchema.extend({
  resourceType: z.literal('Encounter'),
  identifier: z.array(IdentifierSchema).optional(),
  status: EncounterStatusSchema,
  statusHistory: z.array(z.object({
    status: EncounterStatusSchema,
    period: PeriodSchema
  })).optional(),
  class: EncounterClassSchema,
  classHistory: z.array(z.object({
    class: EncounterClassSchema,
    period: PeriodSchema
  })).optional(),
  type: z.array(CodeableConceptSchema).optional(),
  priority: EncounterPrioritySchema.optional(),
  subject: ReferenceSchema,
  episodeOfCare: z.array(ReferenceSchema).optional(),
  basedOn: z.array(ReferenceSchema).optional(),
  participant: z.array(z.object({
    type: z.array(CodeableConceptSchema).optional(),
    period: PeriodSchema.optional(),
    individual: ReferenceSchema
  })).optional(),
  appointment: ReferenceSchema.optional(),
  period: PeriodSchema,
  length: z.object({
    value: z.number(),
    unit: z.string(),
    system: z.string().url(),
    code: z.string()
  }).optional(),
  reasonCode: z.array(CodeableConceptSchema).optional(),
  reasonReference: z.array(ReferenceSchema).optional(),
  diagnosis: z.array(z.object({
    condition: ReferenceSchema,
    use: CodeableConceptSchema.optional(),
    rank: z.number().int().positive().optional()
  })).optional(),
  account: z.array(ReferenceSchema).optional(),
  hospitalization: z.object({
    preAdmissionIdentifier: IdentifierSchema.optional(),
    origin: ReferenceSchema.optional(),
    admitSource: CodeableConceptSchema.optional(),
    reAdmission: CodeableConceptSchema.optional(),
    dietPreference: z.array(CodeableConceptSchema).optional(),
    specialCourtesy: z.array(CodeableConceptSchema).optional(),
    specialArrangement: z.array(CodeableConceptSchema).optional(),
    destination: ReferenceSchema.optional(),
    dischargeDisposition: CodeableConceptSchema.optional()
  }).optional(),
  location: z.array(z.object({
    location: ReferenceSchema,
    status: z.enum(['planned', 'active', 'reserved', 'completed']).optional(),
    period: PeriodSchema.optional()
  })).optional(),
  serviceProvider: ReferenceSchema.optional(),
  partOf: ReferenceSchema.optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueReference: ReferenceSchema.optional(),
    valuePeriod: PeriodSchema.optional(),
    valueBoolean: z.boolean().optional(),
    valueInteger: z.number().int().optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type Encounter = z.infer<typeof EncounterSchema>;

export const EncounterCreateSchema = EncounterSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('Encounter').default('Encounter'),
  status: EncounterStatusSchema.default('planned')
});

export type EncounterCreate = z.infer<typeof EncounterCreateSchema>;

export function createEncounter(data: z.infer<typeof EncounterCreateSchema>): Encounter {
  return EncounterSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'Encounter',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr'
    }
  });
}

export const EncounterSearchParamsSchema = z.object({
  _id: z.array(ulidSchema).optional(),
  patient: z.string().optional(),
  status: EncounterStatusSchema.optional(),
  class: EncounterClassSchema.optional(),
  date: z.string().optional(),
  provider: z.string().optional(),
  location: z.string().optional(),
  _count: z.number().int().positive().max(1000).optional(),
  _offset: z.number().int().nonnegative().optional(),
  _sort: z.string().optional()
});

export type EncounterSearchParams = z.infer<typeof EncounterSearchParamsSchema>;