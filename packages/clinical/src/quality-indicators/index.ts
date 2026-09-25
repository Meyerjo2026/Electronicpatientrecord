import { z } from 'zod';
import { QUALITY_INDICATOR_MODULES } from './generated-data';
import {
  QualityConditionSchema,
  QualityIndicatorFieldSchema,
  QualityIndicatorModuleSchema,
  QualityIndicatorRuleSchema,
  type QualityCondition,
  type QualityIndicatorField,
  type QualityIndicatorModule,
  type QualityIndicatorRule,
} from './types';

export * from './types';
export { QUALITY_INDICATOR_MODULES };

/** Every module, validated at import so a bad generator run fails loudly. */
const MODULES: QualityIndicatorModule[] = QUALITY_INDICATOR_MODULES.map(module =>
  QualityIndicatorModuleSchema.parse(module)
);

/** All quality indicator modules, in clinical-priority order. */
export function listQualityIndicatorModules(): QualityIndicatorModule[] {
  return MODULES;
}

/** Look up a module by its id, e.g. `sepsis`. */
export function getQualityIndicatorModule(
  id: string
): QualityIndicatorModule | undefined {
  return MODULES.find(module => module.id === id);
}

/** Find modules whose title, summary or field labels mention a term. */
export function searchQualityIndicators(term: string): QualityIndicatorModule[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return MODULES;
  return MODULES.filter(module => {
    if (module.title.toLowerCase().includes(needle)) return true;
    if (module.summary.toLowerCase().includes(needle)) return true;
    return module.fields.some(field => field.label.toLowerCase().includes(needle));
  });
}

/* ------------------------------------------------------------------ *
 * Field requirements
 * ------------------------------------------------------------------ */

/** A capture field plus the requirement metadata derived from its prose. */
export interface QualityIndicatorFieldDetail extends QualityIndicatorField {
  /**
   * True when the document marks the field mandatory in any form, e.g.
   * `Mandatory field.` or `Mandatory field if AMI-01 != No.`
   *
   * This does not mean *unconditionally* required: a conditional mandate
   * reports `mandatory: true` together with
   * {@link conditionallyRequired} set. Callers that need to know whether a
   * field is always required must check both, otherwise `Mandatory if` fields
   * will be read as unconditional requirements.
   */
  mandatory: boolean;
  /**
   * True when the document makes the requirement depend on a condition, e.g.
   * `Mandatory field if AMI-01 != No` or `Conditional.`.
   *
   * Kept separate from `mandatory` because a conditional requirement is not a
   * requirement, and treating it as one would flag valid reports as incomplete.
   */
  conditionallyRequired: boolean;
  /**
   * Machine-readable condition extracted from the `if ...` clause, or `null`
   * when the dependency could not be parsed. `null` never means "not required";
   * read {@link QualityIndicatorFieldDetail.requirementProse} for the source.
   */
  requiredWhen: QualityCondition[] | null;
  /** The original dependency sentence, always shown alongside the derived data. */
  requirementProse: string;
  /** Rules in this module that target this field. */
  rules: QualityIndicatorRule[];
}

/** `Mandatory` in any of the phrasings the documents use. */
const MANDATORY = /\bmandatory\b/i;
/** `Mandatory ... if/where/for/on ...`, i.e. required under a condition. */
const CONDITIONAL_MANDATE = /\bmandatory\s+(?:field\s+)?(?:if|where|for|on)\b/i;
/** Fields the documents open with `Optional`. */
const OPTIONAL_LEAD = /^optional\b/i;
/** Fields the documents open with `Conditional`. */
const CONDITIONAL_LEAD = /^conditional\b/i;

/**
 * Read the requirement out of a validation sentence.
 *
 * The documents use four openings: `Mandatory field`, `Conditional`,
 * `Optional field` and `Calculated field`, plus conditional mandates such as
 * `Mandatory field if AMI-01 != No`. A plain substring test for "mandatory"
 * gets `Optional field, becomes mandatory if ...` wrong, reporting a field the
 * document calls optional as unconditionally required.
 */
function readRequirement(validation: string): {
  mandatory: boolean;
  conditionallyRequired: boolean;
} {
  const text = validation.trim();
  if (OPTIONAL_LEAD.test(text)) {
    return { mandatory: false, conditionallyRequired: MANDATORY.test(text) };
  }
  if (CONDITIONAL_LEAD.test(text)) {
    return { mandatory: false, conditionallyRequired: true };
  }
  if (!MANDATORY.test(text)) {
    return { mandatory: false, conditionallyRequired: false };
  }
  return { mandatory: true, conditionallyRequired: CONDITIONAL_MANDATE.test(text) };
}

