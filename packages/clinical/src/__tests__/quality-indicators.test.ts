import {
  describeQualityIndicatorFields,
  evaluateQualityIndicatorRules,
  getQualityIndicatorModule,
  listQualityIndicatorModules,
  parseQualityConditions,
  qualityIndicatorCoverage,
  ruleSeverity,
  searchQualityIndicators,
  type QualityIndicatorModule,
} from '../quality-indicators';

const modules = listQualityIndicatorModules();

function conditionList(sentence: string) {
  return parseQualityConditions(sentence).conditions;
}

describe('quality indicator catalogue', () => {
  it('exposes every DEMS module', () => {
    expect(modules).toHaveLength(11);
    expect(modules.map(module => module.id)).toEqual(
      expect.arrayContaining([
        'ami',
        'stroke',
        'sepsis',
        'cardiac-arrest',
        'respiratory-emergencies',
        'obstetrics',
        'neonate-paediatric',
        'trauma-management',
        'behavioural-emergencies',
        'critical-care-retrieval',
        'pain-management',
      ])
    );
  });

  it('keeps the captured counts from the source documents', () => {
    const fields = modules.reduce((total, module) => total + module.fields.length, 0);
    const rules = modules.reduce((total, module) => total + module.rules.length, 0);
    expect(fields).toBe(256);
    expect(rules).toBe(81);
  });

  it('has unique field and rule ids within every module', () => {
    for (const module of modules) {
      expect(new Set(module.fields.map(field => field.id)).size).toBe(module.fields.length);
      expect(new Set(module.rules.map(rule => rule.id)).size).toBe(module.rules.length);
    }
  });

  it('looks modules up by id and rejects unknown ids', () => {
    expect(getQualityIndicatorModule('sepsis')?.title).toMatch(/sepsis/i);
    expect(getQualityIndicatorModule('nope')).toBeUndefined();
  });

  it('searches titles, summaries and field labels', () => {
    expect(searchQualityIndicators('')).toHaveLength(11);
    expect(searchQualityIndicators('sepsis').map(m => m.id)).toContain('sepsis');
    expect(searchQualityIndicators('zzzz')).toEqual([]);
  });
});

describe('field requirements', () => {
  it('marks plainly mandatory fields and keeps the source prose', () => {
    const ami = getQualityIndicatorModule('ami')!;
    const fields = describeQualityIndicatorFields(ami);
    // "Mandatory field. Atypical_Presentation captures ..."
    const ami01 = fields.find(field => field.id === 'AMI-01')!;
    expect(ami01.mandatory).toBe(true);
    expect(ami01.requirementProse).toMatch(/mandatory/i);
  });

  it('does not invent a requirement for a calculated field', () => {
    const ami = getQualityIndicatorModule('ami')!;
    // "Calculated field. Values >10 minutes trigger a soft warning ..."
    const ami05 = describeQualityIndicatorFields(ami).find(f => f.id === 'AMI-05')!;
    expect(ami05.mandatory).toBe(false);
    expect(ami05.requiredWhen).toBeNull();
  });

  it('derives a conditional dependency from the "if" clause', () => {
    const ami = getQualityIndicatorModule('ami')!;
    const fields = describeQualityIndicatorFields(ami);
    const ami03 = fields.find(field => field.id === 'AMI-03')!;
    expect(ami03.mandatory).toBe(true);
    expect(ami03.requiredWhen).toEqual([
      { field: 'AMI-01', operator: 'notEquals', value: 'No', conjunction: 'and' },
    ]);
  });

  it('ignores the explanatory sentence that follows the condition', () => {
    // "Mandatory field if AMI-01 != No. System calculates AMI-05 from ..."
    const ami = getQualityIndicatorModule('ami')!;
    const ami03 = describeQualityIndicatorFields(ami).find(f => f.id === 'AMI-03')!;
    expect(ami03.requiredWhen).not.toBeNull();
  });

  it('leaves requiredWhen null rather than guessing', () => {
    const all = modules.flatMap(module => describeQualityIndicatorFields(module));
    const unparsed = all.filter(field => field.mandatory && field.requiredWhen === null);
    // Unparsed conditions must still carry their prose for a human to read.
    for (const field of unparsed) expect(field.requirementProse.length).toBeGreaterThan(0);
    expect(unparsed.length).toBeGreaterThan(0);
  });

  it('attaches the rules that target each field', () => {
    const stroke = getQualityIndicatorModule('stroke')!;
    const fields = describeQualityIndicatorFields(stroke);
    expect(fields.find(field => field.id === 'STR-04')!.rules.length).toBeGreaterThan(0);
  });

  it('keeps concatenated source value codes verbatim', () => {
    // The documents run option codes together (`Wake_Up_StrokeUnwitnessed`).
    // Splitting them without a clinical dictionary would change what validates.
    const concatenated = modules
      .flatMap(module => describeQualityIndicatorFields(module))
      .filter(field => /[a-z][A-Z]/.test(field.valueCodes));
    expect(concatenated.length).toBeGreaterThan(0);
    for (const field of concatenated) {
      expect(field.valueCodes).toMatch(/[a-z][A-Z]/);
    }
  });
});

