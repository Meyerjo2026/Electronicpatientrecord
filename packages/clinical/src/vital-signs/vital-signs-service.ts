import { z } from 'zod';
import { Observation, VitalSignsSet, Quantity } from '@prehospital-epr/core';

/**
 * Age bands used to select paediatric vs adult reference ranges.
 * Neonates (<28 days) share the infant band but are flagged separately
 * because their physiology and normal ranges differ more widely.
 */
export const AgeBandSchema = z.enum(['neonate', 'paediatric', 'adult']);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export function ageBandFor(ageYears: number): AgeBand {
  if (ageYears < 0.08) return 'neonate';
  if (ageYears < 12) return 'paediatric';
  return 'adult';
}

/**
 * Ordered from most to least urgent so that callers can sort or filter a
 * vitals set by severity without re-deriving the ordering.
 */
export const AbnormalityLevelSchema = z.enum([
  'critical',
  'abnormal',
  'normal',
  'unknown',
]);
export type AbnormalityLevel = z.infer<typeof AbnormalityLevelSchema>;

const LEVEL_SEVERITY: Record<AbnormalityLevel, number> = {
  critical: 3,
  abnormal: 2,
  normal: 1,
  unknown: 0,
};

export const VitalSignKeySchema = z.enum([
  'systolicBP',
  'diastolicBP',
  'heartRate',
  'respiratoryRate',
  'spo2',
  'etco2',
  'temperature',
  'bloodGlucose',
]);
export type VitalSignKey = z.infer<typeof VitalSignKeySchema>;

export interface VitalThreshold {
  /** Lowest value that is still considered normal. */
  low: number;
  /** Highest value that is still considered normal. */
  high: number;
  /** At or below this value the reading is immediately life-threatening. */
  criticalLow?: number;
  /** At or above this value the reading is immediately life-threatening. */
  criticalHigh?: number;
}

export interface VitalReference {
  key: VitalSignKey;
  label: string;
  unit: string;
  /** LOINC code, required for FHIR `Observation.code` interoperability. */
  loincCode: string;
  /** UCUM code, required for FHIR Quantity.system/code interoperability. */
  ucumCode: string;
  ucumSystem: string;
  thresholds: Record<AgeBand, VitalThreshold>;
}

/**
 * Reference ranges for prehospital observations.
 *
 * Adult bands follow routine EMS practice. Paediatric systolic pressure uses
 * the standard "70 + (2 x age in years)" lower limit, floored at 70 mmHg for
 * infants and 90 mmHg from eight years. Heart and respiratory rates use the
 * conventional paediatric bands.
 */
export const VITAL_REFERENCES: Record<VitalSignKey, VitalReference> = {
  systolicBP: {
    key: 'systolicBP',
    label: 'Systolic BP',
    loincCode: '8480-6',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 90, high: 120, criticalLow: 70, criticalHigh: 200 },
      paediatric: { low: 70, high: 110, criticalLow: 60, criticalHigh: 140 },
      neonate: { low: 60, high: 100, criticalLow: 50, criticalHigh: 130 },
    },
  },
  diastolicBP: {
    key: 'diastolicBP',
    label: 'Diastolic BP',
    loincCode: '8462-4',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 60, high: 80, criticalLow: 40, criticalHigh: 120 },
      paediatric: { low: 50, high: 80, criticalLow: 40, criticalHigh: 100 },
      neonate: { low: 40, high: 70, criticalLow: 30, criticalHigh: 90 },
    },
  },
  heartRate: {
    key: 'heartRate',
    label: 'Heart Rate',
    loincCode: '8867-4',
    unit: 'bpm',
    ucumCode: '/min',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 60, high: 100, criticalLow: 40, criticalHigh: 140 },
      paediatric: { low: 70, high: 130, criticalLow: 50, criticalHigh: 170 },
      neonate: { low: 100, high: 160, criticalLow: 80, criticalHigh: 200 },
    },
  },
  respiratoryRate: {
    key: 'respiratoryRate',
    label: 'Respiratory Rate',
    loincCode: '9279-1',
    unit: '/min',
    ucumCode: '/min',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 12, high: 20, criticalLow: 8, criticalHigh: 30 },
      paediatric: { low: 18, high: 30, criticalLow: 10, criticalHigh: 45 },
      neonate: { low: 30, high: 60, criticalLow: 20, criticalHigh: 70 },
    },
  },
  spo2: {
    key: 'spo2',
    label: 'SpO₂',
    loincCode: '2708-6',
    unit: '%',
    ucumCode: '%',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 94, high: 100, criticalLow: 90 },
      paediatric: { low: 94, high: 100, criticalLow: 90 },
      neonate: { low: 92, high: 100, criticalLow: 85 },
    },
  },
  etco2: {
    key: 'etco2',
    label: 'EtCO₂',
    loincCode: '20509-6',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 35, high: 45, criticalLow: 25, criticalHigh: 60 },
      paediatric: { low: 35, high: 45, criticalLow: 25, criticalHigh: 55 },
      neonate: { low: 35, high: 45, criticalLow: 25, criticalHigh: 55 },
    },
  },
  temperature: {
    key: 'temperature',
    label: 'Temperature',
    loincCode: '8310-5',
    unit: '°C',
    ucumCode: 'Cel',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 36, high: 37.5, criticalLow: 35, criticalHigh: 40 },
      paediatric: { low: 36, high: 37.5, criticalLow: 35, criticalHigh: 40 },
      neonate: { low: 36.5, high: 37.5, criticalLow: 36, criticalHigh: 38.5 },
    },
  },
  bloodGlucose: {
    key: 'bloodGlucose',
    label: 'Blood Glucose',
    loincCode: '2339-0',
    unit: 'mg/dL',
    ucumCode: 'mg/dL',
    ucumSystem: 'http://unitsofmeasure.org',
    thresholds: {
      adult: { low: 70, high: 140, criticalLow: 54, criticalHigh: 300 },
      paediatric: { low: 70, high: 140, criticalLow: 54, criticalHigh: 300 },
      neonate: { low: 45, high: 150, criticalLow: 36, criticalHigh: 250 },
    },
  },
};

