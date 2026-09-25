import { z } from 'zod';
import { ulid } from 'ulid';
import {
  Patient,
  Encounter,
  Observation,
  MedicationAdministration,
  Procedure,
  Condition,
  Reference,
  CodeableConcept,
  Period,
  Identifier
} from '@prehospital-epr/core';
import { createBundle, type Bundle } from '@prehospital-epr/fhir';

type DiagnosticReport = { resourceType: 'DiagnosticReport'; id: string };
type DocumentReference = { resourceType: 'DocumentReference'; id: string };

const ReferenceSchema = z.object({
  reference: z.string(),
  type: z.string().optional(),
  identifier: z.object({
    system: z.string().url(),
    value: z.string(),
  }).optional(),
  display: z.string().optional(),
});

export const HandoffFormatSchema = z.enum([
  'IMIST-AMBO',
  'SBAR',
  'MIST',
  'CUSTOM',
  'FHIR-BUNDLE',
  'CDA-CCD',
  'HL7-V2',
]);

export type HandoffFormat = z.infer<typeof HandoffFormatSchema>;

export const HandoffStatusSchema = z.enum([
  'draft',
  'pending',
  'sent',
  'acknowledged',
  'received',
  'rejected',
  'failed',
]);

export const HandoffPrioritySchema = z.enum([
  'routine',
  'urgent',
  'emergent',
  'critical',
]);

const HandoffBaseSchema = z.object({
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  encounterId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  patientId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  format: HandoffFormatSchema,
  status: HandoffStatusSchema,
  priority: HandoffPrioritySchema,
  fromFacility: ReferenceSchema,
  toFacility: ReferenceSchema,
  fromProvider: ReferenceSchema,
  toProvider: ReferenceSchema.optional(),
  createdAt: z.string().datetime(),
  sentAt: z.string().datetime().optional(),
  acknowledgedAt: z.string().datetime().optional(),
  content: z.string(),
  structuredData: z.any().optional(),
  attachments: z.array(ReferenceSchema).optional(),
  metadata: z.object({
    transportMode: z.string().optional(),
    transportUnit: z.string().optional(),
    estimatedArrival: z.string().datetime().optional(),
    actualArrival: z.string().datetime().optional(),
    receivingUnit: z.string().optional(),
    receivingProvider: z.string().optional(),
  }).optional(),
});

export type Handoff = z.infer<typeof HandoffBaseSchema>;

export class HandoffService {
  private handoffs: Map<string, Handoff> = new Map();

  // Generate IMIST-AMBO formatted handoff
  generateIMISTAMBO(data: {
    encounter: Encounter;
    patient: Patient;
    vitalSigns: Observation[];
    medications: MedicationAdministration[];
    procedures: Procedure[];
    conditions: Condition[];
    assessment: string;
    plan: string;
  }): string {
    const { encounter, patient, vitalSigns, medications, procedures, conditions, assessment, plan } = data;
    
    const latestVitals = vitalSigns[vitalSigns.length - 1];
    const gcs = this.extractGCS(latestVitals);
    const vitalsText = this.formatVitals(latestVitals);
    
    const patientName = this.getPatientName(patient);
    const patientAge = this.calculateAge(patient.birthDate);
    const patientSex = patient.gender?.charAt(0).toUpperCase() || 'U';
    
    return `
=== IMIST-AMBO HANDOFF ===
IDENTITY: ${patientName}, ${patientAge}y ${patientSex}
MECHANISM: ${this.getMechanism(encounter)}
INJURIES: ${this.formatConditions(conditions)}
SIGNS: ${vitalsText} GCS: ${gcs}
TREATMENT: ${this.formatTreatments(medications, procedures)}
ALLERGIES: ${this.getAllergies(patient)}
MEDICATIONS: ${this.getCurrentMeds(patient)}
BACKGROUND: ${this.getBackground(patient)}
OTHER: ${assessment}

PLAN: ${plan}
ETA: ${this.getETA(encounter)}
UNIT: ${this.getUnit(encounter)}
=========================
`.trim();
  }

