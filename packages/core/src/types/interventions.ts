import { z } from 'zod';
import {
  BaseResourceSchema,
  ReferenceSchema,
  CodeableConceptSchema,
  QuantitySchema,
  RatioSchema,
  PeriodSchema,
  ulidSchema,
  generateId
} from './fhir-base';

export const MedicationAdministrationStatusSchema = z.enum([
  'in-progress',
  'on-hold',
  'completed',
  'entered-in-error',
  'stopped',
  'not-done',
  'unknown'
]);

export const MedicationAdministrationCategorySchema = z.enum([
  'emergency',
  'protocol',
  'standing-order',
  'medical-direction',
  'patient-assisted',
  'self-administered'
]);

export const RouteSchema = z.enum([
  'IV',
  'IO',
  'IM',
  'SUBQ',
  'IN',
  'PO',
  'SL',
  'BUCCAL',
  'RECTAL',
  'TOP',
  'INH',
  'NEB',
  'ETT',
  'TRANSDERMAL'
]);

export type Route = z.infer<typeof RouteSchema>;

export type MedicationAdministrationCategory = z.infer<
  typeof MedicationAdministrationCategorySchema
>;

export const DoseRateSchema = z.object({
  value: z.number(),
  unit: z.string(),
  system: z.string().url().optional(),
  code: z.string().optional()
});

export const MedicationAdministrationSchema = BaseResourceSchema.extend({
  resourceType: z.literal('MedicationAdministration'),
  identifier: z.array(z.object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: CodeableConceptSchema.optional(),
    system: z.string().url().optional(),
    value: z.string(),
    period: PeriodSchema.optional(),
    assigner: ReferenceSchema.optional()
  })).optional(),
  instantiates: z.array(z.string().url()).optional(),
  partOf: z.array(ReferenceSchema).optional(),
  status: MedicationAdministrationStatusSchema,
  statusReason: z.array(CodeableConceptSchema).optional(),
  category: z.array(CodeableConceptSchema).optional(),
  medicationCodeableConcept: CodeableConceptSchema,
  medicationReference: ReferenceSchema.optional(),
  subject: ReferenceSchema,
  context: ReferenceSchema.optional(),
  supportingInformation: z.array(ReferenceSchema).optional(),
  effectiveDateTime: z.string().datetime().optional(),
  effectivePeriod: PeriodSchema.optional(),
  performer: z.array(z.object({
    function: CodeableConceptSchema.optional(),
    actor: ReferenceSchema
  })).optional(),
  reasonCode: z.array(CodeableConceptSchema).optional(),
  reasonReference: z.array(ReferenceSchema).optional(),
  request: ReferenceSchema.optional(),
  device: z.array(ReferenceSchema).optional(),
  note: z.array(z.object({
    authorString: z.string().optional(),
    authorReference: ReferenceSchema.optional(),
    time: z.string().datetime().optional(),
    text: z.string()
  })).optional(),
  dosage: z.object({
    text: z.string().optional(),
    site: CodeableConceptSchema.optional(),
    route: CodeableConceptSchema,
    method: CodeableConceptSchema.optional(),
    dose: QuantitySchema.optional(),
    doseQuantity: QuantitySchema.optional(),
    doseRange: z.object({
      low: QuantitySchema.optional(),
      high: QuantitySchema.optional()
    }).optional(),
    rateQuantity: QuantitySchema.optional(),
    rateRatio: RatioSchema.optional(),
    rateRange: z.object({
      low: QuantitySchema.optional(),
      high: QuantitySchema.optional()
    }).optional(),
    duration: z.number().optional(),
    durationUnit: z.string().optional()
  }).optional(),
  eventHistory: z.array(ReferenceSchema).optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueQuantity: QuantitySchema.optional(),
    valueBoolean: z.boolean().optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type MedicationAdministration = z.infer<typeof MedicationAdministrationSchema>;

export const MedicationAdministrationCreateSchema = MedicationAdministrationSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('MedicationAdministration').default('MedicationAdministration'),
  status: MedicationAdministrationStatusSchema.default('completed')
});

export type MedicationAdministrationCreate = z.infer<typeof MedicationAdministrationCreateSchema>;

export function createMedicationAdministration(data: z.infer<typeof MedicationAdministrationCreateSchema>): MedicationAdministration {
  return MedicationAdministrationSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'MedicationAdministration',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr'
    }
  });
}

export const ProcedureStatusSchema = z.enum([
  'preparation',
  'in-progress',
  'on-hold',
  'completed',
  'entered-in-error',
  'stopped',
  'not-done',
  'unknown'
]);

export const ProcedureCategorySchema = z.enum([
  'airway',
  'breathing',
  'circulation',
  'cardiac',
  'trauma',
  'medical',
  'obstetric',
  'pediatric',
  'diagnostic',
  'monitoring',
  'vascular-access',
  'immobilization',
  'wound-care',
  'other'
]);

export type ProcedureCategory = z.infer<typeof ProcedureCategorySchema>;

