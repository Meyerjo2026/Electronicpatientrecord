import {
  ageBandFor,
  getThreshold,
  classifyVitalSign,
  assessVitalSignsSet,
  worstVitalLevel,
  criticalVitals,
  calculateGcs,
  classifyGcs,
  toQuantity,
  vitalSignsSetToObservations,
  GCS_TOTAL_LOINC,
  VITAL_REFERENCES,
  type VitalSignKey,
} from '../index';

const ADULT = 30;
const CHILD = 6;
const NEONATE = 0.02;

describe('ageBandFor', () => {
  test('classifies the three age bands', () => {
    expect(ageBandFor(NEONATE)).toBe('neonate');
    expect(ageBandFor(CHILD)).toBe('paediatric');
    expect(ageBandFor(ADULT)).toBe('adult');
  });

  test('treats the twelve year boundary as adult', () => {
    expect(ageBandFor(11.9)).toBe('paediatric');
    expect(ageBandFor(12)).toBe('adult');
  });
});

describe('getThreshold', () => {
  test('uses adult ranges for adults', () => {
    expect(getThreshold('heartRate', ADULT)).toMatchObject({ low: 60, high: 100 });
  });

  test('applies the 70 + 2 x age rule to paediatric systolic pressure', () => {
    // 70 + (2 * 6) = 82
    expect(getThreshold('systolicBP', CHILD).low).toBe(82);
  });

  test('uses the neonate band rather than the paediatric age rule', () => {
    // Neonates have their own narrow band; the 70 + 2 x age rule does not apply
    expect(ageBandFor(NEONATE)).toBe('neonate');
    expect(getThreshold('systolicBP', NEONATE).low).toBe(60);
  });

  test('raises the paediatric systolic floor to 90 from eight years', () => {
    expect(getThreshold('systolicBP', 9).low).toBe(90);
  });
});

describe('classifyVitalSign', () => {
  test('marks in-range adult readings normal', () => {
    expect(classifyVitalSign('heartRate', 72, ADULT)).toBe('normal');
  });

  test('marks out-of-range adult readings abnormal', () => {
    expect(classifyVitalSign('heartRate', 130, ADULT)).toBe('abnormal');
  });

  test('marks readings at or beyond the critical bound critical', () => {
    expect(classifyVitalSign('heartRate', 150, ADULT)).toBe('critical');
  });

  test('treats the critical bound as inclusive', () => {
    expect(classifyVitalSign('spo2', 90, ADULT)).toBe('critical');
    expect(classifyVitalSign('spo2', 91, ADULT)).toBe('abnormal');
  });

  test('flags hypoglycaemia below the critical glucose bound', () => {
    expect(classifyVitalSign('bloodGlucose', 50, ADULT)).toBe('critical');
    expect(classifyVitalSign('bloodGlucose', 65, ADULT)).toBe('abnormal');
  });

  test('flags a tachycardia that is normal for an infant', () => {
    // 120 bpm is abnormal for an adult but normal for a six year old
    expect(classifyVitalSign('heartRate', 120, ADULT)).toBe('abnormal');
    expect(classifyVitalSign('heartRate', 120, CHILD)).toBe('normal');
  });

  test('covers every declared vital sign without throwing', () => {
    const keys = Object.keys(VITAL_REFERENCES) as VitalSignKey[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(classifyVitalSign(key, 100, ADULT)).toBeDefined();
    }
  });
});

describe('assessVitalSignsSet', () => {
  const base = { timestamp: '2026-01-01T10:00:00.000Z' };

  test('assesses only the vitals actually recorded', () => {
    const assessments = assessVitalSignsSet({
      ...base,
      heartRate: { value: 72 },
      spo2: { value: 98 },
    } as never);

    expect(assessments).toHaveLength(2);
    expect(assessments.map((a) => a.key).sort()).toEqual(['heartRate', 'spo2']);
  });

  test('returns an empty list for an empty set', () => {
    expect(assessVitalSignsSet(base as never)).toEqual([]);
  });

  test('falls back to the reference unit when the quantity omits one', () => {
    const [heartRate] = assessVitalSignsSet({
      ...base,
      heartRate: { value: 72 },
    } as never);

    expect(heartRate.unit).toBe('bpm');
    expect(heartRate.reference).toEqual({ low: 60, high: 100 });
  });

  test('preserves an explicit unit on the quantity', () => {
    const [spo2] = assessVitalSignsSet({
      ...base,
      spo2: { value: 98, unit: 'percent' },
    } as never);

    expect(spo2.unit).toBe('percent');
  });

  test('skips non-numeric and NaN readings', () => {
    const assessments = assessVitalSignsSet({
      ...base,
      heartRate: { value: Number.NaN },
      spo2: { value: 97 },
    } as never);

    expect(assessments).toHaveLength(1);
    expect(assessments[0].key).toBe('spo2');
  });

  test('assesses against the patient age when supplied', () => {
    // 85 mmHg systolic is below the adult range but healthy for a six year
    // old, whose lower bound is 82
    const readings = { ...base, systolicBP: { value: 85 } };
    expect(assessVitalSignsSet(readings as never, ADULT)[0].level).toBe('abnormal');
    expect(assessVitalSignsSet(readings as never, CHILD)[0].level).toBe('normal');
  });

  test('flags an adult systolic pressure below the critical bound', () => {
    const readings = { ...base, systolicBP: { value: 65 } };
    expect(assessVitalSignsSet(readings as never, ADULT)[0].level).toBe('critical');
  });
});