  // Generate SBAR formatted handoff
  generateSBAR(data: {
    encounter: Encounter;
    patient: Patient;
    vitalSigns: Observation[];
    medications: MedicationAdministration[];
    procedures: Procedure[];
    conditions: Condition[];
    assessment: string;
    recommendation: string;
  }): string {
    const { encounter, patient, vitalSigns, medications, procedures, conditions, assessment, recommendation } = data;
    
    const latestVitals = vitalSigns[vitalSigns.length - 1];
    const vitalsText = this.formatVitals(latestVitals);
    const patientName = this.getPatientName(patient);
    const patientAge = this.calculateAge(patient.birthDate);
    
    return `
=== SBAR HANDOFF ===
SITUATION: ${patientName}, ${patientAge}y ${patient.gender?.charAt(0).toUpperCase()}, ${this.getMechanism(encounter)}. Current: ${vitalsText}
BACKGROUND: ${this.getBackground(patient)}. Allergies: ${this.getAllergies(patient)}. Current Meds: ${this.getCurrentMeds(patient)}
ASSESSMENT: ${assessment}. Injuries: ${this.formatConditions(conditions)}. Treatments: ${this.formatTreatments(medications, procedures)}
RECOMMENDATION: ${recommendation}. ETA: ${this.getETA(encounter)}
====================
`.trim();
  }

