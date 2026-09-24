/**
 * NEMSIS v3.5 Dictionary Package
 * Machine-generated from NEMSIS v3 XSD schemas (nemsis/xsd/)
 * Re-generate with: npm run generate
 */

export * from './types';
export { 
  NEMSIS_SECTIONS, 
  NEMSIS_VALUE_SETS,
  getElementByCode, 
  getValueSetById, 
  getValueSetForElement,
  getFormSections,
  getFormElements,
  validatePatientReportFormData,
  createEmptyPatientReportFormData,
  FORM_SECTIONS,
  SECTION_ORDER 
} from './form-elements';

export type { 
  GeneratedElement, 
  GeneratedSection, 
  GeneratedValueSet, 
  GeneratedValueSetValue,
  FormElementConfig, 
  FormSectionConfig 
} from './types';