export const ProcedureSchema = BaseResourceSchema.extend({
  resourceType: z.literal('Procedure'),
  identifier: z.array(z.object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: CodeableConceptSchema.optional(),
    system: z.string().url().optional(),
    value: z.string(),
    period: PeriodSchema.optional(),
    assigner: ReferenceSchema.optional()
  })).optional(),
  instantiatesCanonical: z.array(z.string().url()).optional(),
  instantiatesUri: z.array(z.string().url()).optional(),
  basedOn: z.array(ReferenceSchema).optional(),
  partOf: z.array(ReferenceSchema).optional(),
  status: ProcedureStatusSchema,
  statusReason: CodeableConceptSchema.optional(),
  category: CodeableConceptSchema.optional(),
  code: CodeableConceptSchema,
  subject: ReferenceSchema,
  encounter: ReferenceSchema.optional(),
  performedDateTime: z.string().datetime().optional(),
  performedPeriod: PeriodSchema.optional(),
  recorder: ReferenceSchema.optional(),
  asserter: ReferenceSchema.optional(),
  performer: z.array(z.object({
    function: CodeableConceptSchema.optional(),
    actor: ReferenceSchema,
    onBehalfOf: ReferenceSchema.optional()
  })).optional(),
  location: ReferenceSchema.optional(),
  reasonCode: z.array(CodeableConceptSchema).optional(),
  reasonReference: z.array(ReferenceSchema).optional(),
  bodySite: z.array(CodeableConceptSchema).optional(),
  outcome: CodeableConceptSchema.optional(),
  report: z.array(ReferenceSchema).optional(),
  complication: z.array(CodeableConceptSchema).optional(),
  complicationDetail: z.array(ReferenceSchema).optional(),
  followUp: z.array(CodeableConceptSchema).optional(),
  note: z.array(z.object({
    authorString: z.string().optional(),
    authorReference: ReferenceSchema.optional(),
    time: z.string().datetime().optional(),
    text: z.string()
  })).optional(),
  focalDevice: z.array(z.object({
    action: CodeableConceptSchema.optional(),
    manipulated: ReferenceSchema
  })).optional(),
  usedReference: z.array(ReferenceSchema).optional(),
  usedCode: z.array(CodeableConceptSchema).optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueQuantity: QuantitySchema.optional(),
    valueBoolean: z.boolean().optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type Procedure = z.infer<typeof ProcedureSchema>;

export const ProcedureCreateSchema = ProcedureSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('Procedure').default('Procedure'),
  status: ProcedureStatusSchema.default('completed')
});

export type ProcedureCreate = z.infer<typeof ProcedureCreateSchema>;

export function createProcedure(data: z.infer<typeof ProcedureCreateSchema>): Procedure {
  return ProcedureSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'Procedure',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr'
    }
  });
}

export const ConditionSchema = BaseResourceSchema.extend({
  resourceType: z.literal('Condition'),
  identifier: z.array(z.object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: CodeableConceptSchema.optional(),
    system: z.string().url().optional(),
    value: z.string(),
    period: PeriodSchema.optional(),
    assigner: ReferenceSchema.optional()
  })).optional(),
  clinicalStatus: z.object({
    coding: z.array(z.object({
      system: z.string().url(),
      code: z.string(),
      display: z.string().optional()
    })).optional(),
    text: z.string().optional()
  }).optional(),
  verificationStatus: z.object({
    coding: z.array(z.object({
      system: z.string().url(),
      code: z.string(),
      display: z.string().optional()
    })).optional(),
    text: z.string().optional()
  }).optional(),
  category: z.array(CodeableConceptSchema).optional(),
  severity: CodeableConceptSchema.optional(),
  code: CodeableConceptSchema,
  bodySite: z.array(CodeableConceptSchema).optional(),
  subject: ReferenceSchema,
  encounter: ReferenceSchema.optional(),
  onsetDateTime: z.string().datetime().optional(),
  onsetPeriod: PeriodSchema.optional(),
  onsetString: z.string().optional(),
  onsetAge: QuantitySchema.optional(),
  onsetRange: z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional()
  }).optional(),
  abatementDateTime: z.string().datetime().optional(),
  abatementPeriod: PeriodSchema.optional(),
  abatementString: z.string().optional(),
  abatementAge: QuantitySchema.optional(),
  abatementRange: z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional()
  }).optional(),
  recordedDate: z.string().datetime().optional(),
  recorder: ReferenceSchema.optional(),
  asserter: ReferenceSchema.optional(),
  stage: z.array(z.object({
    summary: CodeableConceptSchema.optional(),
    assessment: z.array(ReferenceSchema).optional(),
    type: CodeableConceptSchema.optional()
  })).optional(),
  evidence: z.array(z.object({
    code: CodeableConceptSchema.optional(),
    detail: z.array(ReferenceSchema).optional()
  })).optional(),
  note: z.array(z.object({
    authorString: z.string().optional(),
    authorReference: ReferenceSchema.optional(),
    time: z.string().datetime().optional(),
    text: z.string()
  })).optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueQuantity: QuantitySchema.optional(),
    valueBoolean: z.boolean().optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type Condition = z.infer<typeof ConditionSchema>;

export const ConditionCreateSchema = ConditionSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('Condition').default('Condition')
});

export type ConditionCreate = z.infer<typeof ConditionCreateSchema>;

export function createCondition(data: z.infer<typeof ConditionCreateSchema>): Condition {
  return ConditionSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'Condition',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr'
    }
  });
}