  // Generate FHIR Bundle for electronic handoff
  generateFHIRBundle(data: {
    encounter: Encounter;
    patient: Patient;
    vitalSigns: Observation[];
    medications: MedicationAdministration[];
    procedures: Procedure[];
    conditions: Condition[];
    diagnosticReports: DiagnosticReport[];
    documents: DocumentReference[];
    assessment: string;
    plan: string;
    fromProvider: Reference;
    toFacility: Reference;
  }): Bundle {
    const { encounter, patient, vitalSigns, medications, procedures, conditions, diagnosticReports, documents, assessment, plan, fromProvider, toFacility } = data;

    const entries = [
      { fullUrl: `urn:uuid:${encounter.id}`, resource: encounter },
      { fullUrl: `urn:uuid:${patient.id}`, resource: patient },
      ...vitalSigns.map((v, i) => ({ fullUrl: `urn:uuid:${v.id}`, resource: v })),
      ...medications.map((m, i) => ({ fullUrl: `urn:uuid:${m.id}`, resource: m })),
      ...procedures.map((p, i) => ({ fullUrl: `urn:uuid:${p.id}`, resource: p })),
      ...conditions.map((c, i) => ({ fullUrl: `urn:uuid:${c.id}`, resource: c })),
      ...diagnosticReports.map((d, i) => ({ fullUrl: `urn:uuid:${d.id}`, resource: d })),
      ...documents.map((d, i) => ({ fullUrl: `urn:uuid:${d.id}`, resource: d })),
    ];

    // Create handoff composition document
    const handoffDoc: DocumentReference = {
      resourceType: 'DocumentReference',
      id: ulid(),
      status: 'current',
      type: {
        coding: [{
          system: 'http://loinc.org',
          code: '57764-2',
          display: 'Emergency medical services transport summary',
        }],
      },
      category: [{
        coding: [{
          system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
          code: 'clinical-note',
          display: 'Clinical Note',
        }],
      }],
      subject: { reference: `Patient/${patient.id}` },
      encounter: { reference: `Encounter/${encounter.id}` },
      date: new Date().toISOString(),
      author: [fromProvider],
      custodian: toFacility,
      content: [{
        attachment: {
          contentType: 'text/plain',
          data: Buffer.from(this.generateIMISTAMBO({ encounter, patient, vitalSigns, medications, procedures, conditions, assessment, plan })).toString('base64'),
          title: 'EMS Handoff Report',
        },
      }],
      context: {
        encounter: [{ reference: `Encounter/${encounter.id}` }],
        period: encounter.period,
        facilityType: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: 'ER',
            display: 'Emergency Room',
          }],
        },
      },
      meta: {
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference'],
      },
    } as any;

    entries.unshift({ fullUrl: `urn:uuid:${handoffDoc.id}`, resource: handoffDoc });

    return createBundle('document', entries);
  }

  // Create handoff record
  async createHandoff(data: {
    encounterId: string;
    patientId: string;
    format: z.infer<typeof HandoffFormatSchema>;
    priority: z.infer<typeof HandoffPrioritySchema>;
    fromFacility: z.infer<typeof ReferenceSchema>;
    toFacility: z.infer<typeof ReferenceSchema>;
    fromProvider: z.infer<typeof ReferenceSchema>;
    toProvider?: z.infer<typeof ReferenceSchema>;
    content: string;
    structuredData?: any;
    attachments?: z.infer<typeof ReferenceSchema>[];
    metadata?: Handoff['metadata'];
  }): Promise<Handoff> {
    const handoff: Handoff = {
      ...data,
      id: ulid(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    const validated = HandoffBaseSchema.parse(handoff);
    this.handoffs.set(validated.id, validated);
    return validated;
  }

  // Send handoff (would integrate with messaging system)
  async sendHandoff(handoffId: string): Promise<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) throw new Error('Handoff not found');

    const updated: Handoff = {
      ...handoff,
      status: 'sent',
      sentAt: new Date().toISOString(),
    };

    this.handoffs.set(handoffId, updated);
    
    // In production: send via Direct Messaging, FHIR Messaging, HL7 v2, etc.
    console.log(`[HANDOFF] Sent handoff ${handoffId} to ${handoff.toFacility.display}`);
    
    return updated;
  }

  // Acknowledge handoff receipt
  async acknowledgeHandoff(handoffId: string, acknowledgedBy: string): Promise<Handoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) throw new Error('Handoff not found');

    const updated: Handoff = {
      ...handoff,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      metadata: {
        ...handoff.metadata,
        receivingProvider: acknowledgedBy,
      },
    };

    this.handoffs.set(handoffId, updated);
    return updated;
  }

  // Get handoff by ID
  getHandoff(handoffId: string): Handoff | undefined {
    return this.handoffs.get(handoffId);
  }

  // Get handoffs for encounter
  getHandoffsForEncounter(encounterId: string): Handoff[] {
    return Array.from(this.handoffs.values()).filter(h => h.encounterId === encounterId);
  }

  // Get handoffs for patient
  getHandoffsForPatient(patientId: string): Handoff[] {
    return Array.from(this.handoffs.values()).filter(h => h.patientId === patientId);
  }

  // Generate CDA/CCD document
  generateCDA(data: {
    encounter: Encounter;
    patient: Patient;
    vitalSigns: Observation[];
    medications: MedicationAdministration[];
    procedures: Procedure[];
    conditions: Condition[];
    assessment: string;
    plan: string;
  }): string {
    // Simplified CDA XML generation - in production would use proper CDA library
    const { encounter, patient, vitalSigns, medications, procedures, conditions, assessment, plan } = data;
    
    const patientName = this.getPatientName(patient);
    const patientAge = this.calculateAge(patient.birthDate);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1"/>
  <id root="${encounter.id}"/>
  <code code="57764-2" codeSystem="2.16.840.1.113883.6.1" displayName="EMS transport summary"/>
  <title>EMS Patient Handoff Report</title>
  <effectiveTime value="${new Date().toISOString().replace(/[-:T.]/g, '').slice(0,14)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <recordTarget>
    <patientRole>
      <id root="${patient.id}"/>
      <patient>
        <name><given>${patient.name?.[0]?.given?.[0] || ''}</given><family>${patient.name?.[0]?.family || ''}</family></name>
        <administrativeGenderCode code="${patient.gender || 'UNK'}"/>
        <birthTime value="${patient.birthDate?.replace(/-/g, '') || ''}"/>
      </patient>
    </patientRole>
  </recordTarget>
  <component>
    <structuredBody>
      <component>
        <section>
          <code code="29762-2" codeSystem="2.16.840.1.113883.6.1" displayName="Social History"/>
          <text>${assessment}</text>
        </section>
      </component>
      <component>
        <section>
          <code code="47420-2" codeSystem="2.16.840.1.113883.6.1" displayName="Plan of Care"/>
          <text>${plan}</text>
        </section>
      </component>
    </structuredBody>
  </component>
</ClinicalDocument>`;
  }

  // Helper methods
  private extractGCS(vitals?: Observation): string {
    if (!vitals?.component) return 'Unknown';
    const gcsComp = vitals.component.find(c => 
      c.code.coding?.some(cd => cd.code === '9269-1' || cd.display?.includes('Glasgow'))
    );
    if (gcsComp?.valueQuantity) {
      return gcsComp.valueQuantity.value.toString();
    }
    return 'Unknown';
  }

  private formatVitals(vitals?: Observation): string {
    if (!vitals) return 'No vitals recorded';
    
    const components = vitals.component || [];
    const parts: string[] = [];
    
    for (const comp of components) {
      const code = comp.code.coding?.[0]?.code;
      const value = comp.valueQuantity?.value;
      const unit = comp.valueQuantity?.unit;
      
      if (code === '8480-6' && value) parts.push(`SBP ${value}${unit || 'mmHg'}`);
      if (code === '8462-4' && value) parts.push(`DBP ${value}${unit || 'mmHg'}`);
      if (code === '8867-4' && value) parts.push(`HR ${value}${unit || '/min'}`);
      if (code === '9279-1' && value) parts.push(`RR ${value}${unit || '/min'}`);
      if (code === '2708-6' && value) parts.push(`SpO2 ${value}%`);
      if (code === '8310-5' && value) parts.push(`Temp ${value}${unit || '°C'}`);
      if (code === '9269-1' && value) parts.push(`GCS ${value}`);
    }
    
    return parts.join(', ') || 'No vital signs';
  }

  private formatConditions(conditions: Condition[]): string {
    if (!conditions.length) return 'None documented';
    return conditions.map(c => c.code.text || c.code.coding?.[0]?.display || 'Unknown').join('; ');
  }

  private formatTreatments(
    medications: MedicationAdministration[],
    procedures: Procedure[]
  ): string {
    const parts: string[] = [];
    
    if (medications.length) {
      parts.push('Meds: ' + medications.map(m => 
        `${m.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown'} ${m.dosage?.doseQuantity?.value || ''}${m.dosage?.doseQuantity?.unit || ''} ${m.dosage?.route?.coding?.[0]?.display || ''}`
      ).join('; '));
    }
    
    if (procedures.length) {
      parts.push('Procedures: ' + procedures.map(p => 
        p.code.coding?.[0]?.display || p.code.text || 'Unknown'
      ).join('; '));
    }
    
    return parts.join(' | ') || 'None';
  }

  private getPatientName(patient: Patient): string {
    const name = patient.name?.[0];
    return `${name?.given?.[0] || ''} ${name?.family || ''}`.trim() || 'Unknown';
  }

  private calculateAge(birthDate?: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  private getMechanism(encounter: Encounter): string {
    const ext = encounter.extension?.find(e => e.url.includes('mechanism'));
    return ext?.valueString || 'Unknown mechanism';
  }

  private getAllergies(patient: Patient): string {
    // Would query AllergyIntolerance resources
    return 'NKDA';
  }

  private getCurrentMeds(patient: Patient): string {
    // Would query MedicationStatement resources
    return 'None documented';
  }

  private getBackground(patient: Patient): string {
    // Would query Condition resources for past medical history
    return 'No significant PMH documented';
  }

  private getETA(encounter: Encounter): string {
    const transport = encounter.extension?.find(e => e.url.includes('transport'));
    return transport?.valueString || 'Unknown';
  }

  private getUnit(encounter: Encounter): string {
    const unit = encounter.participant?.find(p => 
      p.type?.some(t => t.coding?.some(c => c.code === 'EVS'))
    );
    return unit?.individual?.display || 'Unknown unit';
  }
}

export const handoffService = new HandoffService();