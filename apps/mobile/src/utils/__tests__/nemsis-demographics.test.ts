import { demographicsFrom, type FormData } from '../nemsis-demographics';

const ePatient = (values: Record<string, string>): FormData => ({
  ePatient: values,
});

describe('demographicsFrom', () => {
  test('maps the NEMSIS name elements onto a core HumanName', () => {
    const result = demographicsFrom(
      ePatient({
        'ePatient.02': 'Okafor',
        'ePatient.03': 'Adaeze',
        'ePatient.04': 'N',
      })
    );

    expect(result.name?.[0]).toEqual({
      family: 'Okafor',
      given: ['Adaeze', 'N'],
      text: 'Adaeze N Okafor',
    });
  });

  test('omits the name entirely when no name element was filled in', () => {
    expect(demographicsFrom(ePatient({ 'ePatient.25': 'M' })).name).toBeUndefined();
  });

  test('handles a family name with no given name', () => {
    const result = demographicsFrom(ePatient({ 'ePatient.02': 'Anonymous' }));
    expect(result.name?.[0]).toEqual({ family: 'Anonymous', given: [], text: 'Anonymous' });
  });

  test.each([
    ['M', 'male'],
    ['m', 'male'],
    ['Male', 'male'],
    ['F', 'female'],
    ['f', 'female'],
    ['Female', 'female'],
  ])('maps NEMSIS sex %p to %p', (input, expected) => {
    expect(demographicsFrom(ePatient({ 'ePatient.25': input })).gender).toBe(expected);
  });

  test('falls back to unknown for an unrecognised or absent sex', () => {
    expect(demographicsFrom(ePatient({})).gender).toBe('unknown');
    expect(demographicsFrom(ePatient({ 'ePatient.25': 'X' })).gender).toBe('unknown');
  });

  test('prefers a recorded date of birth over the age pair', () => {
    const result = demographicsFrom(
      ePatient({ 'ePatient.17': '1974-03-02', 'ePatient.15': '51', 'ePatient.16': 'Y' })
    );
    expect(result.birthDate).toBe('1974-03-02');
  });

  test('derives a date of birth from age in years', () => {
    const result = demographicsFrom(ePatient({ 'ePatient.15': '30', 'ePatient.16': 'Y' }));
    const age = (Date.now() - Date.parse(`${result.birthDate}T00:00:00Z`)) / (365.25 * 864e5);
    expect(age).toBeGreaterThan(29.9);
    expect(age).toBeLessThan(30.1);
  });

  test.each([
    ['M', 30 / 12],
    ['D', 30 / 365.25],
    ['H', 30 / 8766],
  ])('derives a date of birth from age in %p', (unit, expectedYears) => {
    const result = demographicsFrom(ePatient({ 'ePatient.15': '30', 'ePatient.16': unit }));
    const age = (Date.now() - Date.parse(`${result.birthDate}T00:00:00Z`)) / (365.25 * 864e5);
    expect(Math.abs(age - expectedYears)).toBeLessThan(0.1);
  });

  test('leaves the date of birth unset when the age is unusable', () => {
    expect(demographicsFrom(ePatient({ 'ePatient.15': 'unknown' })).birthDate).toBeUndefined();
    expect(demographicsFrom(ePatient({ 'ePatient.15': '30' })).birthDate).toBeUndefined();
    expect(
      demographicsFrom(ePatient({ 'ePatient.15': '0', 'ePatient.16': 'Y' })).birthDate
    ).toBeUndefined();
  });

  test('tolerates an entirely empty form', () => {
    expect(demographicsFrom({})).toEqual({ gender: 'unknown' });
  });

  test('tolerates the section being present but blank', () => {
    expect(demographicsFrom({ ePatient: {} })).toEqual({ gender: 'unknown' });
  });
});
