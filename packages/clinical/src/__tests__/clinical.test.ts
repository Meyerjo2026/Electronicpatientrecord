import { ulid } from 'ulid';
import {
  TriageService,
  HandoffService,
  DeviceService,
} from '../index';

const id = (): string => ulid() as string;

describe('TriageService', () => {
  let triage: TriageService;

  beforeEach(() => {
    triage = new TriageService();
  });

  test('assigns the immediate category when not breathing but has a pulse', async () => {
    const assessment = await triage.performTriage({
      patientId: id(),
      encounterId: id(),
      system: 'START',
      performedBy: id(),
      performedAt: new Date().toISOString(),
      breathing: false,
      pulse: true,
    });
    expect(assessment.category).toBe('immediate');
  });

  test('assigns the deceased category when not breathing and no pulse', async () => {
    const assessment = await triage.performTriage({
      patientId: id(),
      encounterId: id(),
      system: 'START',
      performedBy: id(),
      performedAt: new Date().toISOString(),
      breathing: false,
      pulse: false,
    });
    expect(assessment.category).toBe('deceased');
  });

  test('retrieves assessments by patient and encounter', async () => {
    const patientId = id();
    const encounterId = id();
    await triage.performTriage({
      patientId,
      encounterId,
      system: 'START',
      performedBy: id(),
      performedAt: new Date().toISOString(),
      breathing: true,
      pulse: true,
    });
    expect(triage.getAssessment(patientId, encounterId)).toBeDefined();
    expect(triage.getAssessmentsForEncounter(encounterId).length).toBe(1);
  });

  test('exposes category labels and colors', () => {
    expect(triage.getCategoryLabel('immediate')).toMatch(/Immediate/i);
    expect(triage.getCategoryColor('deceased')).toBeDefined();
    expect(triage.getCategoryColor('immediate')).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('adds custom protocols', () => {
    const protocol = triage.addProtocol({
      name: 'Custom',
      system: 'START',
      version: '2.0',
      description: 'Test protocol',
      criteria: [{ name: 'All', condition: 'true', category: 'delayed', priority: 1 }],
      active: true,
    });
    expect(protocol.id).toBeDefined();
    expect(triage.getAllProtocols().some(p => p.id === protocol.id)).toBe(true);
  });

  test('generates a triage tag for an assessment', async () => {
    const assessment = await triage.performTriage({
      patientId: id(),
      encounterId: id(),
      system: 'START',
      performedBy: id(),
      performedAt: new Date().toISOString(),
      breathing: false,
      pulse: false,
    });
    const tag = triage.generateTriageTag(assessment);
    expect(tag.barcode).toContain(`TRIAGE:${assessment.patientId}`);
    expect(tag.front).toContain('TRIAGE TAG');
  });
});

describe('HandoffService', () => {
  let handoffs: HandoffService;

  const patient: any = {
    resourceType: 'Patient',
    id: id(),
    name: [{ family: 'Snow', given: ['Jon'] }],
    gender: 'male',
    birthDate: '1980-05-15',
  };

  const encounter: any = {
    resourceType: 'Encounter',
    id: id(),
    status: 'triaged',
    subject: { reference: `Patient/${patient.id}` },
  };

  beforeEach(() => {
    handoffs = new HandoffService();
  });

  test('generates an IMIST-AMBO handoff containing identity and assessment', () => {
    const output = handoffs.generateIMISTAMBO({
      encounter,
      patient,
      vitalSigns: [],
      medications: [],
      procedures: [],
      conditions: [],
      assessment: 'Chest pain, radiating to left arm',
      plan: 'Transport rapid to STEMI center',
    });
    expect(output).toContain('Jon Snow');
    expect(output).toContain('Chest pain, radiating to left arm');
    expect(output).toContain('IMIST-AMBO HANDOFF');
  });

  test('generates an SBAR handoff', () => {
    const output = handoffs.generateSBAR({
      encounter,
      patient,
      vitalSigns: [],
      medications: [],
      procedures: [],
      conditions: [],
      assessment: 'Suspected STEMI',
      recommendation: '12-lead ECG and ASA',
    });
    expect(output).toContain('SBAR HANDOFF');
    expect(output).toContain('Suspected STEMI');
  });

  test('generates a FHIR document bundle with ordered entries', () => {
    const bundle = handoffs.generateFHIRBundle({
      encounter,
      patient,
      vitalSigns: [],
      medications: [],
      procedures: [],
      conditions: [],
      diagnosticReports: [],
      documents: [],
      assessment: 'a',
      plan: 'p',
      fromProvider: { reference: `Practitioner/${id()}` },
      toFacility: { reference: 'Organization/valley-hosp' },
    });
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('document');
  });

  test('creates, sends, and acknowledges a handoff', async () => {
    const handoff = await handoffs.createHandoff({
      encounterId: id(),
      patientId: patient.id,
      format: 'IMIST-AMBO',
      priority: 'critical',
      fromFacility: { reference: 'Organization/ems-alice' },
      toFacility: { reference: 'Organization/valley-hosp' },
      fromProvider: { reference: `Practitioner/${id()}` },
      content: 'Full handoff text',
    });
    expect(handoff.status).toBe('draft');

    const sent = await handoffs.sendHandoff(handoff.id);
    expect(sent.status).toBe('sent');

    const acknowledged = await handoffs.acknowledgeHandoff(handoff.id, `Practitioner/${id()}`);
    expect(acknowledged.status).toBe('acknowledged');
  });

  test('tracks handoffs by encounter and patient', async () => {
    const encounterId = id();
    const created: any = await handoffs.createHandoff({
      encounterId,
      patientId: patient.id,
      format: 'SBAR',
      priority: 'routine',
      fromFacility: { reference: 'Organization/ems-alice' },
      toFacility: { reference: 'Organization/valley-hosp' },
      fromProvider: { reference: `Practitioner/${id()}` },
      content: 'x',
    });
    expect(handoffs.getHandoffsForEncounter(encounterId)).toContainEqual(created);
  });
});

describe('DeviceService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('registers and lists devices without needing a connection', () => {
    const svc = new DeviceService();
    const before = svc.getDevices().length;
    const registered = svc.registerDevice({
      name: 'Test AED',
      type: 'defibrillator',
      manufacturer: 'Test Inc',
      model: 'AED-1',
      connectionType: 'bluetooth-le',
      measurementTypes: ['ECG'],
    });
    expect(registered.id).toBeDefined();
    expect(svc.getDevices().length).toBe(before + 1);
    expect(svc.getDevice(registered.id as string)?.name).toBe('Test AED');
  });

  test('connects to a device and streams data until disconnect', async () => {
    jest.useFakeTimers();
    const svc = new DeviceService();
    const device = svc.registerDevice({
      name: 'Test Monitor',
      type: 'vital-signs-monitor',
      manufacturer: 'Test Inc',
      model: 'M-1',
      connectionType: 'bluetooth-le',
      measurementTypes: ['ECG', 'SpO2'],
      samplingRate: 1,
    });
    const events: string[] = [];
    svc.addListener({
      onDeviceDiscovered: () => undefined,
      onDeviceDisconnected: (dev) => events.push(`disconnected:${dev}`),
      onDataReceived: (dev) => events.push(`data:${dev}`),
      onError: () => undefined,
      onDeviceConnected: (dev) => events.push(`connected:${dev}`),
    });

    jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const connecting = svc.connect(device.id as string);
    expect(svc.getConnection(device.id as string)?.status).toBe('connecting');
    await jest.advanceTimersByTimeAsync(2000);
    await connecting;

    expect(svc.getConnection(device.id as string)?.status).toBe('connected');
    expect(events).toContain(`connected:${device.id}`);

    await jest.advanceTimersByTimeAsync(5000);
    expect(events.some(e => e.startsWith('data:'))).toBe(true);

    await svc.disconnect(device.id as string);
    expect(svc.getConnection(device.id as string)?.status).toBe('disconnected');
    expect(events).toContain(`disconnected:${device.id}`);
  });

  test('startScan discovers registered devices via the listener', async () => {
    jest.useFakeTimers();
    const svc = new DeviceService();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const discovered: string[] = [];
    svc.addListener({
      onDeviceDiscovered: (d) => discovered.push(d.name),
      onDeviceConnected: () => undefined,
      onDeviceDisconnected: () => undefined,
      onDataReceived: () => undefined,
      onError: () => undefined,
    });

    svc.startScan(30000);
    expect(svc.isScanning()).toBe(true);

    await jest.advanceTimersByTimeAsync(31000);
    expect(svc.isScanning()).toBe(false);
    expect(discovered.length).toBeGreaterThanOrEqual(1);
  });

  test('converts waveform measurements into FHIR observations', () => {
    const svc = new DeviceService();
    const device = svc.registerDevice({
      name: 'ECG',
      type: 'vital-signs-monitor',
      manufacturer: 'M',
      model: 'ECG-1',
      connectionType: 'bluetooth-le',
      measurementTypes: ['ECG'],
    });
    const observations = svc.convertToObservation(
      {
        deviceId: device.id as string,
        timestamp: new Date().toISOString(),
        measurements: [
          { type: 'HeartRate', value: 72, unit: 'bpm', code: '8867-4', system: 'http://loinc.org', quality: 'good' },
        ],
      },
      id(),
      id()
    );
    expect(observations.length).toBe(1);
    expect(observations[0].resourceType).toBe('Observation');
    expect(observations[0].valueQuantity?.value).toBe(72);
  });
});