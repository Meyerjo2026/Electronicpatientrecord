import { z } from 'zod';
import { ULID } from 'ulid';

export const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid ULID');

export function generateId(): string {
  return ULID.generate();
}

export function isValidULID(id: string): boolean {
  return ulidSchema.safeParse(id).success;
}

export const BaseResourceSchema = z.object({
  resourceType: z.string(),
  id: ulidSchema,
  meta: z.object({
    versionId: z.string().optional(),
    lastUpdated: z.string().datetime().optional(),
    source: z.string().optional(),
    profile: z.array(z.string().url()).optional(),
    security: z.array(z.string()).optional(),
    tag: z.array(z.object({
      system: z.string().url(),
      code: z.string(),
      display: z.string().optional()
    })).optional()
  }).optional(),
  implicitRules: z.string().url().optional(),
  language: z.string().optional(),
  text: z.object({
    status: z.enum(['generated', 'extensions', 'additional', 'empty']),
    div: z.string()
  }).optional(),
  contained: z.array(z.any()).optional(),
  extension: z.array(z.any()).optional(),
  modifierExtension: z.array(z.any()).optional()
});

export type BaseResource = z.infer<typeof BaseResourceSchema>;

export const IdentifierSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
  type: z.object({
    coding: z.array(z.object({
      system: z.string().url(),
      code: z.string(),
      display: z.string().optional()
    })).optional(),
    text: z.string().optional()
  }).optional(),
  system: z.string().url().optional(),
  value: z.string(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  assigner: z.object({
    reference: z.string().optional(),
    type: z.string().optional(),
    identifier: IdentifierSchema.optional(),
    display: z.string().optional()
  }).optional()
});

export type Identifier = z.infer<typeof IdentifierSchema>;

export const HumanNameSchema = z.object({
  use: z.enum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']).optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional()
});

export type HumanName = z.infer<typeof HumanNameSchema>;

export const ContactPointSchema = z.object({
  system: z.enum(['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other']).optional(),
  value: z.string().optional(),
  use: z.enum(['home', 'work', 'temp', 'old', 'mobile']).optional(),
  rank: z.number().int().positive().optional(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional()
});

export type ContactPoint = z.infer<typeof ContactPointSchema>;

export const AddressSchema = z.object({
  use: z.enum(['home', 'work', 'temp', 'old', 'billing']).optional(),
  type: z.enum(['postal', 'physical', 'both']).optional(),
  text: z.string().optional(),
  line: z.array(z.string()).optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional()
});

export type Address = z.infer<typeof AddressSchema>;

export const PeriodSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

export type Period = z.infer<typeof PeriodSchema>;

export const ReferenceSchema = z.object({
  reference: z.string().optional(),
  type: z.string().optional(),
  identifier: IdentifierSchema.optional(),
  display: z.string().optional()
});

export type Reference = z.infer<typeof ReferenceSchema>;

export const CodeableConceptSchema = z.object({
  coding: z.array(z.object({
    system: z.string().url(),
    code: z.string(),
    display: z.string().optional(),
    userSelected: z.boolean().optional()
  })).optional(),
  text: z.string().optional()
});

export type CodeableConcept = z.infer<typeof CodeableConceptSchema>;

export const CodingSchema = z.object({
  system: z.string().url(),
  version: z.string().optional(),
  code: z.string(),
  display: z.string().optional(),
  userSelected: z.boolean().optional()
});

export type Coding = z.infer<typeof CodingSchema>;

export const QuantitySchema = z.object({
  value: z.number(),
  comparator: z.enum(['<', '<=', '>=', '>']).optional(),
  unit: z.string().optional(),
  system: z.string().url().optional(),
  code: z.string().optional()
});

export type Quantity = z.infer<typeof QuantitySchema>;

export const RatioSchema = z.object({
  numerator: QuantitySchema.optional(),
  denominator: QuantitySchema.optional()
});

export type Ratio = z.infer<typeof RatioSchema>;

export const RangeSchema = z.object({
  low: QuantitySchema.optional(),
  high: QuantitySchema.optional()
});

export type Range = z.infer<typeof RangeSchema>;

export const SampledDataSchema = z.object({
  origin: QuantitySchema,
  period: z.number().positive(),
  factor: z.number().optional(),
  lowerLimit: z.number().optional(),
  upperLimit: z.number().optional(),
  dimensions: z.number().int().positive(),
  data: z.string()
});

export type SampledData = z.infer<typeof SampledDataSchema>;