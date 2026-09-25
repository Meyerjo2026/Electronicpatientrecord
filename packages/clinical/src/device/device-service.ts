import { z } from 'zod';
import { ulid } from 'ulid';
import type { Observation } from '@prehospital-epr/core';
import {
  Quantity,
  CodeableConcept,
  SampledData,
} from '@prehospital-epr/core';

export const DeviceTypeSchema = z.enum([
  'vital-signs-monitor',
  'ecg-monitor',
  'spo2-monitor',
  'etco2-monitor',
  'blood-pressure-cuff',
  'thermometer',
  'glucometer',
  'ventilator',
  'defibrillator',
  'infusion-pump',
  'ultrasound',
  'other',
]);

export const ConnectionTypeSchema = z.enum([
  'bluetooth-classic',
  'bluetooth-le',
  'usb',
  'serial',
  'wifi',
  'manual',
]);

export const DeviceStatusSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'pairing',
  'paired',
  'error',
  'updating',
]);

export const DeviceConfigSchema = z.object({
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/).optional(),
  name: z.string(),
  type: DeviceTypeSchema,
  manufacturer: z.string(),
  model: z.string(),
  serialNumber: z.string().optional(),
  firmwareVersion: z.string().optional(),
  connectionType: ConnectionTypeSchema,
  bluetoothServiceUuid: z.string().optional(),
  bluetoothCharacteristicUuids: z.record(z.string()).optional(),
  usbVendorId: z.string().optional(),
  usbProductId: z.string().optional(),
  samplingRate: z.number().positive().optional(),
  measurementTypes: z.array(z.string()),
  calibrationDate: z.string().datetime().optional(),
  calibrationDueDate: z.string().datetime().optional(),
  location: z.string().optional(),
  assignedUnit: z.string().optional(),
});

export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;

export const DeviceConnectionSchema = z.object({
  deviceId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  status: DeviceStatusSchema,
  connectedAt: z.string().datetime().optional(),
  disconnectedAt: z.string().datetime().optional(),
  lastDataReceived: z.string().datetime().optional(),
  signalStrength: z.number().min(0).max(100).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  error: z.string().optional(),
  pairedAt: z.string().datetime().optional(),
});

export type DeviceConnection = z.infer<typeof DeviceConnectionSchema>;

export const VitalSignsDataSchema = z.object({
  deviceId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  timestamp: z.string().datetime(),
  measurements: z.array(z.object({
    type: z.string(),
    value: z.number(),
    unit: z.string(),
    code: z.string().optional(),
    system: z.string().url().optional(),
    waveform: z.object({
      samplingRate: z.number().positive(),
      data: z.string(), // Base64 encoded
      duration: z.number().positive(),
      leads: z.array(z.string()).optional(),
    }).optional(),
    quality: z.enum(['good', 'acceptable', 'poor', 'unknown']).optional(),
    site: z.string().optional(),
  })),
  deviceStatus: z.object({
    batteryLevel: z.number().min(0).max(100).optional(),
    signalQuality: z.enum(['good', 'fair', 'poor']).optional(),
    alarms: z.array(z.string()).optional(),
  }).optional(),
});

export type VitalSignsData = z.infer<typeof VitalSignsDataSchema>;

export interface DeviceListener {
  onDeviceDiscovered(device: DeviceConfig): void;
  onDeviceConnected(deviceId: string): void;
  onDeviceDisconnected(deviceId: string, reason?: string): void;
  onDataReceived(deviceId: string, data: VitalSignsData): void;
  onError(deviceId: string, error: string): void;
}