/**
 * Attach requirement metadata to every field in a module.
 *
 * The source documents state dependencies in prose. The machine-readable part
 * is extracted where it can be done without guessing (see
 * {@link parseQualityConditions}); everything else stays available as prose so
 * a clinician can still act on it.
 */
export function describeQualityIndicatorFields(
  module: QualityIndicatorModule
): QualityIndicatorFieldDetail[] {
  return module.fields.map(field => {
    const parsed = parseQualityConditions(extractConditionClause(field.validation));
    return {
      ...field,
      ...readRequirement(field.validation),
      requiredWhen: parsed.complete && parsed.conditions.length > 0 ? parsed.conditions : null,
      requirementProse: field.validation,
      rules: module.rules.filter(rule => ruleTargetsField(rule, field.id)),
    };
  });
}

function ruleTargetsField(rule: QualityIndicatorRule, fieldId: string): boolean {
  return new RegExp(`\\b${escapeRegExp(fieldId)}\\b`).test(rule.targetField);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pull the conditional clause out of a validation sentence. */
function extractConditionClause(validation: string): string {
  const match = /\b(?:if|when)\b\s+(.+)$/i.exec(validation.trim());
  const clause = (match?.[1] ?? validation).trim();
  // The documents follow the condition with an explanatory sentence
  // ("Mandatory field if AMI-01 != No. System calculates AMI-05 from ...").
  // Only the first sentence carries the dependency.
  const firstSentence = clause.match(/^[^.]+?\./);
  return (firstSentence?.[0] ?? clause).trim().replace(/\.$/, '');
}

/* ------------------------------------------------------------------ *
 * Prose -> conditions
 * ------------------------------------------------------------------ */

const FIELD_REFERENCE = /\b([A-Z]{2,5}-\d+[a-z]?)\b/;

/**
 * Comparisons the parser understands, anchored to the start of the text that
 * follows a field reference. Anchoring matters: an unanchored pattern can match
 * a *later* clause and attach the wrong operator to the wrong field, which
 * would be worse than reporting the rule as unreadable.
 */
const COMPARATORS: Array<{ pattern: RegExp; operator: QualityCondition['operator'] }> = [
  { pattern: /^\s*(?:!=|≠)\s*/, operator: 'notEquals' },
  { pattern: /^\s*(?:>=|≥)\s*/, operator: 'gte' },
  { pattern: /^\s*(?:<=|≤)\s*/, operator: 'lte' },
  { pattern: /^\s*>\s*/, operator: 'gt' },
  { pattern: /^\s*<\s*/, operator: 'lt' },
  { pattern: /^\s*=\s*/, operator: 'equals' },
];

const PRESENCE: Array<{ pattern: RegExp; operator: QualityCondition['operator'] }> = [
  {
    pattern: /^\s+is\s+(?:blank|empty|missing|unanswered|not\s+recorded)\b/i,
    operator: 'absent',
  },
  {
    pattern: /^\s+is\s+(?:populated|completed|answered|recorded|present)\b/i,
    operator: 'present',
  },
];

/**
 * Trailing qualifiers the documents append to a condition, e.g.
 * `CA-19 is blank at handover`. They narrow *when* a rule applies, so the
 * parser refuses them rather than quietly enforcing the unqualified version -
 * a false "critical" finding would block a crew from submitting a valid report.
 */
const TRAILING_QUALIFIER =
  /^\s+(?:at|during|following|before|after|on)\b.*$/i;

/**
 * Function words that mean the sentence kept going after the value. Capturing
 * "Low_Risk_Refusal_Accepted without supervisor consult" as one literal value
 * would fabricate a match, so the run is rejected instead.
 */
const PROSE_WORD =
  /\b(?:without|with|unless|where|that|which|when|while|if|before|after|during|should|must|documented|recorded|selected|patient|clinician|or|and)\b/i;

/** A value token: at most three words, no comparison or arithmetic characters. */
const OPERAND_TOKEN = /^[A-Za-z0-9][A-Za-z0-9_.()%+-]*(?:\s+[A-Za-z0-9][A-Za-z0-9_.()%+-]*){0,2}$/;

/** True only when every alternative is a literal value we can compare against. */
function isMachineReadableOperand(alternatives: string[]): boolean {
  if (alternatives.length === 0) return false;
  if (PROSE_WORD.test(alternatives.join(' '))) return false;
  return alternatives.every(alternative => OPERAND_TOKEN.test(alternative));
}

export interface ParsedConditions {
  conditions: QualityCondition[];
  /**
   * False when any part of the sentence could not be interpreted. Callers must
   * not machine-enforce a trigger that is not complete - the prose may carry
   * clauses the parser skipped.
   */
  complete: boolean;
  /**
   * Set when the only thing left unparsed was a timing qualifier such as
   * `at handover`. The conditions are still worth showing, but the rule is not
   * machine-enforced because the qualifier can change the outcome.
   */
  qualifier: string | null;
}

/**
 * Extract conditions from a sentence such as
 * `AMI-01 != No and AMI-03 is blank` or `RET-04 = Neonate_Under28Days`.
 *
 * Deliberately conservative. It understands single-field comparisons, numeric
 * comparisons and blank/populated presence checks joined by `and`/`or`. Any
 * remaining prose (`has fewer than two modalities`, `contains X`, references
 * to fields outside the module) marks the result incomplete, so the caller can
 * fall back to showing the source sentence instead of silently under-checking.
 */
export function parseQualityConditions(sentence: string): ParsedConditions {
  // Source sentences are stored as written, so they keep their full stop.
  const text = sentence.trim().replace(/[.\s]+$/, '');
  if (!text) return { conditions: [], complete: false, qualifier: null };

  const conditions: QualityCondition[] = [];
  let remainder = text;
  let conjunction: QualityCondition['conjunction'] = 'and';
  let complete = true;
  let qualifier: string | null = null;

  // Walk the sentence left to right, consuming one recognised condition at a
  // time and tracking whether the next clause is joined by "and" or "or".
  for (;;) {
    const fieldMatch = FIELD_REFERENCE.exec(remainder);
    if (!fieldMatch) break;

    const field = fieldMatch[1]!;
    const afterField = remainder.slice(fieldMatch.index + field.length);

    const presence = PRESENCE.find(entry => entry.pattern.test(afterField));
    if (presence) {
      conditions.push(
        QualityConditionSchema.parse({ field, operator: presence.operator, conjunction })
      );
      const consumed = presence.pattern.exec(afterField)![0].length;
      remainder = afterField.slice(consumed);
    } else {
      const comparator = COMPARATORS.find(entry => entry.pattern.test(afterField));
      if (!comparator) {
        complete = false;
        break;
      }
      const separator = comparator.pattern.exec(afterField)![0];
      const tail = afterField.slice(separator.length);
      // The right-hand operand runs until a clause-level "and" or another field
      // reference. "or" is deliberately *not* a stopping point, because
      // `STEMI or STEMI_Equivalent` enumerates one field's values.
      const operandMatch = /^(.+?)(?=\s+and\b|\s+[A-Z]{2,5}-\d+[a-z]?\b|$)/.exec(tail);
      if (!operandMatch || operandMatch[1]!.trim() === '') {
        complete = false;
        break;
      }
      // Drop a connector that introduced the next clause, e.g.
      // `Severe_Haemorrhage or OBS-10 populated` ends the operand at "or".
      const run = operandMatch[1]!.trim().replace(/[.,;]$/, '').replace(/\s+(?:or|and)$/i, '');

      // `STEMI or STEMI_Equivalent` and `STEMI/STEMI_Equivalent` are two
      // spellings of the same enumeration and mean "either value". Treating the
      // slash form as a single literal would make a critical rule silently
      // never fire, so it is expanded into alternatives instead.
      const alternatives = run
        .split(/\s*\|\|\s*|\s*\/\s*|\s+or\s+/i)
        .map(part => part.trim())
        .filter(part => part !== '');

      if (!isMachineReadableOperand(alternatives)) {
        complete = false;
        break;
      }

      alternatives.forEach((alternative, index) => {
        conditions.push(
          QualityConditionSchema.parse({
            field,
            operator: comparator.operator,
            // Strip the conversational wrapper the documents use around values.
            value: alternative.replace(/^(?:is\s+)?(?:still\s+)?(?:at\s+)?/, ''),
            conjunction: index === 0 ? conjunction : 'or',
          })
        );
      });
      remainder = tail.slice(operandMatch[1]!.length);
    }

    const nextConjunction = /^\s*(and|or)\b/i.exec(remainder);
    if (nextConjunction) {
      conjunction = nextConjunction[1]!.toLowerCase() as QualityCondition['conjunction'];
      remainder = remainder.slice(nextConjunction[0].length);
      continue;
    }
    break;
  }

  // Anything left over means we did not understand the whole sentence. A
  // recognised timing qualifier still leaves the rule unverifiable, but the
  // reason is reported so the UI can say "needs review at handover" rather than
  // implying the rule was checked.
  if (remainder.trim() !== '') {
    complete = false;
    qualifier = TRAILING_QUALIFIER.test(remainder) ? remainder.trim() : null;
  } else {
    qualifier = null;
  }
  if (conditions.length === 0) complete = false;

  return { conditions, complete, qualifier };
}

/* ------------------------------------------------------------------ *
 * Rule evaluation
 * ------------------------------------------------------------------ */

/** How serious a rule is: critical blocks submission, warning advises. */
export type QualityRuleSeverity = 'critical' | 'warning';

const CRITICAL = /critical/i;

export function ruleSeverity(rule: QualityIndicatorRule): QualityRuleSeverity {
  return CRITICAL.test(rule.validationClass) ? 'critical' : 'warning';
}

/** A rule whose trigger fired, or whose target field is missing. */
export interface QualityRuleFinding {
  rule: QualityIndicatorRule;
  severity: QualityRuleSeverity;
  moduleId: string;
  fieldId: string;
  /** The trigger as the clinician sees it. */
  message: string;
  /** What the source document says the software should do. */
  action: string;
  /**
   * True when the trigger was machine-evaluated, false when only the missing
   * target field could be established. Surfaced so the UI never claims it
   * checked something it did not.
   */
  evaluated: boolean;
}

/** Capture values keyed by module-local field id, e.g. `{ 'AMI-01': 'Yes' }`. */
export type QualityIndicatorValues = Record<string, string | undefined>;

const NUMERIC = /^-?\d+(\.\d+)?$/;

function conditionHolds(condition: QualityCondition, values: QualityIndicatorValues): boolean {
  const actual = values[condition.field];
  const filled = actual !== undefined && actual.trim() !== '';

  switch (condition.operator) {
    case 'present':
      return filled;
    case 'absent':
      return !filled;
    default:
      break;
  }

  if (!filled || condition.value === undefined) return false;

  const expected = condition.value.trim();
  if (NUMERIC.test(expected) && NUMERIC.test(actual!.trim())) {
    const left = Number(actual!.trim());
    const right = Number(expected);
    switch (condition.operator) {
      case 'equals':
        return left === right;
      case 'notEquals':
        return left !== right;
      case 'gt':
        return left > right;
      case 'gte':
        return left >= right;
      case 'lt':
        return left < right;
      case 'lte':
        return left <= right;
    }
  }

  // Value operands are case-insensitive; code operands like `STEMI_Equivalent`
  // keep their internal casing.
  const matches = actual!.trim().toLowerCase() === expected.toLowerCase();
  return condition.operator === 'equals' ? matches : !matches;
}

function evaluateConditions(
  conditions: QualityCondition[],
  values: QualityIndicatorValues
): boolean {
  if (conditions.length === 0) return false;
  const results = conditions.map(condition => conditionHolds(condition, values));
  // The first clause stands alone; each later clause combines with the running
  // result using its own conjunction.
  return results.reduce((accumulated, current, index) => {
    if (index === 0) return current;
    return conditions[index]!.conjunction === 'or' ? accumulated || current : accumulated && current;
  });
}

function fieldIdFromRule(rule: QualityIndicatorRule, module: QualityIndicatorModule): string | null {
  const fromTarget = FIELD_REFERENCE.exec(rule.targetField);
  if (fromTarget && module.fields.some(field => field.id === fromTarget[1])) {
    return fromTarget[1]!;
  }
  // Fall back to the last field named in the trigger.
  const all = rule.trigger.match(new RegExp(FIELD_REFERENCE, 'g')) ?? [];
  for (const candidate of all.reverse()) {
    if (module.fields.some(field => field.id === candidate)) return candidate;
  }
  return null;
}

/**
 * Evaluate a module's validation rules against captured values.
 *
 * Only rules whose trigger the parser fully understands are machine-evaluated.
 * A rule that cannot be parsed is never reported as passing - the UI is expected
 * to show it as unverified so a clinician still reads it.
 */
export function evaluateQualityIndicatorRules(
  module: QualityIndicatorModule,
  values: QualityIndicatorValues
): { findings: QualityRuleFinding[]; unverified: QualityIndicatorRule[] } {
  const findings: QualityRuleFinding[] = [];
  const unverified: QualityIndicatorRule[] = [];

  for (const rule of module.rules) {
    const fieldId = fieldIdFromRule(rule, module);
    if (!fieldId) {
      unverified.push(rule);
      continue;
    }

    const parsed = parseQualityConditions(rule.trigger);
    if (!parsed.complete) {
      unverified.push(rule);
      continue;
    }

    if (evaluateConditions(parsed.conditions, values)) {
      findings.push({
        rule,
        severity: ruleSeverity(rule),
        moduleId: module.id,
        fieldId,
        message: rule.trigger,
        action: rule.action,
        evaluated: true,
      });
    }
  }

  return { findings, unverified };
}

/**
 * Fraction of a module's rules the parser can machine-evaluate.
 *
 * Exposed so the app and the test suite can show, rather than hide, how much of
 * the governance content is enforced in software.
 */
export function qualityIndicatorCoverage(module: QualityIndicatorModule): {
  total: number;
  machineChecked: number;
  ratio: number;
} {
  const total = module.rules.length;
  const machineChecked = module.rules.filter(
    rule => parseQualityConditions(rule.trigger).complete
  ).length;
  return { total, machineChecked, ratio: total === 0 ? 1 : machineChecked / total };
}