const PEDIATRIC_SYSTOLIC_MIN = (ageYears: number): number =>
  ageYears >= 8 ? 90 : Math.max(70, 70 + 2 * ageYears);

/**
 * Resolve the effective threshold for a vital sign, taking the patient's age
 * into account. Paediatric systolic pressure is age-adjusted; neonates use
 * their own narrower band instead.
 */
export function getThreshold(
  key: VitalSignKey,
  ageYears: number = 30
): VitalThreshold {
  const reference = VITAL_REFERENCES[key];
  const band = ageBandFor(ageYears);
  const thresholds = reference.thresholds[band];

  if (key === 'systolicBP' && band === 'paediatric') {
    return { ...thresholds, low: PEDIATRIC_SYSTOLIC_MIN(ageYears) };
  }
  return thresholds;
}

export function classifyVitalSign(
  key: VitalSignKey,
  value: number,
  ageYears: number = 30
): AbnormalityLevel {
  const { low, high, criticalLow, criticalHigh } = getThreshold(key, ageYears);

  if (criticalLow !== undefined && value <= criticalLow) return 'critical';
  if (criticalHigh !== undefined && value >= criticalHigh) return 'critical';
  if (value < low || value > high) return 'abnormal';
  return 'normal';
}

export const VitalAssessmentSchema = z.object({
  key: VitalSignKeySchema,
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  level: AbnormalityLevelSchema,
  reference: z.object({
    low: z.number(),
    high: z.number(),
  }),
});
export type VitalAssessment = z.infer<typeof VitalAssessmentSchema>;

const QUANTITY_KEYS: VitalSignKey[] = [
  'systolicBP',
  'diastolicBP',
  'heartRate',
  'respiratoryRate',
  'spo2',
  'etco2',
  'temperature',
  'bloodGlucose',
];

/**
 * Reads a FHIR Quantity off a captured set. `key` is a plain string so callers
 * can also read non-vital members such as the GCS composite.
 */
function readQuantity(
  set: VitalSignsSet,
  key: string
): Quantity | undefined {
  const value = (set as Record<string, unknown>)[key];
  if (value && typeof value === 'object' && 'value' in value) {
    return value as Quantity;
  }
  return undefined;
}

/**
 * Assess every recorded vital in a set. Readings that are absent are skipped
 * rather than reported as unknown, so callers can treat a non-empty result as
 * the set of values actually captured.
 */
export function assessVitalSignsSet(
  set: VitalSignsSet,
  ageYears: number = 30
): VitalAssessment[] {
  const assessments: VitalAssessment[] = [];

  for (const key of QUANTITY_KEYS) {
    const quantity = readQuantity(set, key);
    if (!quantity || typeof quantity.value !== 'number') continue;
    if (Number.isNaN(quantity.value)) continue;

    const reference = VITAL_REFERENCES[key];
    const threshold = getThreshold(key, ageYears);
    assessments.push({
      key,
      label: reference.label,
      value: quantity.value,
      unit: quantity.unit ?? reference.unit,
      level: classifyVitalSign(key, quantity.value, ageYears),
      reference: { low: threshold.low, high: threshold.high },
    });
  }

  return assessments;
}

