import {
  generateId,
  isValidULID,
  ulidSchema,
  BaseResourceSchema,
  HumanNameSchema,
} from '../types/fhir-base';
import { createPatient, PatientSchema, PatientSearchParamsSchema } from '../types/patient';
import { createEncounter } from '../types/encounter';
import { createVitalSignsSet, createObservation } from '../types/observation';
import { createMedicationAdministration, createProcedure, createCondition } from '../types/interventions';
import { createAuditEvent } from '../types/security';

describe('fhir-base primitives', () => {
  test('generateId returns a valid ULID', () => {
    expect(isValidULID(generateId())).toBe(true);
  });

  test('isValidULID rejects malformed ids', () => {
    expect(isValidULID('not-a-ulid')).toBe(false);
    expect(isValidULID('')).toBe(false);
  });

  test('ulidSchema validates a 26-char Crockford base32 id', () => {
    expect(ulidSchema.safeParse(generateId()).success).toBe(true);
  });

  test('BaseResourceSchema requires resourceType and id', () => {
    const result = BaseResourceSchema.safeParse({ resourceType: 'Patient', id: generateId() });
    expect(result.success).toBe(true);
    expect(BaseResourceSchema.safeParse({ resourceType: 'Patient' }).success).toBe(false);
  });

  test('HumanNameSchema accepts a valid FHIR name', () => {
    expect(HumanNameSchema.safeParse({ use: 'official', family: 'Smith', given: ['John'] }).success).toBe(true);
  });
});

describe('createPatient', () => {
  test('creates a valid Patient with defaults', () => {
    const patient = createPatient({
      name: [{ use: 'official', family: 'Smith', given: ['John'] }],
      gender: 'male',
      birthDate: '1980-05-15',
    });

    expect(patient.resourceType).toBe('Patient');
    expect(isValidULID(patient.id)).toBe(true);
    expect(patient.meta?.versionId).toBe('1');
    expect(patient.name?.[0]?.family).toBe('Smith');
  });

  test('accepts a pre-created id', () => {
    const id = generateId();
    const patient = createPatient({ id });
    expect(patient.id).toBe(id);
  });

  test('rejects invalid gender', () => {
    expect(PatientSchema.safeParse({ resourceType: 'Patient', id: generateId(), gender: 'mascot' }).success).toBe(false);
  });

  test('validates search params', () => {
    const result = PatientSearchParamsSchema.safeParse({ name: 'Snow', _count: 50 });
    expect(result.success).toBe(true);
    expect(PatientSearchParamsSchema.safeParse({ gender: 'banana' }).success).toBe(false);
  });
});

describe('createEncounter', () => {
  test('defaults an encounter to planned status', () => {
    const encounter = createEncounter({
      subject: { reference: `Patient/${generateId()}` },
      status: 'planned',
      class: 'emergency',
      period: { start: new Date().toISOString() },
    });

    expect(encounter.resourceType).toBe('Encounter');
    expect(encounter.status).toBe('planned');
  });
});

describe('createVitalSignsSet / createObservation', () => {
  test('creates a vital signs set', () => {
    const ts = new Date().toISOString();
    const set = createVitalSignsSet({ timestamp: ts });
    expect(set.timestamp).toBe(ts);
  });

  test('creates an observation with a final status', () => {
    const obs = createObservation({
      subject: { reference: `Patient/${generateId()}` },
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      status: 'final',
    });
    expect(obs.status).toBe('final');
    expect(obs.resourceType).toBe('Observation');
  });
});

describe('createMedicationAdministration / createProcedure / createCondition', () => {
  const patientRef = { reference: `Patient/${generateId()}` };

  test('creates a medication administration', () => {
    const med = createMedicationAdministration({
      status: 'completed',
      medicationCodeableConcept: {
        coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860789', display: 'Epinephrine 0.3mg auto-injector' }],
      },
      subject: patientRef,
    });
    expect(med.resourceType).toBe('MedicationAdministration');
    expect(med.status).toBe('completed');
  });

  test('creates a procedure', () => {
    const proc = createProcedure({
      status: 'completed',
      code: { coding: [{ system: 'http://snomed.info/sct', code: '112799007', display: 'Defibrillation' }] },
      subject: patientRef,
    });
    expect(proc.resourceType).toBe('Procedure');
  });

  test('creates a condition', () => {
    const cond = createCondition({
      code: { coding: [{ system: 'http://snomed.info/sct', code: '194828000', display: 'Elevated blood pressure reading' }] },
      subject: patientRef,
    });
    expect(cond.resourceType).toBe('Condition');
  });
});

describe('createAuditEvent', () => {
  test('creates a full audit event and enriches metadata', () => {
    const event = createAuditEvent({
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/audit-event-type', code: '110100' }] },
      action: 'R',
      recorded: new Date().toISOString(),
      outcome: '0',
      source: {
        identifier: 'https://prehospital-epr.org',
        type: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/security-source-type', code: '4' }] }],
      },
      agent: [{ who: { reference: 'Practitioner/123' }, requestor: true }],
    });
    expect(event.resourceType).toBe('AuditEvent');
    expect(event.meta?.source).toBe('prehospital-epr-audit');
  });
});