describe('parseQualityConditions', () => {
  it('reads a not-equals comparison', () => {
    expect(conditionList('AMI-01 ≠ No')).toEqual([
      { field: 'AMI-01', operator: 'notEquals', value: 'No', conjunction: 'and' },
    ]);
  });

  it('reads numeric comparisons without needing spaces', () => {
    expect(conditionList('PED-02 < 7')).toEqual([
      { field: 'PED-02', operator: 'lt', value: '7', conjunction: 'and' },
    ]);
    expect(conditionList('OBS-02 ≥20 weeks')[0]).toMatchObject({
      operator: 'gte',
      value: '20 weeks',
    });
  });

  it('reads presence checks', () => {
    expect(conditionList('CA-19 is blank')[0]).toMatchObject({ operator: 'absent' });
    expect(conditionList('AMI-03 is populated')[0]).toMatchObject({ operator: 'present' });
  });

  it('joins clauses with and', () => {
    expect(conditionList('AMI-01 ≠ No and AMI-03 is blank.')).toEqual([
      { field: 'AMI-01', operator: 'notEquals', value: 'No', conjunction: 'and' },
      { field: 'AMI-03', operator: 'absent', conjunction: 'and' },
    ]);
  });

  it('expands a slash-joined enumeration into alternatives', () => {
    // Regression guard: read as one literal, "STEMI" would never equal
    // "STEMI/STEMI_Equivalent" and a critical rule would silently never fire.
    expect(conditionList('AMI-04 = STEMI/STEMI_Equivalent and AMI-06 is blank')).toEqual([
      { field: 'AMI-04', operator: 'equals', value: 'STEMI', conjunction: 'and' },
      { field: 'AMI-04', operator: 'equals', value: 'STEMI_Equivalent', conjunction: 'or' },
      { field: 'AMI-06', operator: 'absent', conjunction: 'and' },
    ]);
  });

  it('expands a word-joined enumeration into alternatives', () => {
    expect(conditionList('STR-02 = Positive or Equivocal and STR-04 is blank')).toEqual([
      { field: 'STR-02', operator: 'equals', value: 'Positive', conjunction: 'and' },
      { field: 'STR-02', operator: 'equals', value: 'Equivocal', conjunction: 'or' },
      { field: 'STR-04', operator: 'absent', conjunction: 'and' },
    ]);
  });

  it('does not steal an operator from a later clause', () => {
    // Regression guard: an unanchored presence match once turned this into
    // "AMI-01 is blank", dropping the not-equals entirely.
    const conditions = conditionList('AMI-01 ≠ No and AMI-03 is blank');
    expect(conditions[0]).toMatchObject({ field: 'AMI-01', operator: 'notEquals' });
  });

  it('keeps code operands case-sensitively shaped but compares case-insensitively', () => {
    const parsed = parseQualityConditions('AMI-04 = STEMI_Equivalent');
    expect(parsed.conditions[0]!.value).toBe('STEMI_Equivalent');
  });

  it('flags a timing qualifier instead of enforcing the unqualified rule', () => {
    const parsed = parseQualityConditions('STR-06 = Yes and STR-10 is blank at handover');
    expect(parsed.complete).toBe(false);
    expect(parsed.qualifier).toBe('at handover');
    // The understood part is still returned for display.
    expect(parsed.conditions).toHaveLength(2);
  });

  it('refuses trailing prose that would change the meaning', () => {
    const parsed = parseQualityConditions(
      'BEH-28 = blank or Low_Risk_Voluntary_Refusal_Accepted without supervisor consult'
    );
    expect(parsed.complete).toBe(false);
  });

  it('refuses prose quantifiers and unsupported operators', () => {
    for (const sentence of [
      'BEH-17 = Yes and BEH-19 has fewer than two monitoring modalities selected',
      'TRA-07 contains Tourniquet and TRA-08 is blank',
      'PAS-08 ≥ 7 (or CPOT_Pain_Likely = Yes) and MGT-01 is blank',
      'SEP-02 selected and linked vital signs incomplete for score calculation',
    ]) {
      expect(parseQualityConditions(sentence).complete).toBe(false);
    }
  });

  it('refuses a field reference dressed up in parentheses', () => {
    const parsed = parseQualityConditions(
      'DOC-03 (Handover Pain Status Communicated) is blank and PAS-01 = Yes'
    );
    expect(parsed.complete).toBe(false);
  });

  it('reports nothing for empty input', () => {
    expect(parseQualityConditions('')).toEqual({
      conditions: [],
      complete: false,
      qualifier: null,
    });
  });
});

