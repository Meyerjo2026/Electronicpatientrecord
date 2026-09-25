import type { Patient } from '@prehospital-epr/core';
import type { PatientDraft } from '../store/patientSlice';

/** Captured NEMSIS form values, keyed by section then element code. */
export type FormData = Record<string, Record<string, string>>;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** NEMSIS `ePatient.25` sex values -> the core `Patient.gender` codes. */
const GENDER_BY_NEMSIS: Record<string, Patient['gender']> = {
  m: 'male',
  male: 'male',
  f: 'female',
  female: 'female',
};

/** `ePatient.16` age units -> the multiplier that converts to years. */
const AGE_UNIT_YEARS: Record<string, number> = {
  Y: 1,
  M: 1 / 12,
  D: 1 / 365.25,
  H: 1 / 8766,
  MIN: 1 / 525600,
};

const read = (section: Record<string, string>, code: string): string =>
  (section[code] ?? '').trim();

/**
 * Turn the captured `ePatient` section into a patient record so the
 * demographics the crew typed are the demographics the rest of the app reads.
 *
 * NEMSIS element codes are zero padded (`ePatient.02`) to match the published
 * data dictionary, so they are not interchangeable with the unpadded form.
 */
export function demographicsFrom(formData: FormData): PatientDraft {
  const section = formData.ePatient ?? {};

  const family = read(section, 'ePatient.02');
  const first = read(section, 'ePatient.03');
  const middle = read(section, 'ePatient.04');
  const given = [first, middle].filter(Boolean);

  const rawSex = read(section, 'ePatient.25');
  const gender = GENDER_BY_NEMSIS[rawSex.toLowerCase()] ?? 'unknown';

  const name =
    family || given.length
      ? [
          {
            family,
            given,
            text: [first, middle, family].filter(Boolean).join(' '),
          },
        ]
      : undefined;

  // A recorded date of birth is authoritative.
  const recordedDob = read(section, 'ePatient.17');
  if (recordedDob) {
    return { gender, ...(name ? { name } : {}), birthDate: recordedDob };
  }

  // Otherwise derive one from the age/unit pair, which is all that can often be
  // established for an unresponsive patient. The derived date is a floor: a
  // crew stating "about 70" is recorded as 70, never rounded up.
  const age = Number(read(section, 'ePatient.15'));
  const unit = AGE_UNIT_YEARS[read(section, 'ePatient.16').toUpperCase()];
  if (Number.isFinite(age) && age > 0 && unit !== undefined) {
    const derived = new Date(Date.now() - age * unit * MS_PER_YEAR);
    if (!Number.isNaN(derived.getTime())) {
      return {
        gender,
        ...(name ? { name } : {}),
        birthDate: derived.toISOString().slice(0, 10),
      };
    }
  }

  return { gender, ...(name ? { name } : {}) };
}
