import { z } from 'zod';
import { ulid } from 'ulid';
import type { Observation } from '@prehospital-epr/core';
import {
  Condition,
  Encounter,
  Patient,
  CodeableConcept,
  Quantity,
} from '@prehospital-epr/core';

export const TriageSystemSchema = z.enum([
  'START',      // Simple Triage and Rapid Treatment
  'JUMPSTART',  // Pediatric START
  'ESI',        // Emergency Severity Index
  'MTS',        // Manchester Triage System
  'CTAS',       // Canadian Triage and Acuity Scale
  'SALT',       // Sort, Assess, Lifesaving interventions, Treatment/Transport
  'CUSTOM',
]);

export const TriageCategorySchema = z.enum([
  'immediate',      // Red - Immediate
  'delayed',        // Yellow - Delayed
  'minimal',        // Green - Minimal/Walking wounded
  'expectant',      // Gray - Expectant
  'deceased',       // Black - Deceased
  '1', '2', '3', '4', '5', // ESI levels
]);

export const TriageAssessmentSchema = z.object({
  patientId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  encounterId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  system: TriageSystemSchema,
  performedBy: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  performedAt: z.string().datetime(),
  
  // START/JUMPSTART criteria
  walking: z.boolean().optional(),
  breathing: z.boolean().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  pulse: z.boolean().optional(),
  heartRate: z.number().int().positive().optional(),
  capillaryRefill: z.number().optional(),
  mentalStatus: z.enum(['alert', 'verbal', 'pain', 'unresponsive', 'A', 'V', 'P', 'U']).optional(),
  gcs: z.number().int().min(3).max(15).optional(),
  
  // ESI criteria
  acuityLevel: z.number().int().min(1).max(5).optional(),
  resourcePrediction: z.number().int().min(0).optional(),
  vitalSignsAbnormal: z.boolean().optional(),
  
  // MTS criteria
  discriminator: z.string().optional(),
  flowchart: z.string().optional(),
  
  // Result
  category: TriageCategorySchema,
  score: z.number().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type TriageAssessment = z.infer<typeof TriageAssessmentSchema>;

export const TriageProtocolSchema = z.object({
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  name: z.string(),
  system: TriageSystemSchema,
  version: z.string(),
  description: z.string(),
  criteria: z.array(z.object({
    name: z.string(),
    condition: z.string(), // Expression to evaluate
    category: TriageCategorySchema,
    priority: z.number().int(),
  })),
  ageGroups: z.array(z.enum(['adult', 'pediatric', 'neonate', 'geriatric'])).optional(),
  active: z.boolean().default(true),
});

export type TriageProtocol = z.infer<typeof TriageProtocolSchema>;

export class TriageService {
  private protocols: Map<string, TriageProtocol> = new Map();
  private assessments: Map<string, TriageAssessment> = new Map(); // Key: patientId:encounterId

  constructor() {
    this.initializeDefaultProtocols();
  }

  private initializeDefaultProtocols(): void {
    // START Protocol
    this.protocols.set('START-v1', {
      id: ulid(),
      name: 'Simple Triage and Rapid Treatment (START)',
      system: 'START',
      version: '1.0',
      description: 'Adult mass casualty triage algorithm',
      criteria: [
        { name: 'Deceased', condition: '!breathing && !pulse', category: 'deceased', priority: 1 },
        { name: 'Immediate - Airway', condition: '!breathing', category: 'immediate', priority: 2 },
        { name: 'Immediate - Respiratory', condition: 'respiratoryRate < 10 || respiratoryRate > 29', category: 'immediate', priority: 3 },
        { name: 'Immediate - Circulation', condition: '!pulse || capillaryRefill > 2', category: 'immediate', priority: 4 },
        { name: 'Immediate - Mental Status', condition: 'mentalStatus === "unresponsive" || mentalStatus === "U"', category: 'immediate', priority: 5 },
        { name: 'Delayed', condition: 'true', category: 'delayed', priority: 6 }, // Default
      ],
      ageGroups: ['adult'],
      active: true,
    });

    // JUMPSTART Protocol (Pediatric)
    this.protocols.set('JUMPSTART-v1', {
      id: ulid(),
      name: 'Pediatric START (JumpSTART)',
      system: 'JUMPSTART',
      version: '1.0',
      description: 'Pediatric mass casualty triage algorithm (age < 8 or < 100 lbs)',
      criteria: [
        { name: 'Deceased', condition: '!breathing && !pulse', category: 'deceased', priority: 1 },
        { name: 'Immediate - Apneic with Pulse', condition: '!breathing && pulse', category: 'immediate', priority: 2 },
        { name: 'Immediate - Respiratory Rate', condition: 'respiratoryRate < 15 || respiratoryRate > 45', category: 'immediate', priority: 3 },
        { name: 'Immediate - Pulse', condition: '!pulse', category: 'immediate', priority: 4 },
        { name: 'Immediate - Mental Status', condition: 'mentalStatus === "unresponsive" || mentalStatus === "U"', category: 'immediate', priority: 5 },
        { name: 'Delayed', condition: 'true', category: 'delayed', priority: 6 },
      ],
      ageGroups: ['pediatric'],
      active: true,
    });

    // ESI Protocol
    this.protocols.set('ESI-v1', {
      id: ulid(),
      name: 'Emergency Severity Index (ESI)',
      system: 'ESI',
      version: '4.0',
      description: 'Five-level ED triage algorithm',
      criteria: [
        { name: 'Level 1 - Resuscitation', condition: 'requiresImmediateLifeSavingIntervention', category: '1', priority: 1 },
        { name: 'Level 2 - Emergent', condition: 'highRiskSituation || confused || severePain', category: '2', priority: 2 },
        { name: 'Level 3 - Urgent', condition: 'resourcePrediction >= 2', category: '3', priority: 3 },
        { name: 'Level 4 - Less Urgent', condition: 'resourcePrediction === 1', category: '4', priority: 4 },
        { name: 'Level 5 - Non-Urgent', condition: 'resourcePrediction === 0', category: '5', priority: 5 },
      ],
      ageGroups: ['adult', 'pediatric', 'geriatric'],
      active: true,
    });

    // CTAS Protocol
    this.protocols.set('CTAS-v1', {
      id: ulid(),
      name: 'Canadian Triage and Acuity Scale (CTAS)',
      system: 'CTAS',
      version: '1.0',
      description: 'Five-level Canadian ED triage scale',
      criteria: [
        { name: 'Level 1 - Resuscitation', condition: 'requiresResuscitation', category: '1', priority: 1 },
        { name: 'Level 2 - Emergent', condition: 'highRiskOrSevereDistress', category: '2', priority: 2 },
        { name: 'Level 3 - Urgent', condition: 'moderateDistressOrProgressive', category: '3', priority: 3 },
        { name: 'Level 4 - Less Urgent', condition: 'minorDistressOrStable', category: '4', priority: 4 },
        { name: 'Level 5 - Non-Urgent', condition: 'noDistressOrMinor', category: '5', priority: 5 },
      ],
      ageGroups: ['adult', 'pediatric', 'geriatric'],
      active: true,
    });
  }

  // Perform triage assessment
  async performTriage(assessment: Omit<TriageAssessment, 'id' | 'category'> & { category?: TriageAssessment['category'] }): Promise<TriageAssessment> {
    // Auto-determine category if not provided
    let category = assessment.category;
    
    if (!category) {
      category = this.calculateCategory(assessment);
    }

    const triageAssessment: TriageAssessment = {
      ...assessment,
      category,
    } as TriageAssessment;

    const validated = TriageAssessmentSchema.parse(triageAssessment);
    const key = `${assessment.patientId}:${assessment.encounterId}`;
    this.assessments.set(key, validated);

    return validated;
  }

  // Calculate triage category based on protocol
  private calculateCategory(assessment: Partial<TriageAssessment>): z.infer<typeof TriageCategorySchema> {
    const protocol = this.getProtocol(assessment.system || 'START');
    if (!protocol) return 'delayed';

    for (const criterion of protocol.criteria.sort((a, b) => a.priority - b.priority)) {
      if (this.evaluateCriterion(criterion.condition, assessment)) {
        return criterion.category;
      }
    }

    return 'delayed'; // Default
  }

  private evaluateCriterion(condition: string, assessment: Partial<TriageAssessment>): boolean {
    // Simple expression evaluation - in production would use a proper expression evaluator
    try {
      // Replace variables with values
      let expr = condition;
      for (const [key, value] of Object.entries(assessment)) {
        if (value !== undefined) {
          const val = typeof value === 'string' ? `'${value}'` : value;
          expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
        }
      }
      
      // Handle boolean logic
      expr = expr.replace(/&&/g, '&&').replace(/\|\|/g, '||');
      
      // Evaluate (NOTE: In production, use a safe expression evaluator like expr-eval)
      // This is a simplified example
      return Function('"use strict"; return (' + expr + ')')();
    } catch {
      return false;
    }
  }

  // Get protocol by system
  getProtocol(system: z.infer<typeof TriageSystemSchema>): TriageProtocol | undefined {
    for (const protocol of this.protocols.values()) {
      if (protocol.system === system && protocol.active) {
        return protocol;
      }
    }
    return undefined;
  }

  // Get all protocols
  getAllProtocols(): TriageProtocol[] {
    return Array.from(this.protocols.values()).filter(p => p.active);
  }

  // Add custom protocol
  addProtocol(protocol: Omit<TriageProtocol, 'id'>): TriageProtocol {
    const newProtocol: TriageProtocol = {
      ...protocol,
      id: ulid(),
    };
    this.protocols.set(newProtocol.id, newProtocol);
    return newProtocol;
  }

  // Get triage assessment for patient/encounter
  getAssessment(patientId: string, encounterId: string): TriageAssessment | undefined {
    return this.assessments.get(`${patientId}:${encounterId}`);
  }

  // Get all assessments for encounter
  getAssessmentsForEncounter(encounterId: string): TriageAssessment[] {
    return Array.from(this.assessments.values()).filter(a => a.encounterId === encounterId);
  }

  // Get triage tag color for UI
  getCategoryColor(category: z.infer<typeof TriageCategorySchema>): string {
    const colors: Record<string, string> = {
      immediate: '#CC0000',    // Red
      delayed: '#FF9900',      // Yellow
      minimal: '#009944',      // Green
      expectant: '#666666',    // Gray
      deceased: '#000000',     // Black
      '1': '#CC0000',          // ESI Level 1 - Red
      '2': '#FF3300',          // ESI Level 2 - Orange-Red
      '3': '#FF9900',          // ESI Level 3 - Yellow
      '4': '#009944',          // ESI Level 4 - Green
      '5': '#0066CC',          // ESI Level 5 - Blue
    };
    return colors[category] || '#888888';
  }

  // Get category label for display
  getCategoryLabel(category: z.infer<typeof TriageCategorySchema>): string {
    const labels: Record<string, string> = {
      immediate: 'Immediate (Red)',
      delayed: 'Delayed (Yellow)',
      minimal: 'Minimal (Green)',
      expectant: 'Expectant (Gray)',
      deceased: 'Deceased (Black)',
      '1': 'Level 1 - Resuscitation',
      '2': 'Level 2 - Emergent',
      '3': 'Level 3 - Urgent',
      '4': 'Level 4 - Less Urgent',
      '5': 'Level 5 - Non-Urgent',
    };
    return labels[category] || category;
  }

  // Generate triage tag (for physical tag printing)
  generateTriageTag(assessment: TriageAssessment): {
    front: string;
    back: string;
    barcode: string;
  } {
    const patientName = 'Patient'; // Would get from patient resource
    const category = assessment.category;
    const color = this.getCategoryColor(category);
    
    return {
      front: `
=== TRIAGE TAG ===
${this.getCategoryLabel(category)}
System: ${assessment.system}
Time: ${new Date(assessment.performedAt).toLocaleTimeString()}
Provider: ${assessment.performedBy}
==================
`.trim(),
      back: `
VITALS:
RR: ${assessment.respiratoryRate || 'N/A'}
HR: ${assessment.heartRate || 'N/A'}
GCS: ${assessment.gcs || 'N/A'}
Mental: ${assessment.mentalStatus || 'N/A'}

NOTES:
${assessment.notes || 'None'}
`.trim(),
      barcode: `TRIAGE:${assessment.patientId}:${assessment.encounterId}:${category}:${assessment.performedAt}`,
    };
  }

  // Mass casualty triage support
  async performMassCasualtyTriage(patients: Array<{
    patientId: string;
    encounterId: string;
    vitals: Observation[];
    ageGroup: 'adult' | 'pediatric';
  }>): Promise<TriageAssessment[]> {
    const results: TriageAssessment[] = [];

    for (const patient of patients) {
      const latestVitals = patient.vitals[patient.vitals.length - 1];
      
      let system: z.infer<typeof TriageSystemSchema> = 'START';
      if (patient.ageGroup === 'pediatric') system = 'JUMPSTART';

      // Extract vital signs for triage criteria
      const rr = this.extractRespiratoryRate(latestVitals);
      const hr = this.extractHeartRate(latestVitals);
      const gcs = this.extractGCS(latestVitals);
      const capillaryRefill = this.extractCapillaryRefill(latestVitals);

      const assessment = await this.performTriage({
        patientId: patient.patientId,
        encounterId: patient.encounterId,
        system,
        performedBy: 'TRIAGE_OFFICER',
        performedAt: new Date().toISOString(),
        walking: false, // Would be assessed
        breathing: rr ? rr > 0 : false,
        respiratoryRate: rr,
        pulse: hr ? hr > 0 : false,
        heartRate: hr,
        capillaryRefill,
        mentalStatus: gcs ? (gcs <= 8 ? 'unresponsive' : gcs <= 13 ? 'pain' : gcs <= 14 ? 'verbal' : 'alert') : undefined,
        gcs,
        notes: 'Mass casualty triage',
      });

      results.push(assessment);
    }

    return results;
  }

  // Vital sign extraction helpers
  private extractRespiratoryRate(vitals?: Observation): number | undefined {
    if (!vitals?.component) return undefined;
    const comp = vitals.component.find(c => 
      c.code.coding?.some(cd => cd.code === '9279-1' || cd.display?.toLowerCase().includes('respiratory'))
    );
    return comp?.valueQuantity?.value;
  }

  private extractHeartRate(vitals?: Observation): number | undefined {
    if (!vitals?.component) return undefined;
    const comp = vitals.component.find(c => 
      c.code.coding?.some(cd => cd.code === '8867-4' || cd.display?.toLowerCase().includes('heart rate'))
    );
    return comp?.valueQuantity?.value;
  }

  private extractGCS(vitals?: Observation): number | undefined {
    if (!vitals?.component) return undefined;
    const comp = vitals.component.find(c => 
      c.code.coding?.some(cd => cd.code === '9269-1' || cd.display?.toLowerCase().includes('glasgow'))
    );
    return comp?.valueQuantity?.value;
  }

  private extractCapillaryRefill(vitals?: Observation): number | undefined {
    if (!vitals?.component) return undefined;
    const comp = vitals.component.find(c => 
      c.code.coding?.some(cd => cd.display?.toLowerCase().includes('capillary'))
    );
    return comp?.valueQuantity?.value;
  }
}

export const triageService = new TriageService();