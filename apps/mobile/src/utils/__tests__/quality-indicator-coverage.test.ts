import {
  demsCodesFor,
  enforcementReadiness,
  implementedElementCodes,
  sectionCoverage,
} from '../quality-indicator-coverage';

describe('demsCodesFor', () => {
  it('reads a plain element reference', () => {
    expect(demsCodesFor('eCardiac.01')).toEqual(['eCardiac.01']);
  });

  it('reads every code out of a compound mapping', () => {
    expect(demsCodesFor('eVitals.03 / eResp.01')).toEqual(['eVitals.03', 'eResp.01']);
    expect(demsCodesFor('ePain.02 (linked)')).toEqual(['ePain.02']);
  });

  it('returns nothing when the mapping names a series rather than an element', () => {
    expect(demsCodesFor('Derived from eTimes series / AMI-03')).toEqual([]);
    expect(demsCodesFor('eVitals series')).toEqual([]);
  });

  it('returns nothing for a field with no DEMS mapping', () => {
    expect(demsCodesFor('Derived from PAS-05a')).toEqual([]);
  });
});

describe('implementedElementCodes', () => {
  it('collects the codes the NEMSIS form actually captures', () => {
    const codes = implementedElementCodes();
    expect(codes.size).toBeGreaterThan(0);
    expect(codes.has('eTimes.02')).toBe(true);
    // A section the app does not implement.
    expect(codes.has('eVitals.06')).toBe(false);
  });
});

describe('sectionCoverage', () => {
  const coverage = sectionCoverage();

  it('finds the sections the quality indicator regime depends on', () => {
    const sections = coverage.map(entry => entry.section);
    expect(sections).toContain('eVitals');
    expect(sections).toContain('eECG');
    expect(sections).toContain('eHandover');
  });

  it('marks only the implemented sections as implemented', () => {
    const implemented = coverage.filter(entry => entry.implemented).map(e => e.section);
    expect(implemented).toContain('eTimes');
    expect(implemented).toContain('eDisposition');
    expect(implemented).not.toContain('eECG');
    expect(implemented).not.toContain('eVitals');
  });

  it('counts implemented elements for implemented sections only', () => {
    const times = coverage.find(entry => entry.section === 'eTimes')!;
    expect(times.implemented).toBe(true);
    expect(times.implementedElements).toBeGreaterThan(0);

    const ecg = coverage.find(entry => entry.section === 'eECG')!;
    expect(ecg.implemented).toBe(false);
    expect(ecg.implementedElements).toBe(0);
  });

  it('attributes quality fields and modules to each section', () => {
    const vitals = coverage.find(entry => entry.section === 'eVitals')!;
    expect(vitals.qualityFields).toBeGreaterThan(0);
    expect(vitals.modules.length).toBeGreaterThan(0);
  });

  it('puts the unimplemented gaps first', () => {
    const firstImplemented = coverage.findIndex(entry => entry.implemented);
    const lastUnimplemented = coverage.map(e => !e.implemented).lastIndexOf(true);
    expect(lastUnimplemented).toBeLessThan(firstImplemented);
  });
});

describe('enforcementReadiness', () => {
  const readiness = enforcementReadiness();

  it('counts the whole rule corpus', () => {
    expect(readiness.totalRules).toBe(81);
  });

  it('reports readability separately from enforceability', () => {
    expect(readiness.machineReadable).toBeGreaterThan(0);
    // A rule cannot be enforced before the form captures the fields it reads.
    expect(readiness.enforceable).toBeLessThanOrEqual(readiness.machineReadable);
  });

  it('lists the DEMS sections the form still needs', () => {
    expect(readiness.missingSections.length).toBeGreaterThan(0);
    expect(readiness.missingSections).toContain('eECG');
    expect(readiness.missingSections).not.toContain('eTimes');
  });

  it('is consistent with the section coverage it derives from', () => {
    const missing = sectionCoverage().filter(entry => !entry.implemented);
    expect(readiness.missingSections).toEqual(missing.map(entry => entry.section));
  });
});
