import { z } from 'zod';
import {
  BaseResourceSchema,
  IdentifierSchema,
  HumanNameSchema,
  ContactPointSchema,
  AddressSchema,
  ReferenceSchema,
  CodeableConceptSchema,
  PeriodSchema,
  ulidSchema,
  generateId
} from './fhir-base';

export const PatientGenderSchema = z.enum(['male', 'female', 'other', 'unknown']);

export const PatientCommunicationSchema = z.object({
  language: CodeableConceptSchema,
  preferred: z.boolean().optional()
});

export const PatientContactSchema = z.object({
  relationship: z.array(CodeableConceptSchema).optional(),
  name: HumanNameSchema.optional(),
  telecom: z.array(ContactPointSchema).optional(),
  address: AddressSchema.optional(),
  gender: PatientGenderSchema.optional(),
  organization: ReferenceSchema.optional(),
  period: PeriodSchema.optional()
});

export const PatientLinkSchema = z.object({
  other: ReferenceSchema,
  type: z.enum(['replaced-by', 'replaces', 'refer', 'seealso'])
});

export const EMSPatientExtensionSchema = z.object({
  url: z.string().url(),
  valueString: z.string().optional(),
  valueCodeableConcept: CodeableConceptSchema.optional(),
  valueReference: ReferenceSchema.optional(),
  valuePeriod: PeriodSchema.optional(),
  extension: z.array(z.any()).optional()
});

export const PatientSchema = BaseResourceSchema.extend({
  resourceType: z.literal('Patient'),
  identifier: z.array(IdentifierSchema).optional(),
  active: z.boolean().optional(),
  name: z.array(HumanNameSchema).optional(),
  telecom: z.array(ContactPointSchema).optional(),
  gender: PatientGenderSchema.optional(),
  birthDate: z.string().date().optional(),
  deceasedBoolean: z.boolean().optional(),
  deceasedDateTime: z.string().datetime().optional(),
  address: z.array(AddressSchema).optional(),
  maritalStatus: CodeableConceptSchema.optional(),
  multipleBirthBoolean: z.boolean().optional(),
  multipleBirthInteger: z.number().int().optional(),
  photo: z.array(z.object({
    contentType: z.string().optional(),
    language: z.string().optional(),
    data: z.string().optional(),
    url: z.string().url().optional(),
    title: z.string().optional(),
    creation: z.string().datetime().optional()
  })).optional(),
  contact: z.array(PatientContactSchema).optional(),
  communication: z.array(PatientCommunicationSchema).optional(),
  generalPractitioner: z.array(ReferenceSchema).optional(),
  managingOrganization: ReferenceSchema.optional(),
  link: z.array(PatientLinkSchema).optional(),
  extension: z.array(EMSPatientExtensionSchema).optional()
});

export type Patient = z.infer<typeof PatientSchema>;

export const PatientCreateSchema = PatientSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('Patient').default('Patient')
});

export type PatientCreate = z.infer<typeof PatientCreateSchema>;

export function createPatient(data: z.infer<typeof PatientCreateSchema>): Patient {
  return PatientSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'Patient',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr'
    }
  });
}

export const PatientSearchParamsSchema = z.object({
  _id: z.array(ulidSchema).optional(),
  identifier: z.string().optional(),
  name: z.string().optional(),
  given: z.string().optional(),
  family: z.string().optional(),
  gender: PatientGenderSchema.optional(),
  birthdate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  organization: z.string().optional(),
  _count: z.number().int().positive().max(1000).optional(),
  _offset: z.number().int().nonnegative().optional(),
  _sort: z.string().optional()
});

export type PatientSearchParams = z.infer<typeof PatientSearchParamsSchema>;