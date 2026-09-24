import { z } from 'zod';
import {
  Patient,
  Encounter,
  Observation,
  MedicationAdministration,
  Procedure,
  Condition,
  AuditEvent,
  Consent,
  VitalSignsSet
} from '@prehospital-epr/core';
import { FHIRResource, validateResource } from '../resources/bundle';

export const FHIRValidationResultSchema = z.object({
  success: z.boolean(),
  resource: z.any().optional(),
  errors: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
    code: z.string().optional()
  })).optional(),
  warnings: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
    code: z.string().optional()
  })).optional()
});

export type FHIRValidationResult = z.infer<typeof FHIRValidationResultSchema>;

// Resource-specific validators using core schemas
import {
  PatientSchema,
  EncounterSchema,
  ObservationSchema,
  MedicationAdministrationSchema,
  ProcedureSchema,
  ConditionSchema
} from '@prehospital-epr/core';

const validators: Record<string, z.ZodSchema> = {
  Patient: PatientSchema,
  Encounter: EncounterSchema,
  Observation: ObservationSchema,
  MedicationAdministration: MedicationAdministrationSchema,
  Procedure: ProcedureSchema,
  Condition: ConditionSchema
};

export function validateResourceByType(
  resourceType: string,
  data: unknown
): FHIRValidationResult {
  const validator = validators[resourceType];
  
  if (!validator) {
    return {
      success: false,
      errors: [{
        path: ['resourceType'],
        message: `Unsupported resource type: ${resourceType}`,
        code: 'unsupported-resource-type'
      }]
    };
  }
  
  const result = validator.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      resource: result.data as FHIRResource
    };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(e => ({
      path: e.path,
      message: e.message,
      code: e.code
    }))
  };
}

export function validateBundleEntries(bundle: any): FHIRValidationResult[] {
  if (!bundle.entry || !Array.isArray(bundle.entry)) {
    return [{
      success: false,
      errors: [{
        path: ['entry'],
        message: 'Bundle must have an entry array',
        code: 'missing-entry'
      }]
    }];
  }
  
  return bundle.entry.map((entry: any, index: number) => {
    if (!entry.resource) {
      return {
        success: false,
        errors: [{
          path: ['entry', index, 'resource'],
          message: 'Entry must have a resource',
          code: 'missing-resource'
        }]
      };
    }
    
    return validateResourceByType(entry.resource.resourceType, entry.resource);
  });
}

// FHIRPath evaluation for search
export interface FHIRSearchParam {
  name: string;
  type: 'number' | 'date' | 'string' | 'token' | 'reference' | 'composite' | 'quantity' | 'uri';
  path: string;
  description: string;
  target?: string[];
}

export const commonSearchParams: FHIRSearchParam[] = [
  { name: '_id', type: 'token', path: 'id', description: 'Resource ID' },
  { name: '_lastUpdated', type: 'date', path: 'meta.lastUpdated', description: 'Last updated' },
  { name: '_tag', type: 'token', path: 'meta.tag', description: 'Tag' },
  { name: '_profile', type: 'uri', path: 'meta.profile', description: 'Profile' },
  { name: '_security', type: 'token', path: 'meta.security', description: 'Security label' },
  { name: '_text', type: 'string', path: '', description: 'Full text search' },
  { name: '_content', type: 'string', path: '', description: 'Content search' },
  { name: '_list', type: 'token', path: '', description: 'List membership' },
  { name: '_has', type: 'token', path: '', description: 'Has resource' },
  { name: '_type', type: 'token', path: 'resourceType', description: 'Resource type' }
];

export const patientSearchParams: FHIRSearchParam[] = [
  ...commonSearchParams,
  { name: 'identifier', type: 'token', path: 'identifier', description: 'Patient identifier' },
  { name: 'name', type: 'string', path: 'name', description: 'Patient name' },
  { name: 'given', type: 'string', path: 'name.given', description: 'Given name' },
  { name: 'family', type: 'string', path: 'name.family', description: 'Family name' },
  { name: 'gender', type: 'token', path: 'gender', description: 'Gender' },
  { name: 'birthdate', type: 'date', path: 'birthDate', description: 'Birth date' },
  { name: 'deceased', type: 'token', path: 'deceased[x]', description: 'Deceased' },
  { name: 'address', type: 'string', path: 'address', description: 'Address' },
  { name: 'phone', type: 'token', path: 'telecom', description: 'Phone number' },
  { name: 'email', type: 'token', path: 'telecom', description: 'Email' },
  { name: 'organization', type: 'reference', path: 'managingOrganization', target: ['Organization'], description: 'Managing organization' }
];

