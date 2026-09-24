/**
 * NEMSIS v3.5 Domain Types
 * Re-exports and extends generated types for form usage
 */

import type { GeneratedElement, GeneratedValueSet, GeneratedValueSetValue, GeneratedSection } from './generated-data';

// Re-export generated types
export type { GeneratedElement, GeneratedValueSet, GeneratedValueSetValue, GeneratedSection };

export type NemsisUsage = 'Required' | 'Recommended' | 'Mandatory' | 'Optional';

export interface NemsisElement {
  code: string;
  id: string;
  name: string;
  definition: string;
  usage: NemsisUsage;
  sectionId: string;
  valueSetId: string | null;
  deprecated: boolean;
}

export interface NemsisValueSet extends GeneratedValueSet {
  values: NemsisValueSetValue[];
}

export interface NemsisValueSetValue extends GeneratedValueSetValue {}

export interface NemsisSection {
  id: string;
  name: string;
  elements: NemsisElement[];
}

/** Form control type derived from element properties */
export type FormControlType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'gps';

/** Extended element config for form rendering */
export interface FormElementConfig extends NemsisElement {
  controlType: FormControlType;
  placeholder?: string;
  required: boolean;
  order: number;
}

/** Section config for form */
export interface FormSectionConfig {
  id: string;
  name: string;
  description?: string;
  elements: FormElementConfig[];
  order: number;
}

/** Patient Care Report form data structure */
export interface PatientReportFormData {
  ePatient: Record<string, any>;
  eTimes: Record<string, any>;
  eSituation: Record<string, any>;
  eScene: Record<string, any>;
  eInjury: Record<string, any>;
  eDisposition: Record<string, any>;
  eNarrative: Record<string, any>;
  meta: {
    startedAt: string;
    updatedAt: string;
    version: string;
  };
}

export const PATIENT_REPORT_VERSION = '1.0.0';

/** Convert generated element to NemsisElement */
export function toNemsisElement(gen: GeneratedElement, sectionId: string): NemsisElement {
  return {
    code: gen.code,
    id: gen.id,
    name: gen.name,
    definition: gen.definition,
    usage: gen.usage as NemsisUsage,
    sectionId,
    valueSetId: gen.valueSetId,
    deprecated: gen.deprecated,
  };
}

/** Convert generated value set */
export function toNemsisValueSet(gen: GeneratedValueSet): NemsisValueSet {
  return {
    id: gen.id,
    name: gen.name,
    values: gen.values,
  };
}