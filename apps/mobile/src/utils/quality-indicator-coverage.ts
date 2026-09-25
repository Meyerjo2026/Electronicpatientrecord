import { getFormSections } from '@prehospital-epr/nemsis';
import {
  listQualityIndicatorModules,
  parseQualityConditions,
  type QualityIndicatorModule,
  type QualityIndicatorRule,
} from '@prehospital-epr/clinical';

/**
 * How much of the DEMS quality indicator regime the app can actually enforce.
 *
 * The quality indicator documents describe a data dictionary far wider than the
 * NEMSIS sections this app captures. A rule can only be machine-enforced when
 * every field it reads is a field the form actually collects, so this module
 * measures that gap instead of letting the catalogue imply coverage it does not
 * have.
 */

/** A DEMS element reference such as `eVitals.06`. */
const DEMS_CODE = /e[A-Z][A-Za-z]*\.\d+/g;

/** Element codes the NEMSIS form in this app collects. */
export function implementedElementCodes(): Set<string> {
  const codes = new Set<string>();
  for (const section of getFormSections()) {
    for (const element of section.elements) codes.add(element.code);
  }
  return codes;
}

/** The DEMS element codes a quality indicator field maps to, if any. */
export function demsCodesFor(mapping: string): string[] {
  return mapping.match(DEMS_CODE) ?? [];
}

/** Every DEMS section referenced anywhere in the quality indicator corpus. */
function referencedSections(): Map<string, { qualityFields: number; modules: Set<string> }> {
  const sections = new Map<string, { qualityFields: number; modules: Set<string> }>();
  for (const module of listQualityIndicatorModules()) {
    for (const field of module.fields) {
      for (const section of new Set(demsCodesFor(field.demsMapping).map(code => code.split('.')[0]!))) {
        const entry = sections.get(section) ?? { qualityFields: 0, modules: new Set<string>() };
        entry.qualityFields += 1;
        entry.modules.add(module.id);
        sections.set(section, entry);
      }
    }
  }
  return sections;
}

export interface SectionCoverage {
  /** DEMS section id, e.g. `eVitals`. */
  section: string;
  /** True when the app's NEMSIS form collects this section. */
  implemented: boolean;
  /** Elements captured by the app for this section. */
  implementedElements: number;
  /** Quality indicator fields that reference this section. */
  qualityFields: number;
  /** Modules that reference this section. */
  modules: string[];
}

/**
 * Sections the quality indicator regime relies on, ordered so the largest gaps
 * come first: unimplemented sections sorted by how many quality fields depend
 * on them, then the ones already captured.
 */
export function sectionCoverage(): SectionCoverage[] {
  const implemented = implementedElementCodes();
  const implementedBySection = new Map<string, number>();
  for (const code of implemented) {
    const section = code.split('.')[0]!;
    implementedBySection.set(section, (implementedBySection.get(section) ?? 0) + 1);
  }

  return [...referencedSections().entries()]
    .map(([section, entry]) => ({
      section,
      implemented: implementedBySection.has(section),
      implementedElements: implementedBySection.get(section) ?? 0,
      qualityFields: entry.qualityFields,
      modules: [...entry.modules].sort(),
    }))
    .sort(
      (a, b) =>
        Number(a.implemented) - Number(b.implemented) ||
        b.qualityFields - a.qualityFields ||
        a.section.localeCompare(b.section)
    );
}

/** True when every field a rule reads maps to an element the form collects. */
function ruleIsBackedByTheForm(
  rule: QualityIndicatorRule,
  module: QualityIndicatorModule,
  implemented: Set<string>
): boolean {
  const fields = module.fields.filter(field => demsCodesFor(field.demsMapping).length > 0);
  const fieldMap = new Map(fields.map(field => [field.id, field]));
  return parseQualityConditions(rule.trigger).conditions.every(condition => {
    const field = fieldMap.get(condition.field);
    if (!field) return false;
    return demsCodesFor(field.demsMapping).some(code => implemented.has(code));
  });
}

export interface EnforcementReadiness {
  totalRules: number;
  /** Rules whose prose the parser fully understands. */
  machineReadable: number;
  /** Rules that are readable *and* backed by fields the form collects. */
  enforceable: number;
  /** DEMS sections the regime needs that the form does not collect. */
  missingSections: string[];
}

/**
 * Rule enforcement readiness for the whole corpus.
 *
 * `machineReadable` says the sentence can be evaluated; `enforceable` also
 * requires the values to exist. Keeping the two apart stops the catalogue from
 * looking compliant when the form simply has nowhere to record the answer.
 */
export function enforcementReadiness(): EnforcementReadiness {
  const implemented = implementedElementCodes();
  const modules = listQualityIndicatorModules();
  const allRules = modules.flatMap(module =>
    module.rules.map(rule => ({ rule, module }))
  );

  return {
    totalRules: allRules.length,
    machineReadable: allRules.filter(
      ({ rule }) => parseQualityConditions(rule.trigger).complete
    ).length,
    enforceable: allRules.filter(
      ({ rule, module }) =>
        parseQualityConditions(rule.trigger).complete &&
        ruleIsBackedByTheForm(rule, module, implemented)
    ).length,
    missingSections: sectionCoverage()
      .filter(entry => !entry.implemented)
      .map(entry => entry.section),
  };
}
