import { z } from 'zod';
import {
  BaseResourceSchema,
  ReferenceSchema,
  CodeableConceptSchema,
  QuantitySchema,
  PeriodSchema,
  RatioSchema,
  SampledDataSchema,
  ulidSchema,
  generateId
} from './fhir-base';

export const VitalSignCategorySchema = z.enum([
  'vital-signs',
  'hemodynamic',
  'respiratory',
  'neurological',
  'temperature',
  'oxygenation',
  'laboratory',
  'device',
  'assessment',
  'pain',
  'capability'
]);

export const VitalSignMethodSchema = z.enum([
  'manual',
  'automated',
  'non-invasive',
  'invasive',
  'estimated',
  'calculated',
  'device-bl',
  'device-ble',
  'device-usb',
  'device-serial'
]);

export const VitalSignSiteSchema = z.enum([
  'radial',
  'brachial',
  'femoral',
  'carotid',
  'pedal',
  'popliteal',
  'dorsalis-pedis',
  'posterior-tibial',
  'axillary',
  'oral',
  'rectal',
  'tympanic',
  'temporal',
  'forehead',
  'esophageal',
  'bladder',
  'skin',
  'core',
  'finger',
  'toe',
  'ear',
  'nasal'
]);

export const DeviceMetadataSchema = z.object({
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  firmwareVersion: z.string().optional(),
  connectionType: z.enum(['bluetooth', 'ble', 'usb', 'serial', 'wifi', 'manual']).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  signalQuality: z.enum(['good', 'fair', 'poor', 'unknown']).optional(),
  calibrationDate: z.string().datetime().optional(),
  sensorSite: VitalSignSiteSchema.optional()
});

export const WaveformDataSchema = z.object({
  samplingRate: z.number().positive(),
  unit: CodeableConceptSchema,
  data: z.string(),
  duration: z.number().positive(),
  leads: z.array(z.string()).optional(),
  filterSettings: z.object({
    lowPass: z.number().optional(),
    highPass: z.number().optional(),
    notch: z.number().optional()
  }).optional()
});

export const ObservationComponentSchema = z.object({
  code: CodeableConceptSchema,
  valueQuantity: QuantitySchema.optional(),
  valueCodeableConcept: CodeableConceptSchema.optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueRange: z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional()
  }).optional(),
  valueRatio: RatioSchema.optional(),
  valueSampledData: SampledDataSchema.optional(),
  dataAbsentReason: CodeableConceptSchema.optional(),
  interpretation: z.array(CodeableConceptSchema).optional(),
  referenceRange: z.array(z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional(),
    type: CodeableConceptSchema.optional(),
    appliesTo: z.array(CodeableConceptSchema).optional(),
    age: z.object({
      low: QuantitySchema.optional(),
      high: QuantitySchema.optional()
    }).optional(),
    text: z.string().optional()
  })).optional()
});

export const ObservationSchema = BaseResourceSchema.extend({
  resourceType: z.literal('Observation'),
  identifier: z.array(z.object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: CodeableConceptSchema.optional(),
    system: z.string().url().optional(),
    value: z.string(),
    period: PeriodSchema.optional(),
    assigner: ReferenceSchema.optional()
  })).optional(),
  basedOn: z.array(ReferenceSchema).optional(),
  partOf: z.array(ReferenceSchema).optional(),
  status: z.enum([
    'registered',
    'preliminary',
    'final',
    'amended',
    'corrected',
    'cancelled',
    'entered-in-error',
    'unknown'
  ]),
  category: z.array(CodeableConceptSchema).optional(),
  code: CodeableConceptSchema,
  subject: ReferenceSchema,
  focus: z.array(ReferenceSchema).optional(),
  encounter: ReferenceSchema.optional(),
  effectiveDateTime: z.string().datetime().optional(),
  effectivePeriod: PeriodSchema.optional(),
  issued: z.string().datetime().optional(),
  performer: z.array(ReferenceSchema).optional(),
  valueQuantity: QuantitySchema.optional(),
  valueCodeableConcept: CodeableConceptSchema.optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueRange: z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional()
  }).optional(),
  valueRatio: RatioSchema.optional(),
  valueSampledData: SampledDataSchema.optional(),
  dataAbsentReason: CodeableConceptSchema.optional(),
  interpretation: z.array(CodeableConceptSchema).optional(),
  note: z.array(z.object({
    authorString: z.string().optional(),
    authorReference: ReferenceSchema.optional(),
    time: z.string().datetime().optional(),
    text: z.string()
  })).optional(),
  bodySite: CodeableConceptSchema.optional(),
  method: CodeableConceptSchema.optional(),
  specimen: ReferenceSchema.optional(),
  device: ReferenceSchema.optional(),
  referenceRange: z.array(z.object({
    low: QuantitySchema.optional(),
    high: QuantitySchema.optional(),
    type: CodeableConceptSchema.optional(),
    appliesTo: z.array(CodeableConceptSchema).optional(),
    age: z.object({
      low: QuantitySchema.optional(),
      high: QuantitySchema.optional()
    }).optional(),
    text: z.string().optional()
  })).optional(),
  hasMember: z.array(ReferenceSchema).optional(),
  derivedFrom: z.array(ReferenceSchema).optional(),
  component: z.array(ObservationComponentSchema).optional(),
  extension: z.array(z.object({
    url: z.string().url(),
    valueString: z.string().optional(),
    valueCodeableConcept: CodeableConceptSchema.optional(),
    valueQuantity: QuantitySchema.optional(),
    valueBoolean: z.boolean().optional(),
    valueAttachment: z.object({
      contentType: z.string(),
      language: z.string().optional(),
      data: z.string().optional(),
      url: z.string().url().optional(),
      title: z.string().optional(),
      creation: z.string().datetime().optional()
    }).optional(),
    extension: z.array(z.any()).optional()
  })).optional()
});