/** The most severe level present in a set of assessments. */
export function worstVitalLevel(
  assessments: VitalAssessment[]
): AbnormalityLevel {
  return assessments.reduce<AbnormalityLevel>(
    (worst, current) =>
      LEVEL_SEVERITY[current.level] > LEVEL_SEVERITY[worst]
        ? current.level
        : worst,
    'normal'
  );
}

export function criticalVitals(assessments: VitalAssessment[]): VitalAssessment[] {
  return assessments.filter((a) => a.level === 'critical');
}

export const GcsComponentsSchema = z.object({
  eye: z.number().int().min(1).max(4),
  verbal: z.number().int().min(1).max(5),
  motor: z.number().int().min(1).max(6),
});
export type GcsComponents = z.infer<typeof GcsComponentsSchema>;

export function calculateGcs(components: GcsComponents): number {
  const parsed = GcsComponentsSchema.parse(components);
  return parsed.eye + parsed.verbal + parsed.motor;
}

export type GcsSeverity = 'severe' | 'moderate' | 'mild';

/** GCS 3-8 severe (intubate), 9-12 moderate, 13-14 mild, 15 alert. */
export function classifyGcs(total: number): GcsSeverity {
  if (total <= 8) return 'severe';
  if (total <= 12) return 'moderate';
  return 'mild';
}

/**
 * Build a FHIR-compliant Quantity for a vital sign, carrying the UCUM system
 * and code so downstream consumers can interpret the value without guessing.
 */
export function toQuantity(
  key: VitalSignKey,
  value: number,
  overrideUnit?: string
): Quantity {
  const reference = VITAL_REFERENCES[key];
  return {
    value,
    unit: overrideUnit ?? reference.unit,
    system: reference.ucumSystem,
    code: reference.ucumCode,
  };
}

/** LOINC code for the composite Glasgow Coma Scale score. */
export const GCS_TOTAL_LOINC = '9269-1';

export interface VitalSignsSetContext {
  /** FHIR reference to the patient, e.g. `Patient/01H…`. */
  subject: string;
  /** FHIR reference to the encounter the readings belong to. */
  encounter?: string;
  /** ISO timestamp of the reading set. Defaults to the set's own timestamp. */
  effectiveDateTime?: string;
}

/**
 * Convert a captured vital signs set into LOINC-coded FHIR Observations.
 *
 * The mobile app captures vitals as a flat `VitalSignsSet` (key -> Quantity) so
 * the crew can type fast and everything survives offline. Downstream consumers
 * (handoff narrative, CDA export, the server) need real `Observation`
 * resources, so this is the single place the flat capture shape is translated.
 * Each vital becomes its own Observation sharing the same timestamp, which is
 * how prehospital systems conventionally model a vitals panel.
 */
export function vitalSignsSetToObservations(
  set: VitalSignsSet,
  context: VitalSignsSetContext
): Observation[] {
  const effective = context.effectiveDateTime ?? (set.timestamp as string | undefined);
  const observations: Observation[] = [];

  for (const key of QUANTITY_KEYS) {
    const quantity = readQuantity(set, key);
    if (!quantity || typeof quantity.value !== 'number' || Number.isNaN(quantity.value)) {
      continue;
    }
    const reference = VITAL_REFERENCES[key];
    observations.push({
      resourceType: 'Observation',
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'vital-signs',
              display: 'Vital Signs',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: reference.loincCode,
            display: reference.label,
          },
        ],
        text: reference.label,
      },
      subject: { reference: context.subject },
      ...(context.encounter ? { encounter: { reference: context.encounter } } : {}),
      ...(effective ? { effectiveDateTime: effective } : {}),
      valueQuantity: quantity,
    } as Observation);
  }

  const gcs = readQuantity(set as VitalSignsSet, 'gcs');
  if (gcs && typeof gcs.value === 'number' && !Number.isNaN(gcs.value)) {
    observations.push({
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: GCS_TOTAL_LOINC,
            display: 'Glasgow Coma Scale (GCS) total',
          },
        ],
        text: 'GCS total',
      },
      subject: { reference: context.subject },
      ...(context.encounter ? { encounter: { reference: context.encounter } } : {}),
      ...(effective ? { effectiveDateTime: effective } : {}),
      valueQuantity: { ...gcs, unit: 'score', code: '{score}', system: 'http://unitsofmeasure.org' },
    } as Observation);
  }

  return observations;
}
