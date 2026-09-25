import { z } from 'zod';

/**
 * A capture field in a DEMS ePCR quality indicator module.
 *
 * The documents describe these as "Field ID / Form Label / Data Type / Field
 * Options & Value Codes / Validation & Dependency Logic / DEMS v1.0 Mapping",
 * and that shape is preserved here so a reviewer can reconcile the app against
 * the source document line by line.
 */
export const QualityIndicatorFieldSchema = z.object({
  /** Module-local identifier, e.g. `AMI-01`. */
  id: z.string().min(1),
  /** Human readable field name as printed on the ePCR form. */
  label: z.string().min(1),
  /** Declared capture type, e.g. `Dropdown (Single-select)`, `Time (HH:MM:SS)`. */
  dataType: z.string(),
  /**
   * Permitted values exactly as the document lists them. The source concatenates
   * option codes without delimiters (`YesNoNot_Applicable`), so this is kept
   * verbatim rather than guessed apart: splitting it needs a clinician-approved
   * token dictionary, and a wrong split would silently change validation
   * behaviour. Rule conditions that name a specific code still match verbatim.
   */
  valueCodes: z.string(),
  /** Prose dependency logic, e.g. `Mandatory field if AMI-01 != No.` */
  validation: z.string(),
  /** The NEMSIS/DEMS element this field maps to, e.g. `eCardiac.01`. */
  demsMapping: z.string(),
});
export type QualityIndicatorField = z.infer<typeof QualityIndicatorFieldSchema>;

/**
 * A validation rule attached to a module. The documents separate "critical
 * validation error" (blocks submission) from "soft warning prompt" (advises
 * the clinician), and the app preserves that distinction because it decides
 * whether a crew can still submit a report.
 */
export const QualityIndicatorRuleSchema = z.object({
  id: z.string().min(1),
  /** Prose trigger, e.g. `AMI-01 != No and AMI-03 is blank.` */
  trigger: z.string(),
  /** Field the rule is about, e.g. `AMI-03 (Time of First 12-Lead ECG)`. */
  targetField: z.string(),
  /** Raw severity label from the source document. */
  validationClass: z.string(),
  /** What the software should do when the trigger fires. */
  action: z.string(),
});
export type QualityIndicatorRule = z.infer<typeof QualityIndicatorRuleSchema>;

export const QualityIndicatorModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** Compact label for tab chips and list rows. */
  short: z.string().min(1),
  sourceFile: z.string().min(1),
  summary: z.string(),
  fields: z.array(QualityIndicatorFieldSchema),
  rules: z.array(QualityIndicatorRuleSchema),
});
export type QualityIndicatorModule = z.infer<typeof QualityIndicatorModuleSchema>;

/** A machine-checkable condition extracted from a rule's prose trigger. */
export const QualityConditionSchema = z.object({
  /** Module-local field id the condition reads, e.g. `AMI-01`. */
  field: z.string().min(1),
  operator: z.enum(['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'present', 'absent']),
  /** Right-hand operand for comparisons; absent for `present`/`absent`. */
  value: z.string().optional(),
  /**
   * How this condition combines with the others in the same trigger. The source
   * sentences are written as plain English, so this is a best-effort reading.
   */
  conjunction: z.enum(['and', 'or']).default('and'),
});
export type QualityCondition = z.infer<typeof QualityConditionSchema>;