export class DeviceService {
  private devices: Map<string, DeviceConfig> = new Map();
  private connections: Map<string, DeviceConnection> = new Map();
  private listeners: Set<DeviceListener> = new Set();
  private scanning: boolean = false;
  private scanTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize with known device profiles
    this.registerKnownDevices();
  }

  private registerKnownDevices(): void {
    // Common EMS device profiles
    const knownDevices: Omit<DeviceConfig, 'id'>[] = [
      {
        name: 'ZOLL X Series',
        type: 'vital-signs-monitor',
        manufacturer: 'ZOLL Medical',
        model: 'X Series',
        connectionType: 'bluetooth-le',
        measurementTypes: ['ECG', 'SpO2', 'NIBP', 'EtCO2', 'Temperature', 'CO'],
        bluetoothServiceUuid: '0000180D-0000-1000-8000-00805F9B34FB', // Heart Rate Service
      },
      {
        name: 'Physio-Control LIFEPAK 15',
        type: 'vital-signs-monitor',
        manufacturer: 'Stryker',
        model: 'LIFEPAK 15',
        connectionType: 'bluetooth-le',
        measurementTypes: ['ECG', 'SpO2', 'NIBP', 'EtCO2', 'Temperature'],
        bluetoothServiceUuid: '0000180D-0000-1000-8000-00805F9B34FB',
      },
      {
        name: 'Philips HeartStart MRx',
        type: 'vital-signs-monitor',
        manufacturer: 'Philips',
        model: 'HeartStart MRx',
        connectionType: 'bluetooth-classic',
        measurementTypes: ['ECG', 'SpO2', 'NIBP', 'EtCO2', 'Temperature'],
      },
      {
        name: 'Nonin Onyx Vantage 9590',
        type: 'spo2-monitor',
        manufacturer: 'Nonin Medical',
        model: 'Onyx Vantage 9590',
        connectionType: 'bluetooth-le',
        measurementTypes: ['SpO2', 'Heart Rate'],
        bluetoothServiceUuid: '0000180D-0000-1000-8000-00805F9B34FB',
      },
      {
        name: 'Masimo Rad-97',
        type: 'vital-signs-monitor',
        manufacturer: 'Masimo',
        model: 'Rad-97',
        connectionType: 'bluetooth-le',
        measurementTypes: ['SpO2', 'PR', 'PI', 'PVI', 'EtCO2', 'NIBP', 'Temperature'],
        bluetoothServiceUuid: '0000180D-0000-1000-8000-00805F9B34FB',
      },
      {
        name: 'iHealth Wireless BP Monitor',
        type: 'blood-pressure-cuff',
        manufacturer: 'iHealth Labs',
        model: 'BP7',
        connectionType: 'bluetooth-le',
        measurementTypes: ['Systolic BP', 'Diastolic BP', 'Heart Rate'],
        bluetoothServiceUuid: '00001810-0000-1000-8000-00805F9B34FB', // Blood Pressure Service
      },
    ];

    for (const device of knownDevices) {
      const config: DeviceConfig = {
        ...device,
        id: ulid(),
      };
      this.devices.set(config.id!, config);
    }
  }

  // Device discovery
  async startScan(timeout: number = 30000): Promise<DeviceConfig[]> {
    this.scanning = true;
    const discovered: DeviceConfig[] = [];

    // Simulate device discovery
    // In production, would use Web Bluetooth API, React Native Bluetooth, or platform-specific APIs
    this.simulateDiscovery(discovered);

    this.scanTimeout = setTimeout(() => {
      this.scanning = false;
      this.notifyScanComplete(discovered);
    }, timeout);

    return discovered;
  }

  stopScan(): void {
    this.scanning = false;
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  private simulateDiscovery(discovered: DeviceConfig[]): void {
    // Simulate finding some devices
    setTimeout(() => {
      for (const device of this.devices.values()) {
        if (Math.random() > 0.3) { // 70% chance to "discover" each known device
          const found = { ...device, id: ulid() };
          discovered.push(found);
          this.notifyDeviceDiscovered(found);
        }
      }
    }, 1000);
  }

  // Device connection
  async connect(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error('Device not found');

    const connection: DeviceConnection = {
      deviceId,
      status: 'connecting',
    };
    this.connections.set(deviceId, connection);
    this.notifyDeviceConnecting(deviceId);

    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      connection.status = 'connected';
      connection.connectedAt = new Date().toISOString();
      connection.signalStrength = 80 + Math.floor(Math.random() * 20);
      connection.batteryLevel = 50 + Math.floor(Math.random() * 50);
      
      this.connections.set(deviceId, connection);
      this.notifyDeviceConnected(deviceId);
      
      // Start data streaming simulation
      this.startDataSimulation(deviceId);
      
      return true;
    } catch (error) {
      connection.status = 'error';
      connection.error = String(error);
      this.connections.set(deviceId, connection);
      this.notifyError(deviceId, String(error));
      return false;
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    const connection = this.connections.get(deviceId);
    if (!connection) return;

    connection.status = 'disconnected';
    connection.disconnectedAt = new Date().toISOString();
    this.connections.set(deviceId, connection);
    
    this.stopDataSimulation(deviceId);
    this.notifyDeviceDisconnected(deviceId, 'User disconnected');
  }

  // Data streaming simulation
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  private startDataSimulation(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const interval = setInterval(() => {
      const connection = this.connections.get(deviceId);
      if (!connection || connection.status !== 'connected') {
        this.stopDataSimulation(deviceId);
        return;
      }

      const data = this.generateSimulatedData(device);
      connection.lastDataReceived = data.timestamp;
      connection.signalStrength = Math.max(20, connection.signalStrength! - Math.floor(Math.random() * 5));
      connection.batteryLevel = Math.max(0, connection.batteryLevel! - 0.1);
      this.connections.set(deviceId, connection);

      this.notifyDataReceived(deviceId, data);
    }, 1000); // 1 Hz

    this.simulationIntervals.set(deviceId, interval);
  }

  private stopDataSimulation(deviceId: string): void {
    const interval = this.simulationIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(deviceId);
    }
  }

  private generateSimulatedData(device: DeviceConfig): VitalSignsData {
    const measurements: VitalSignsData['measurements'] = [];
    const baseTime = new Date().toISOString();

    // Generate realistic vital signs based on device type
    if (device.measurementTypes.includes('Heart Rate') || device.measurementTypes.includes('ECG')) {
      measurements.push({
        type: 'Heart Rate',
        value: 60 + Math.floor(Math.random() * 40),
        unit: '/min',
        code: '8867-4',
        system: 'http://loinc.org',
        quality: 'good',
      });
    }

    if (device.measurementTypes.includes('SpO2')) {
      measurements.push({
        type: 'SpO2',
        value: 94 + Math.floor(Math.random() * 6),
        unit: '%',
        code: '2708-6',
        system: 'http://loinc.org',
        quality: 'good',
      });
    }

    if (device.measurementTypes.includes('Systolic BP') || device.measurementTypes.includes('NIBP')) {
      measurements.push(
        {
          type: 'Systolic BP',
          value: 100 + Math.floor(Math.random() * 40),
          unit: 'mmHg',
          code: '8480-6',
          system: 'http://loinc.org',
          quality: 'good',
        },
        {
          type: 'Diastolic BP',
          value: 60 + Math.floor(Math.random() * 30),
          unit: 'mmHg',
          code: '8462-4',
          system: 'http://loinc.org',
          quality: 'good',
        }
      );
    }

    if (device.measurementTypes.includes('EtCO2')) {
      measurements.push({
        type: 'EtCO2',
        value: 35 + Math.floor(Math.random() * 10),
        unit: 'mmHg',
        code: '19211-8',
        system: 'http://loinc.org',
        quality: 'good',
      });
    }

    if (device.measurementTypes.includes('Temperature')) {
      measurements.push({
        type: 'Temperature',
        value: 36.5 + Math.random() * 1.5,
        unit: '°C',
        code: '8310-5',
        system: 'http://loinc.org',
        quality: 'good',
        site: 'oral',
      });
    }

    if (device.measurementTypes.includes('Respiratory Rate')) {
      measurements.push({
        type: 'Respiratory Rate',
        value: 12 + Math.floor(Math.random() * 10),
        unit: '/min',
        code: '9279-1',
        system: 'http://loinc.org',
        quality: 'good',
      });
    }

    // Add ECG waveform if device supports it
    const ecgMeasurement = measurements.find(m => m.type === 'Heart Rate');
    if (ecgMeasurement && device.measurementTypes.includes('ECG')) {
      ecgMeasurement.waveform = this.generateECGWaveform();
    }

    return {
      deviceId: device.id!,
      timestamp: baseTime,
      measurements,
      deviceStatus: {
        batteryLevel: this.connections.get(device.id!)?.batteryLevel,
        signalQuality: 'good',
        alarms: [],
      },
    };
  }

  private generateECGWaveform(): VitalSignsData['measurements'][0]['waveform'] {
    // Generate a simple simulated ECG waveform
    const samplingRate = 250; // Hz
    const duration = 10; // seconds
    const samples = samplingRate * duration;
    const data: number[] = [];

    for (let i = 0; i < samples; i++) {
      const t = i / samplingRate;
      // Simple ECG-like waveform
      let value = 0;
      // P wave
      value += Math.sin(2 * Math.PI * 1.2 * t) * 0.1;
      // QRS complex
      const qrsPhase = (t * 72 / 60) % 1;
      if (qrsPhase < 0.1) {
        value += Math.sin(2 * Math.PI * 10 * (qrsPhase / 0.1)) * 1.5;
      }
      // T wave
      value += Math.sin(2 * Math.PI * 0.5 * t) * 0.3;
      // Noise
      value += (Math.random() - 0.5) * 0.05;
      data.push(value);
    }

    // Convert to base64 (simplified - in production would use proper binary encoding)
    const base64 = btoa(String.fromCharCode(...new Uint8Array(new Float32Array(data).buffer)));

    return {
      samplingRate,
      data: base64,
      duration,
      leads: ['I', 'II', 'III'],
    };
  }

  // Convert device data to FHIR Observation
  convertToObservation(deviceData: VitalSignsData, patientId: string, encounterId: string): Observation[] {
    const observations: Observation[] = [];

    for (const measurement of deviceData.measurements) {
      const obs: Observation = {
        resourceType: 'Observation',
        id: ulid(),
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          }],
        }],
        code: {
          coding: [{
            system: measurement.system || 'http://loinc.org',
            code: measurement.code,
            display: measurement.type,
          }],
        },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: deviceData.timestamp,
        valueQuantity: {
          value: measurement.value,
          unit: measurement.unit,
          system: measurement.system || 'http://unitsofmeasure.org',
          code: measurement.unit,
        },
        device: { reference: `Device/${deviceData.deviceId}` },
        meta: {
          profile: ['http://hl7.org/fhir/StructureDefinition/vitalsigns'],
        },
      } as Observation;

      // Add waveform as component if present
      if (measurement.waveform) {
        obs.component = obs.component || [];
        obs.component.push({
          code: {
            coding: [{
              system: 'http://loinc.org',
              code: '20217-7',
              display: 'ECG waveform',
            }],
          },
          valueSampledData: {
            origin: { value: 0, unit: 'mV', system: 'http://unitsofmeasure.org', code: 'mV' },
            period: 1000 / measurement.waveform.samplingRate,
            dimensions: 1,
            data: measurement.waveform.data,
          } as any,
        });
      }

      observations.push(obs);
    }

    return observations;
  }

  // Listener management
  addListener(listener: DeviceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyDeviceDiscovered(device: DeviceConfig): void {
    this.listeners.forEach(l => l.onDeviceDiscovered?.(device));
  }

  private notifyDeviceConnecting(deviceId: string): void {
    this.listeners.forEach(l => l.onDeviceConnected?.(deviceId));
  }

  private notifyDeviceConnected(deviceId: string): void {
    this.listeners.forEach(l => l.onDeviceConnected?.(deviceId));
  }

  private notifyDeviceDisconnected(deviceId: string, reason?: string): void {
    this.listeners.forEach(l => l.onDeviceDisconnected?.(deviceId, reason));
  }

  private notifyDataReceived(deviceId: string, data: VitalSignsData): void {
    this.listeners.forEach(l => l.onDataReceived?.(deviceId, data));
  }

  private notifyError(deviceId: string, error: string): void {
    this.listeners.forEach(l => l.onError?.(deviceId, error));
  }

  private notifyScanComplete(devices: DeviceConfig[]): void {
    // Could notify listeners of scan completion
  }

  // Getters
  getDevices(): DeviceConfig[] {
    return Array.from(this.devices.values());
  }

  getDevice(deviceId: string): DeviceConfig | undefined {
    return this.devices.get(deviceId);
  }

  getConnection(deviceId: string): DeviceConnection | undefined {
    return this.connections.get(deviceId);
  }

  getConnectedDevices(): DeviceConfig[] {
    const connectedIds = Array.from(this.connections.entries())
      .filter(([, conn]) => conn.status === 'connected')
      .map(([id]) => id);
    
    return connectedIds.map(id => this.devices.get(id)!).filter(Boolean);
  }

  isScanning(): boolean {
    return this.scanning;
  }

  // Register a new device manually
  registerDevice(config: Omit<DeviceConfig, 'id'>): DeviceConfig {
    const device: DeviceConfig = {
      ...config,
      id: ulid(),
    };
    this.devices.set(device.id!, device);
    return device;
  }

  // Update device config
  updateDevice(deviceId: string, updates: Partial<DeviceConfig>): DeviceConfig | undefined {
    const device = this.devices.get(deviceId);
    if (!device) return undefined;

    const updated = { ...device, ...updates };
    this.devices.set(deviceId, updated);
    return updated;
  }

  // Remove device
  removeDevice(deviceId: string): boolean {
    this.stopDataSimulation(deviceId);
    this.connections.delete(deviceId);
    return this.devices.delete(deviceId);
  }
}

export const deviceService = new DeviceService();