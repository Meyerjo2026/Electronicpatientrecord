/**
 * Form element configurations derived from NEMSIS v3 dictionary
 * Maps generated elements to form rendering configs
 */

import { NEMSIS_SECTIONS, NEMSIS_VALUE_SETS } from './generated-data';
import type { 
  GeneratedElement, 
  GeneratedValueSet, 
  GeneratedSection,
  FormElementConfig, 
  FormSectionConfig,
  FormControlType,
  NemsisUsage
} from './types';

// Re-export generated data
export { NEMSIS_SECTIONS, NEMSIS_VALUE_SETS };
export type { 
  GeneratedElement, 
  GeneratedValueSet, 
  GeneratedValueSetValue,
  GeneratedSection 
} from './generated-data';

/** Sections included in the Patient Report Form */
export const FORM_SECTIONS: string[] = ['ePatient', 'eTimes', 'eSituation', 'eScene', 'eInjury', 'eDisposition', 'eNarrative'];

/** Section display order for the form */
export const SECTION_ORDER: Record<string, number> = {
  ePatient: 1,
  eTimes: 2,
  eSituation: 3,
  eScene: 4,
  eInjury: 5,
  eDisposition: 6,
  eNarrative: 7,
};

/** Element codes that should be excluded from the form (groups, deprecated, etc.) */
const EXCLUDED_CODES = new Set([
  'ePatient.PatientNameGroup',
  'eSituation.PatientComplaintGroup',
  'eSituation.WorkRelatedGroup',
  'eScene.ResponderGroup',
  'eScene.24',
  'eScene.25',
  'eInjury.CollisionGroup',
  'eInjury.SeatGroup',
  'eDisposition.DestinationGroup',
  'eDisposition.IncidentDispositionGroup',
  'eDisposition.HospitalTeamActivationGroup',
]);

/** Usage priorities that should be required in the form */
const REQUIRED_USAGES = new Set(['Required', 'Mandatory']);

/** Determine control type from element properties and value set */
function inferControlType(el: GeneratedElement, valueSet: GeneratedValueSet | undefined): FormControlType {
  if (valueSet) {
    if (valueSet.values.length <= 5) return 'radio';
    return 'select';
  }
  
  const code = el.code.toLowerCase();
  const def = el.definition.toLowerCase();
  
  // Date/time fields
  if (code.includes('.17') || code.includes('date') || def.includes('date/time') || def.includes('date / time') || def.includes('date and time')) {
    return 'datetime';
  }
  if (def.includes('date') && !def.includes('time')) return 'date';
  
  // Number fields
  if (def.includes('age') && !def.includes('unit') || def.includes('height') || def.includes('weight') || def.includes('bpm') || def.includes('count') || def.includes('number')) {
    return 'number';
  }
  
  // GPS coordinates
  if (code.includes('gps') || def.includes('gps') || def.includes('coordinate')) return 'gps';
  
  // Text area for narratives and long descriptions
  if (code === 'eNarrative.01' || def.includes('narrative') || def.includes('description') || def.includes('comment') || def.includes('directions') || def.includes('justification')) {
    return 'textarea';
  }
  
  // Zip codes
  if (code.includes('zip') || code.includes('postal')) return 'text';
  
  // Phone/email
  if (def.includes('phone') || def.includes('email')) return 'text';
  
  // Default to text
  return 'text';
}

/** Get value set by ID */
export function getValueSetById(id: string): GeneratedValueSet | undefined {
  return NEMSIS_VALUE_SETS.find(vs => vs.id === id);
}

/** Get value set for an element */
export function getValueSetForElement(el: GeneratedElement): GeneratedValueSet | undefined {
  if (!el.valueSetId) return undefined;
  return getValueSetById(el.valueSetId);
}

/** Get element by code */
export function getElementByCode(code: string): GeneratedElement | undefined {
  for (const section of Object.values(NEMSIS_SECTIONS)) {
    const found = section.elements.find(e => e.code === code);
    if (found) return found;
  }
  return undefined;
}

/** Convert generated elements to form config for a section */
function buildFormSection(section: GeneratedSection): FormSectionConfig {
  const elements: FormElementConfig[] = [];
  let order = 1;
  
  for (const el of section.elements) {
    if (EXCLUDED_CODES.has(el.code)) continue;
    if (el.deprecated) continue;
    
    const valueSet = getValueSetForElement(el);
    const controlType = inferControlType(el, valueSet);
    
    elements.push({
      ...el,
      sectionId: section.id,
      controlType,
      required: REQUIRED_USAGES.has(el.usage),
      order: order++,
      usage: el.usage as NemsisUsage,
    } as FormElementConfig);
  }
  
  return {
    id: section.id,
    name: section.name,
    elements,
    order: SECTION_ORDER[section.id] ?? 99,
  };
}

/** Get all form sections for the Patient Report Form */
export function getFormSections(): FormSectionConfig[] {
  return FORM_SECTIONS
    .map(id => NEMSIS_SECTIONS[id])
    .filter((s): s is GeneratedSection => s !== undefined)
    .map(buildFormSection)
    .sort((a, b) => a.order - b.order);
}

/** Get flattened form elements for a section */
export function getFormElements(sectionId: string): FormElementConfig[] {
  const section = NEMSIS_SECTIONS[sectionId];
  if (!section) return [];
  return buildFormSection(section).elements;
}

/** Build initial empty form data structure */
export function createEmptyPatientReportFormData(): Record<string, any> {
  const data: Record<string, any> = {};
  for (const sectionId of FORM_SECTIONS) {
    data[sectionId] = {};
    const section = NEMSIS_SECTIONS[sectionId];
    if (section) {
      for (const el of section.elements) {
        if (EXCLUDED_CODES.has(el.code)) continue;
        if (el.deprecated) continue;
        // Initialize with empty value
        const valueSet = getValueSetForElement(el);
        if (valueSet) {
          // For select/radio, empty initially
        }
      }
    }
  }
  return data;
}

/** Validate form data against element requirements */
export function validatePatientReportFormData(data: Record<string, any>): string[] {
  const errors: string[] = [];
  for (const sectionId of FORM_SECTIONS) {
    const section = NEMSIS_SECTIONS[sectionId];
    if (!section) continue;
    const sectionData = data[sectionId] || {};
    for (const el of section.elements) {
      if (EXCLUDED_CODES.has(el.code)) continue;
      if (el.deprecated) continue;
      if (REQUIRED_USAGES.has(el.usage) && (sectionData[el.code] === undefined || sectionData[el.code] === '' || sectionData[el.code] === null)) {
        errors.push(`${section.name}: ${el.name} (${el.code}) is required but missing`);
      }
    }
  }
  return errors;
}