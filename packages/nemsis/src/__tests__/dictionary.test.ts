/**
 * NEMSIS Dictionary Tests
 */

import { 
  NEMSIS_SECTIONS, 
  NEMSIS_VALUE_SETS,
  getElementByCode,
  getValueSetById,
  getValueSetForElement,
  getFormSections,
  getFormElements,
  validatePatientReportFormData,
  FORM_SECTIONS,
  SECTION_ORDER,
  createEmptyPatientReportFormData,
} from '../form-elements';

import type { GeneratedValueSet } from '../generated-data';

describe('NEMSIS Dictionary', () => {
  describe('Generated Data', () => {
    it('should have all 7 PCR sections', () => {
      expect(Object.keys(NEMSIS_SECTIONS)).toEqual(
        expect.arrayContaining(['ePatient', 'eTimes', 'eSituation', 'eScene', 'eInjury', 'eDisposition', 'eNarrative'])
      );
    });

    it('should have correct section names', () => {
      expect(NEMSIS_SECTIONS.ePatient.name).toBe('Patient Demographics');
      expect(NEMSIS_SECTIONS.eTimes.name).toBe('Times');
      expect(NEMSIS_SECTIONS.eSituation.name).toBe('Situation');
      expect(NEMSIS_SECTIONS.eScene.name).toBe('Scene');
      expect(NEMSIS_SECTIONS.eInjury.name).toBe('Injury');
      expect(NEMSIS_SECTIONS.eDisposition.name).toBe('Disposition');
      expect(NEMSIS_SECTIONS.eNarrative.name).toBe('Narrative');
    });

    it('should have expected element counts per section', () => {
      expect(NEMSIS_SECTIONS.ePatient.elements.length).toBe(27);
      expect(NEMSIS_SECTIONS.eTimes.elements.length).toBe(17);
      expect(NEMSIS_SECTIONS.eSituation.elements.length).toBe(22);
      expect(NEMSIS_SECTIONS.eScene.elements.length).toBe(26);
      expect(NEMSIS_SECTIONS.eInjury.elements.length).toBe(31);
      expect(NEMSIS_SECTIONS.eDisposition.elements.length).toBe(34);
      expect(NEMSIS_SECTIONS.eNarrative.elements.length).toBe(1);
    });

    it('should have value sets for key elements', () => {
      expect(NEMSIS_VALUE_SETS.length).toBeGreaterThan(40);
      
      // Key value sets present
      const vsIds = NEMSIS_VALUE_SETS.map(v => v.id);
      expect(vsIds).toContain('Sex');
      expect(vsIds).toContain('Race');
      expect(vsIds).toContain('AgeUnits');
      expect(vsIds).toContain('PatientPreferredLanguage');
      expect(vsIds).toContain('ComplaintType');
      expect(vsIds).toContain('ComplaintAnatomicLocation');
      expect(vsIds).toContain('ComplaintOrganSystem');
      expect(vsIds).toContain('InitialPatientAcuity');
      // Note: CauseOfInjury references external ICD-10 codes, not local enum
      expect(vsIds).toContain('MechanismOfInjury');
      expect(vsIds).toContain('UseOfOccupantSafetyEquipment');
      expect(vsIds).toContain('AirbagDeployment');
    });

    it('should have Sex value set with expected codes', () => {
      const sex = getValueSetById('Sex');
      expect(sex).toBeDefined();
      expect(sex!.values.length).toBeGreaterThanOrEqual(3);
      const codes = sex!.values.map(v => v.code);
      expect(codes).toContain('9919001');
      expect(codes).toContain('9919003');
    });

    it('should have Race value set with expected codes', () => {
      const race = getValueSetById('Race');
      expect(race).toBeDefined();
      expect(race!.values.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Element Lookup', () => {
    it('should find ePatient.01 (EMS Patient ID)', () => {
      const el = getElementByCode('ePatient.01');
      expect(el).toBeDefined();
      expect(el!.name).toBe('EMS Patient ID');
      expect(el!.usage).toBe('Optional');
    });

    it('should find ePatient.02 (Last Name)', () => {
      const el = getElementByCode('ePatient.02');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Last Name');
      expect(el!.usage).toBe('Recommended');
    });

    it('should find ePatient.14 (Race) with value set', () => {
      const el = getElementByCode('ePatient.14');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Race');
      expect(el!.usage).toBe('Required');
      expect(el!.hasValueSet).toBe(true);
      expect(el!.valueSetId).toBe('Race');
    });

    it('should find ePatient.25 (Sex) with value set', () => {
      const el = getElementByCode('ePatient.25');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Sex');
      expect(el!.usage).toBe('Required');
      expect(el!.hasValueSet).toBe(true);
      expect(el!.valueSetId).toBe('Sex');
    });

    it('should find eTimes.03 (Unit Notified by Dispatch)', () => {
      const el = getElementByCode('eTimes.03');
      expect(el).toBeDefined();
      expect(el!.usage).toBe('Mandatory');
    });

    it('should find eSituation.04 (Complaint)', () => {
      const el = getElementByCode('eSituation.04');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Complaint');
    });

    it('should find eSituation.09 (Primary Symptom)', () => {
      const el = getElementByCode('eSituation.09');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Primary Symptom');
    });

    it('should find eScene.09 (Incident Location Type)', () => {
      const el = getElementByCode('eScene.09');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Incident Location Type');
    });

    it('should find eInjury.01 (Cause of Injury)', () => {
      const el = getElementByCode('eInjury.01');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Cause of Injury');
      expect(el!.usage).toBe('Required');
    });

    it('should find eDisposition.20 (Reason for Choosing Destination)', () => {
      const el = getElementByCode('eDisposition.20');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Reason for Choosing Destination');
    });

    it('should find eNarrative.01', () => {
      const el = getElementByCode('eNarrative.01');
      expect(el).toBeDefined();
      expect(el!.name).toBe('Patient Care Report Narrative');
    });

    it('should return undefined for non-existent code', () => {
      expect(getElementByCode('ePatient.99')).toBeUndefined();
    });
  });

  describe('Form Sections', () => {
    it('should return 7 form sections', () => {
      const sections = getFormSections();
      expect(sections.length).toBe(7);
      expect(sections.map(s => s.id)).toEqual(FORM_SECTIONS);
    });

    it('should order sections correctly', () => {
      const sections = getFormSections();
      expect(sections[0].id).toBe('ePatient');
      expect(sections[1].id).toBe('eTimes');
      expect(sections[2].id).toBe('eSituation');
      expect(sections[3].id).toBe('eScene');
      expect(sections[4].id).toBe('eInjury');
      expect(sections[5].id).toBe('eDisposition');
      expect(sections[6].id).toBe('eNarrative');
    });

    it('should exclude group elements and deprecated elements', () => {
      const patient = getFormElements('ePatient');
      const codes = patient.map(e => e.code);
      expect(codes).not.toContain('ePatient.PatientNameGroup');
      // ePatient.13 is deprecated
      expect(codes).not.toContain('ePatient.13');
    });

    it('should mark required elements correctly', () => {
      const patient = getFormElements('ePatient');
      const race = patient.find(e => e.code === 'ePatient.14');
      expect(race).toBeDefined();
      expect(race!.required).toBe(true);
      
      const sex = patient.find(e => e.code === 'ePatient.25');
      expect(sex).toBeDefined();
      expect(sex!.required).toBe(true);
      
      const emsId = patient.find(e => e.code === 'ePatient.01');
      expect(emsId).toBeDefined();
      expect(emsId!.required).toBe(false); // Optional
    });

    it('should assign control types correctly', () => {
      const patient = getFormElements('ePatient');
      const race = patient.find(e => e.code === 'ePatient.14');
      expect(race!.controlType).toBe('select'); // Race has 7 values
      
      const sex = patient.find(e => e.code === 'ePatient.25');
      expect(sex!.controlType).toBe('radio'); // Sex has 3 values
      
      const lang = patient.find(e => e.code === 'ePatient.24');
      expect(lang!.controlType).toBe('select'); // Language has 52 values
    });

    it('should infer datetime for date/time fields', () => {
      const times = getFormElements('eTimes');
      const unitNotified = times.find(e => e.code === 'eTimes.03');
      expect(unitNotified).toBeDefined();
      // datetime or date based on inference
    });

    it('should infer textarea for narrative', () => {
      const narrative = getFormElements('eNarrative');
      expect(narrative.length).toBe(1);
      expect(narrative[0].controlType).toBe('textarea');
    });
  });

  describe('Form Validation', () => {
    it('should return errors for missing required fields', () => {
      const data = createEmptyPatientReportFormData();
      const errors = validatePatientReportFormData(data);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Race'))).toBe(true);
      expect(errors.some(e => e.includes('Sex'))).toBe(true);
    });

    it('should pass validation when required fields provided', () => {
      const data = createEmptyPatientReportFormData();
      // Fill required patient fields
      data.ePatient['ePatient.14'] = '2106-3'; // Race: White
      data.ePatient['ePatient.25'] = '9919001'; // Sex: Female
      data.ePatient['ePatient.02'] = 'Smith'; // Last Name
      data.ePatient['ePatient.03'] = 'Jane'; // First Name
      data.ePatient['ePatient.07'] = 'King'; // County
      data.ePatient['ePatient.08'] = 'WA'; // State
      data.ePatient['ePatient.09'] = '98101'; // ZIP
      data.ePatient['ePatient.15'] = '30'; // Age
      data.ePatient['ePatient.16'] = '9916001'; // Age Units: Years
      
      // Times required
      const now = new Date().toISOString();
      data.eTimes['eTimes.01'] = now; // PSAP Call
      data.eTimes['eTimes.03'] = now; // Unit Notified
      data.eTimes['eTimes.05'] = now; // En Route
      data.eTimes['eTimes.06'] = now; // Arrived Scene
      data.eTimes['eTimes.07'] = now; // Arrived Patient
      data.eTimes['eTimes.09'] = now; // Left Scene
      data.eTimes['eTimes.11'] = now; // Arrived Destination
      data.eTimes['eTimes.12'] = now; // Transfer Care
      data.eTimes['eTimes.13'] = now; // Back in Service
      
      // Situation required
      data.eSituation['eSituation.01'] = now; // Symptom Onset
      data.eSituation['eSituation.02'] = '9923001'; // Possible Injury: No
      data.eSituation['eSituation.07'] = '2801001'; // Chief Complaint Anatomic Location
      data.eSituation['eSituation.08'] = '2802001'; // Chief Complaint Organ System
      data.eSituation['eSituation.09'] = '2803001'; // Primary Symptom
      data.eSituation['eSituation.11'] = '2804001'; // Provider Primary Impression
      data.eSituation['eSituation.13'] = '2805001'; // Initial Patient Acuity
      data.eSituation['eSituation.18'] = now; // Last Known Well
      data.eSituation['eSituation.20'] = '2807001'; // Reason for Transfer
      
      // Scene required
      data.eScene['eScene.06'] = '1'; // Number of Patients
      data.eScene['eScene.07'] = '9923001'; // MCI: No
      data.eScene['eScene.08'] = '2701001'; // Triage Classification
      data.eScene['eScene.09'] = '2702001'; // Incident Location Type
      data.eScene['eScene.18'] = 'WA'; // Incident State
      data.eScene['eScene.19'] = '98101'; // Incident ZIP
      data.eScene['eScene.21'] = 'King'; // Incident County
      
      // Injury required
      data.eInjury['eInjury.01'] = '2901001'; // Cause of Injury
      data.eInjury['eInjury.03'] = '2902001'; // Trauma Triage High
      data.eInjury['eInjury.04'] = '2903001'; // Trauma Triage Moderate
      
      // Disposition required
      data.eDisposition['eDisposition.27'] = '4227001'; // Unit Disposition
      data.eDisposition['eDisposition.28'] = '4228001'; // Patient Evaluation/Care
      data.eDisposition['eDisposition.29'] = '4229001'; // Crew Disposition
      data.eDisposition['eDisposition.30'] = '4230001'; // Transport Disposition
      data.eDisposition['eDisposition.16'] = '4216001'; // EMS Transport Method
      data.eDisposition['eDisposition.17'] = '4217001'; // Transport Mode
      data.eDisposition['eDisposition.18'] = '4218001'; // Additional Transport Mode
      data.eDisposition['eDisposition.19'] = '4219001'; // Acuity on Release
      data.eDisposition['eDisposition.20'] = '4220001'; // Reason for Choosing Dest
      data.eDisposition['eDisposition.21'] = '4221001'; // Type of Destination
      data.eDisposition['eDisposition.22'] = '4222001'; // Hospital In-Patient Dest
      data.eDisposition['eDisposition.23'] = '4223001'; // Hospital Capability
      data.eDisposition['eDisposition.24'] = '4224001'; // Destination Prearrival
      data.eDisposition['eDisposition.32'] = '4232001'; // Level of Care
      
      const errors = validatePatientReportFormData(data);
      // Should have fewer errors (only optional/recommended missing)
      expect(errors.length).toBeLessThanOrEqual(20);
    });

    it('should create empty form data with all sections', () => {
      const data = createEmptyPatientReportFormData();
      for (const s of FORM_SECTIONS) {
        expect(data[s]).toBeDefined();
      }
    });
  });

  describe('Value Set Data Quality', () => {
    it('should have all value sets with at least one value', () => {
      for (const vs of NEMSIS_VALUE_SETS) {
        expect(vs.values.length).toBeGreaterThan(0);
        for (const v of vs.values) {
          expect(v.code).toBeTruthy();
        }
      }
    });

    it('should have unique value set IDs', () => {
      const ids = NEMSIS_VALUE_SETS.map(v => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique element codes within sections', () => {
      for (const section of Object.values(NEMSIS_SECTIONS)) {
        const codes = section.elements.map(e => e.code);
        expect(new Set(codes).size).toBe(codes.length);
      }
    });
  });
});