export type Observation = z.infer<typeof ObservationSchema>;

export const VitalSignsSetSchema = z.object({
  timestamp: z.string().datetime(),
  systolicBP: QuantitySchema.optional(),
  diastolicBP: QuantitySchema.optional(),
  meanArterialPressure: QuantitySchema.optional(),
  heartRate: QuantitySchema.optional(),
  respiratoryRate: QuantitySchema.optional(),
  spo2: QuantitySchema.optional(),
  etco2: QuantitySchema.optional(),
  temperature: QuantitySchema.optional(),
  gcs: z.object({
    eye: z.number().int().min(1).max(4),
    verbal: z.number().int().min(1).max(5),
    motor: z.number().int().min(1).max(6),
    total: z.number().int().min(3).max(15)
  }).optional(),
  painScore: QuantitySchema.optional(),
  bloodGlucose: QuantitySchema.optional(),
  pupilResponse: z.object({
    left: z.enum(['brisk', 'sluggish', 'fixed', 'unable-to-assess']),
    right: z.enum(['brisk', 'sluggish', 'fixed', 'unable-to-assess']),
    sizeLeft: z.number().optional(),
    sizeRight: z.number().optional()
  }).optional(),
  skinCondition: CodeableConceptSchema.optional(),
  levelOfConsciousness: CodeableConceptSchema.optional(),
  device: DeviceMetadataSchema.optional(),
  waveform: WaveformDataSchema.optional()
});

export type VitalSignsSet = z.infer<typeof VitalSignsSetSchema>;

export const VitalSignsSetCreateSchema = VitalSignsSetSchema.extend({
  id: ulidSchema.default(generateId())
});

export function createVitalSignsSet(data: z.infer<typeof VitalSignsSetCreateSchema>): VitalSignsSet {
  return VitalSignsSetSchema.parse({
    ...data,
    id: data.id || generateId()
  });
}

export const ObservationCreateSchema = ObservationSchema.omit({
  id: true,
  meta: true,
  resourceType: true
}).extend({
  id: ulidSchema.default(generateId()),
  resourceType: z.literal('Observation').default('Observation'),
  status: z.enum(['registered', 'preliminary', 'final']).default('final')
});

export type ObservationCreate = z.infer<typeof ObservationCreateSchema>;

export function createObservation(data: z.infer<typeof ObservationCreateSchema>): Observation {
  return ObservationSchema.parse({
    ...data,
    id: data.id || generateId(),
    resourceType: 'Observation',
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: 'prehospital-epr'
    }
  });
}

export const ObservationSearchParamsSchema = z.object({
  _id: z.array(ulidSchema).optional(),
  patient: z.string().optional(),
  encounter: z.string().optional(),
  category: z.string().optional(),
  code: z.string().optional(),
  date: z.string().optional(),
  performer: z.string().optional(),
  _count: z.number().int().positive().max(1000).optional(),
  _offset: z.number().int().nonnegative().optional(),
  _sort: z.string().optional()
});

export type ObservationSearchParams = z.infer<typeof ObservationSearchParamsSchema>;