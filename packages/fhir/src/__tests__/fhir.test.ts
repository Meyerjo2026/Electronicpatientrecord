import {
  createBundle,
  createTransactionBundle,
  createSearchsetBundle,
  createDocumentBundle,
  validateBundle,
  validateResource,
  BundleTypeSchema,
} from '../resources/bundle';
import {
  validateResourceByType,
  validateBundleEntries,
  getSearchParams,
} from '../validation/validator';
import { generateId } from '@prehospital-epr/core';

const patientResource = {
  resourceType: 'Patient',
  id: generateId(),
  name: [{ use: 'official', family: 'Snow', given: ['Jon'] }],
  gender: 'male',
  birthDate: '1980-05-15',
};

describe('bundle builder', () => {
  test('creates a searchset bundle with total and entries', () => {
    const bundle = createSearchsetBundle(
      [{ fullUrl: `urn:uuid:${patientResource.id}`, resource: patientResource }],
      1
    );
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('searchset');
    expect(bundle.total).toBe(1);
    expect(bundle.entry?.length).toBe(1);
  });

  test('creates a transaction bundle that passes validation', () => {
    const bundle = createTransactionBundle([
      { request: { method: 'POST', url: 'Patient' }, resource: patientResource },
    ]);
    expect(bundle.type).toBe('transaction');
    expect(validateBundle(bundle).success).toBe(true);
  });

  test('createBundle defaults total to entry count', () => {
    const bundle = createBundle('collection');
    expect(bundle.total).toBe(0);
  });

  test('createDocumentBundle includes the composition', () => {
    const doc = createDocumentBundle(patientResource);
    expect(doc.type).toBe('document');
    expect(doc.entry?.[0]?.resource.resourceType).toBe('Patient');
  });

  test('only valid bundle types are accepted', () => {
    expect(BundleTypeSchema.safeParse('searchset').success).toBe(true);
    expect(BundleTypeSchema.safeParse('invalid').success).toBe(false);
  });
});

describe('resource validation', () => {
  test('validates a known resource type against core schemas', () => {
    const result = validateResourceByType('Patient', patientResource);
    expect(result.success).toBe(true);
  });

  test('reports unsupported resource types', () => {
    const result = validateResourceByType('DefinitelyNotAThing', {});
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.code).toBe('unsupported-resource-type');
  });

  test('rejects invalid resources', () => {
    const result = validateResourceByType('Patient', { resourceType: 'Patient', id: 'nope' });
    expect(result.success).toBe(false);
  });

  test('validateResource delegates to the registered validator map', () => {
    const invalid = validateResource({ resourceType: 'Nothing' });
    expect(invalid.success).toBe(false);

    const valid = validateResource(patientResource);
    // resourceValidators currently uses z.any() placeholders, so this must succeed.
    expect(valid.success).toBe(true);
  });

  test('validateBundleEntries validates each entry', () => {
    const results = validateBundleEntries({
      entry: [
        { resource: patientResource },
        { resource: { resourceType: 'Unknown' } },
      ],
    });
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.success).toBe(false);
  });
});

describe('search parameters', () => {
  test('returns patient search params for Patient', () => {
    const params = getSearchParams('Patient');
    const names = params.map(p => p.name);
    expect(names).toContain('name');
    expect(names).toContain('birthdate');
    expect(names).toContain('_id');
  });

  test('falls back to common params for unknown types', () => {
    const params = getSearchParams('Nonsense');
    expect(params.map(p => p.name)).toEqual(expect.arrayContaining(['_id', '_lastUpdated']));
  });
});