describe('worstVitalLevel / criticalVitals', () => {
  const mixed = {
    timestamp: '2026-01-01T10:00:00.000Z',
    heartRate: { value: 72 },
    spo2: { value: 88 },
    respiratoryRate: { value: 28 },
  } as never;

  test('reports the most severe level in the set', () => {
    expect(worstVitalLevel(assessVitalSignsSet(mixed, ADULT))).toBe('critical');
  });

  test('collects only the critical readings', () => {
    const critical = criticalVitals(assessVitalSignsSet(mixed, ADULT));
    expect(critical).toHaveLength(1);
    expect(critical[0].key).toBe('spo2');
  });

  test('defaults to normal for an empty set', () => {
    expect(worstVitalLevel([])).toBe('normal');
  });
});

describe('GCS', () => {
  test('sums the three components', () => {
    expect(calculateGcs({ eye: 4, verbal: 5, motor: 6 })).toBe(15);
    expect(calculateGcs({ eye: 1, verbal: 2, motor: 2 })).toBe(5);
  });

  test('rejects component values outside their scales', () => {
    expect(() => calculateGcs({ eye: 5, verbal: 5, motor: 6 })).toThrow();
    expect(() => calculateGcs({ eye: 4, verbal: 6, motor: 6 })).toThrow();
    expect(() => calculateGcs({ eye: 4, verbal: 5, motor: 7 })).toThrow();
  });

  test('classifies totals by severity', () => {
    expect(classifyGcs(15)).toBe('mild');
    expect(classifyGcs(13)).toBe('mild');
    expect(classifyGcs(12)).toBe('moderate');
    expect(classifyGcs(9)).toBe('moderate');
    expect(classifyGcs(8)).toBe('severe');
    expect(classifyGcs(3)).toBe('severe');
  });
});

describe('toQuantity', () => {
  test('attaches the UCUM system and code for the vital', () => {
    expect(toQuantity('spo2', 98)).toEqual({
      value: 98,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%',
    });
  });

  test('allows a unit override while keeping the UCUM code', () => {
    const quantity = toQuantity('temperature', 37.2, 'degF');
    expect(quantity.unit).toBe('degF');
    expect(quantity.code).toBe('Cel');
  });
});

describe('vitalSignsSetToObservations', () => {
  const context = {
    subject: 'Patient/01ABC',
    encounter: 'Encounter/01XYZ',
    effectiveDateTime: '2024-03-01T10:15:00.000Z',
  };

  function setWith(extra: Record<string, unknown> = {}) {
    return {
      timestamp: '2024-03-01T10:15:00.000Z',
      systolicBP: toQuantity('systolicBP', 128),
      heartRate: toQuantity('heartRate', 72),
      ...extra,
    } as never;
  }

  test('emits one Observation per recorded vital, LOINC coded', () => {
    const observations = vitalSignsSetToObservations(setWith(), context);
    expect(observations).toHaveLength(2);
    for (const observation of observations) {
      expect(observation.resourceType).toBe('Observation');
      expect(observation.status).toBe('final');
      expect(observation.subject.reference).toBe('Patient/01ABC');
      expect(observation.encounter?.reference).toBe('Encounter/01XYZ');
      expect(observation.effectiveDateTime).toBe(context.effectiveDateTime);
      expect(observation.code.coding?.[0]?.system).toBe('http://loinc.org');
    }
  });

  test('maps vitals onto their established LOINC codes', () => {
    const observations = vitalSignsSetToObservations(setWith(), context);
    const codes = observations.map(o => o.code.coding?.[0]?.code).sort();
    expect(codes).toEqual(['8480-6', '8867-4']); // systolic BP, heart rate
  });

  test('skips absent and non-numeric readings rather than emitting nulls', () => {
    const observations = vitalSignsSetToObservations(
      setWith({ spo2: { value: Number.NaN, unit: '%' }, temperature: { text: 'warm' } }),
      context
    );
    expect(observations).toHaveLength(2);
    expect(observations.every(o => typeof o.valueQuantity?.value === 'number')).toBe(true);
  });

  test('falls back to the set timestamp when no effective time is given', () => {
    const observations = vitalSignsSetToObservations(setWith(), {
      subject: 'Patient/01ABC',
    });
    expect(observations[0]?.effectiveDateTime).toBe('2024-03-01T10:15:00.000Z');
    expect(observations[0]?.encounter).toBeUndefined();
  });

  test('a GCS reading becomes its own observation with the composite code', () => {
    const observations = vitalSignsSetToObservations(
      setWith({ gcs: { value: 15, unit: 'score' } }),
      context
    );
    const gcs = observations.find(o => o.code.coding?.[0]?.code === GCS_TOTAL_LOINC);
    expect(gcs).toBeDefined();
    expect(gcs?.valueQuantity?.value).toBe(15);
  });

  test('returns an empty list for an empty capture', () => {
    expect(
      vitalSignsSetToObservations({ timestamp: '2024-03-01T10:15:00.000Z' } as never, context)
    ).toEqual([]);
  });
});