describe('rule evaluation', () => {
  const ami = getQualityIndicatorModule('ami')!;

  it('fires a critical rule when its trigger holds', () => {
    // VAL-AMI01: "AMI-01 != No and AMI-03 is blank."
    const { findings } = evaluateQualityIndicatorRules(ami, {
      'AMI-01': 'Yes',
      'AMI-03': '',
    });
    const fired = findings.find(f => f.rule.id === 'VAL-AMI01');
    expect(fired).toBeDefined();
    expect(fired!.severity).toBe('critical');
    expect(fired!.fieldId).toBe('AMI-03');
    expect(fired!.evaluated).toBe(true);
  });

  it('does not fire when the trigger does not hold', () => {
    const { findings } = evaluateQualityIndicatorRules(ami, { 'AMI-01': 'No', 'AMI-03': '10:02' });
    expect(findings.find(f => f.rule.id === 'VAL-AMI01')).toBeUndefined();
  });

  it('matches either value of an enumeration', () => {
    for (const value of ['STEMI', 'STEMI_Equivalent']) {
      const { findings } = evaluateQualityIndicatorRules(ami, { 'AMI-04': value, 'AMI-06': '' });
      expect(findings.some(f => f.fieldId === 'AMI-06')).toBe(true);
    }
  });

  it('never reports an unreadable rule as passing', () => {
    for (const module of modules) {
      const { findings, unverified } = evaluateQualityIndicatorRules(module, {});
      // Every finding must come from a trigger that was fully understood.
      for (const finding of findings) {
        expect(finding.evaluated).toBe(true);
        expect(parseQualityConditions(finding.rule.trigger).complete).toBe(true);
      }
      // And every rule we could not check must be handed back for a human.
      for (const rule of module.rules) {
        const readable = parseQualityConditions(rule.trigger).complete;
        if (!readable || !fieldIsResolvable(module, rule)) {
          expect(unverified).toContainEqual(rule);
        }
      }
    }
  });

  it('separates critical errors from soft warnings', () => {
    const critical = modules
      .flatMap(module => module.rules)
      .filter(rule => ruleSeverity(rule) === 'critical');
    const warnings = modules
      .flatMap(module => module.rules)
      .filter(rule => ruleSeverity(rule) === 'warning');
    expect(critical.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

function fieldIsResolvable(module: QualityIndicatorModule, rule: { targetField: string; trigger: string }) {
  const reference = /\b([A-Z]{2,5}-\d+[a-z]?)\b/.exec(rule.targetField);
  if (reference && module.fields.some(field => field.id === reference[1])) return true;
  const all = rule.trigger.match(/\b[A-Z]{2,5}-\d+[a-z]?\b/g) ?? [];
  return all.some(candidate => module.fields.some(field => field.id === candidate));
}

describe('coverage reporting', () => {
  it('reports how much of the governance content is machine-checked', () => {
    const totals = modules.reduce(
      (acc, module) => {
        const coverage = qualityIndicatorCoverage(module);
        return {
          total: acc.total + coverage.total,
          machineChecked: acc.machineChecked + coverage.machineChecked,
        };
      },
      { total: 0, machineChecked: 0 }
    );
    expect(totals.total).toBe(81);
    expect(totals.machineChecked).toBeGreaterThan(0);
    expect(totals.machineChecked).toBeLessThan(totals.total);
  });

  it('computes a ratio per module', () => {
    for (const module of modules) {
      const coverage = qualityIndicatorCoverage(module);
      expect(coverage.ratio).toBeGreaterThanOrEqual(0);
      expect(coverage.ratio).toBeLessThanOrEqual(1);
    }
  });
});