export const encounterSearchParams: FHIRSearchParam[] = [
  ...commonSearchParams,
  { name: 'patient', type: 'reference', path: 'subject', target: ['Patient'], description: 'Patient' },
  { name: 'status', type: 'token', path: 'status', description: 'Encounter status' },
  { name: 'class', type: 'token', path: 'class', description: 'Encounter class' },
  { name: 'type', type: 'token', path: 'type', description: 'Encounter type' },
  { name: 'date', type: 'date', path: 'period', description: 'Encounter date' },
  { name: 'provider', type: 'reference', path: 'participant.individual', target: ['Practitioner'], description: 'Provider' },
  { name: 'location', type: 'reference', path: 'location.location', target: ['Location'], description: 'Location' },
  { name: 'diagnosis', type: 'reference', path: 'diagnosis.condition', target: ['Condition'], description: 'Diagnosis' }
];

export const observationSearchParams: FHIRSearchParam[] = [
  ...commonSearchParams,
  { name: 'patient', type: 'reference', path: 'subject', target: ['Patient'], description: 'Patient' },
  { name: 'encounter', type: 'reference', path: 'encounter', target: ['Encounter'], description: 'Encounter' },
  { name: 'category', type: 'token', path: 'category', description: 'Category' },
  { name: 'code', type: 'token', path: 'code', description: 'Observation code' },
  { name: 'date', type: 'date', path: 'effective[x]', description: 'Observation date' },
  { name: 'performer', type: 'reference', path: 'performer', target: ['Practitioner', 'Organization'], description: 'Performer' },
  { name: 'value-quantity', type: 'quantity', path: 'valueQuantity', description: 'Value quantity' },
  { name: 'value-concept', type: 'token', path: 'valueCodeableConcept', description: 'Value concept' }
];

export const allSearchParams: Record<string, FHIRSearchParam[]> = {
  Patient: patientSearchParams,
  Encounter: encounterSearchParams,
  Observation: observationSearchParams,
  MedicationAdministration: [
    ...commonSearchParams,
    { name: 'patient', type: 'reference', path: 'subject', target: ['Patient'], description: 'Patient' },
    { name: 'encounter', type: 'reference', path: 'context', target: ['Encounter'], description: 'Encounter' },
    { name: 'code', type: 'token', path: 'medicationCodeableConcept', description: 'Medication code' },
    { name: 'date', type: 'date', path: 'effective[x]', description: 'Administration date' },
    { name: 'performer', type: 'reference', path: 'performer.actor', target: ['Practitioner'], description: 'Performer' },
    { name: 'status', type: 'token', path: 'status', description: 'Status' }
  ],
  Procedure: [
    ...commonSearchParams,
    { name: 'patient', type: 'reference', path: 'subject', target: ['Patient'], description: 'Patient' },
    { name: 'encounter', type: 'reference', path: 'encounter', target: ['Encounter'], description: 'Encounter' },
    { name: 'code', type: 'token', path: 'code', description: 'Procedure code' },
    { name: 'date', type: 'date', path: 'performed[x]', description: 'Procedure date' },
    { name: 'performer', type: 'reference', path: 'performer.actor', target: ['Practitioner'], description: 'Performer' },
    { name: 'status', type: 'token', path: 'status', description: 'Status' }
  ],
  Condition: [
    ...commonSearchParams,
    { name: 'patient', type: 'reference', path: 'subject', target: ['Patient'], description: 'Patient' },
    { name: 'encounter', type: 'reference', path: 'encounter', target: ['Encounter'], description: 'Encounter' },
    { name: 'code', type: 'token', path: 'code', description: 'Condition code' },
    { name: 'onset', type: 'date', path: 'onset[x]', description: 'Onset date' },
    { name: 'clinical-status', type: 'token', path: 'clinicalStatus', description: 'Clinical status' },
    { name: 'verification-status', type: 'token', path: 'verificationStatus', description: 'Verification status' },
    { name: 'category', type: 'token', path: 'category', description: 'Category' },
    { name: 'severity', type: 'token', path: 'severity', description: 'Severity' }
  ]
};

export function getSearchParams(resourceType: string): FHIRSearchParam[] {
  return allSearchParams[resourceType] || commonSearchParams;
}