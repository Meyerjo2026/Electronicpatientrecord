import * as CryptoJS from 'crypto-js';
import { ulid } from 'ulid';
import type { Session } from '@prehospital-epr/core';
import {
  CryptoService,
  AuthService,
  RBACService,
  AuditService,
  ConsentService,
  getPhiFields,
} from '../index';

const now = () => new Date().toISOString();
const inTime = (ms: number) => new Date(Date.now() + ms).toISOString();

function makeSession(roles: string[], permissions: string[]): Session {
  return {
    id: ulid(),
    userId: ulid(),
    deviceId: ulid(),
    roles: roles as Session['roles'],
    permissions: permissions as Session['permissions'],
    issuedAt: now(),
    expiresAt: inTime(3600_000),
    lastActivity: now(),
  };
}

describe('CryptoService', () => {
  test('encrypts and decrypts a PHI field in a round trip', async () => {
    const crypto = new CryptoService({ algorithm: 'AES-256-CBC' });
    await crypto.initialize();

    const encrypted = crypto.encryptField('name.0.family', 'Snow');
    expect(encrypted.ciphertext).not.toContain('Snow');
    expect(encrypted.algorithm).toBe('AES-256-CBC');

    expect(crypto.decryptField('name.0.family', encrypted)).toBe('Snow');
  });

  test('uses a distinct key per field', async () => {
    const crypto = new CryptoService();
    await crypto.initialize();
    const a = crypto.encryptField('a', 'value');
    const b = crypto.encryptField('b', 'value');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(crypto.exportFieldKeys().map(k => k.field)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  test('encrypts and decrypts a nested resource field', async () => {
    const crypto = new CryptoService();
    await crypto.initialize();
    const patient = { resourceType: 'Patient', id: ulid(), name: [{ family: 'Snow', given: ['Jon'] }] };

    const encrypted = crypto.encryptResource(patient, getPhiFields('Patient'));
    expect(encrypted.name[0].family).toMatchObject({ ciphertext: expect.any(String) });

    const decrypted = crypto.decryptResource(encrypted, getPhiFields('Patient'));
    expect(decrypted.name[0].family).toBe('Snow');
  });

  test('wraps and unwraps a key with the master key', async () => {
    const crypto = new CryptoService();
    await crypto.initialize();
    const key = CryptoJS.lib.WordArray.random(32) as any;
    const wrapped = crypto.wrapKey(key);
    expect(crypto.unwrapKey(wrapped).toString()).toBe(key.toString());
  });

  test('signs and verifies with the master key', async () => {
    const crypto = new CryptoService();
    await crypto.initialize();
    const signature = crypto.sign('payload', crypto.getMasterKeyHex());
    expect(crypto.verify('payload', signature, crypto.getMasterKeyHex())).toBe(true);
  });

  test('throws if used before initialization', () => {
    const crypto = new CryptoService();
    expect(() => crypto.encryptField('a', 'value')).toThrow(/not initialized/);
  });
});

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(async () => {
    auth = new AuthService({ issuer: 'https://prehospital-epr.org' });
    await auth.initialize();
  });

  test('logs in and issues a verifiable access token', async () => {
    const { session, accessToken } = await auth.login(ulid(), ulid(), ['EMS_PROVIDER'], {
      username: 'j.snow',
      pin: '1234',
    });

    expect(auth.hasRole(session, 'EMS_PROVIDER')).toBe(true);
    expect(auth.hasPermission(session, 'PATIENT_WRITE')).toBe(true);
    expect(auth.hasPermission(session, 'ADMIN_SYSTEM')).toBe(false);

    const verified = await auth.verifyAccessToken(accessToken);
    expect(verified?.id).toBe(session.id);
  });

  test('rejects tampered tokens', async () => {
    const { accessToken } = await auth.login(ulid(), ulid(), ['HOSPITAL_STAFF'], {
      username: 'x',
    });
    await expect(auth.verifyAccessToken(accessToken.slice(0, -4) + '0000')).resolves.toBeNull();
  });

  test('rotates refresh tokens and logs out a session', async () => {
    const { session, refreshToken } = await auth.login(ulid(), ulid(), ['DISPATCHER'], {
      username: 'y',
    });

    const rotated = await auth.refreshAccessToken(refreshToken);
    expect(rotated).not.toBeNull();

    await auth.logout(session.id);
    expect(auth.getSession(session.id)).toBeUndefined();
  });
});

describe('RBACService', () => {
  let rbac: RBACService;

  beforeEach(() => {
    rbac = new RBACService();
  });

  test('grants permissions defined for a role', () => {
    const session = makeSession(['EMS_PROVIDER'], rbac.getPermissionsForRole('EMS_PROVIDER'));
    expect(rbac.checkPermission(session, 'PATIENT_WRITE').allowed).toBe(true);
    expect(rbac.checkPermission(session, 'ADMIN_USERS').allowed).toBe(false);
  });

  test('evaluates multiple permissions with requireAll', () => {
    const session = makeSession(['EMS_ADMIN'], rbac.getPermissionsForRole('EMS_ADMIN'));
    expect(rbac.checkPermissions(session, ['PATIENT_READ', 'ADMIN_SYSTEM']).allowed).toBe(true);
    expect(rbac.checkPermissions(session, ['PATIENT_READ', 'NOT_A_PERM'], true).allowed).toBe(false);
  });

  test('enforces resource-level access control', () => {
    const readOnly = makeSession(['HOSPITAL_STAFF'], rbac.getPermissionsForRole('HOSPITAL_STAFF'));
    expect(rbac.checkResourceAccess(readOnly, 'Patient', 'read').allowed).toBe(true);
    expect(rbac.checkResourceAccess(readOnly, 'Patient', 'delete').allowed).toBe(false);
  });

  test('emergency override bypasses missing permissions temporarily', () => {
    const perms = rbac.getPermissionsForRole('EMS_SUPERVISOR').filter(p => p !== 'ADMIN_USERS');
    const supervisor = makeSession(['EMS_SUPERVISOR'], perms);
    expect(rbac.checkPermission(supervisor, 'ADMIN_USERS').allowed).toBe(false);

    rbac.activateEmergencyOverride(supervisor.id, 'cardiac arrest on scene', supervisor.userId);
    expect(rbac.checkPermission(supervisor, 'ADMIN_USERS').allowed).toBe(true);
    expect(rbac.hasActiveEmergencyOverride(supervisor.id)).toBe(true);

    rbac.deactivateEmergencyOverride(supervisor.id);
    expect(rbac.checkPermission(supervisor, 'ADMIN_USERS').allowed).toBe(false);
  });

  test('manages custom role permissions at runtime', () => {
    const rbac2 = new RBACService();
    rbac2.addRolePermission('EMS_PROVIDER', 'SPECIAL_ACCESS');
    const session = makeSession(['EMS_PROVIDER'], rbac2.getPermissionsForRole('EMS_PROVIDER'));
    expect(rbac2.checkPermission(session, 'SPECIAL_ACCESS').allowed).toBe(true);

    rbac2.removeRolePermission('EMS_PROVIDER', 'SPECIAL_ACCESS');
    const session2 = makeSession(['EMS_PROVIDER'], rbac2.getPermissionsForRole('EMS_PROVIDER'));
    expect(rbac2.checkPermission(session2, 'SPECIAL_ACCESS').allowed).toBe(false);
  });
});

describe('AuditService', () => {
  const audits: AuditService[] = [];

  afterEach(() => {
    audits.forEach(a => a.shutdown());
    audits.length = 0;
  });

  function audit(config: Record<string, unknown> = {}) {
    const svc = new AuditService({ enableIntegrityChain: true, ...config } as any);
    audits.push(svc);
    return svc;
  }

  test('records an access event with integrity hash', async () => {
    const svc = audit();
    const event = await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    expect(event.resourceType).toBe('AuditEvent');
    expect(event.action).toBe('R');
    expect(event.outcome).toBe('0');
    expect(event.extension).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: expect.stringContaining('audit-integrity') })])
    );

    const integrity = await svc.verifyIntegrity();
    expect(integrity.valid).toBe(true);
  });

  test('flushes buffered events and resets the buffer', async () => {
    const svc = audit({ flushInterval: 60_000 });
    await svc.logEvent({
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/audit-event-type', code: 'sys' }] },
      subtype: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/audit-event-subtype', code: 'startup' }] }],
      action: 'E',
      outcome: '0',
      agent: { who: { reference: `Practitioner/${ulid()}` }, requestor: true },
      entity: [],
      severity: 'info',
    });
    const flushed = await svc.flush();
    expect(flushed).toBeGreaterThanOrEqual(1);
    expect(await svc.flush()).toBe(0);
  });

  test('detects tampering in the integrity chain', async () => {
    const svc = audit();
    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'read');
    await svc.logAccess(ulid(), 'EMS_PROVIDER', 'Patient', ulid(), 'update');
    const chain: any[] = (svc as any).integrityChain;
    chain[0].currentHash = '0'.repeat(64); // tamper
    const integrity = await svc.verifyIntegrity();
    expect(integrity.valid).toBe(false);
  });
});

describe('ConsentService', () => {
  test('grants consent and checks access', async () => {
    const consentSvc = new ConsentService();
    const patientId = ulid();

    const consent = await consentSvc.createConsent(patientId, 'treatment', {
      granted: true,
      grantedBy: `Practitioner/${ulid()}`,
    });
    expect(consent.status).toBe('active');

    const check = await consentSvc.checkConsent(patientId, 'treatment', 'read', 'Patient');
    expect(check.allowed).toBe(true);
  });

  test('blocks access when required consent is revoked', async () => {
    const consentSvc = new ConsentService();
    const patientId = ulid();
    await consentSvc.createConsent(patientId, 'data-sharing', {
      granted: true,
      grantedBy: `Practitioner/${ulid()}`,
    });
    await consentSvc.revokeConsent(patientId, 'data-sharing', `Practitioner/${ulid()}`);

    const check = await consentSvc.checkConsent(patientId, 'data-sharing', 'read', 'Observation');
    expect(check.allowed).toBe(false);
  });

  test('denies when a required consent was never given', async () => {
    const consentSvc = new ConsentService();
    const check = await consentSvc.checkConsent(ulid(), 'treatment', 'read', 'Patient');
    expect(check.allowed).toBe(false);
  });

  test('exports consents as JSON', async () => {
    const consentSvc = new ConsentService();
    const patientId = ulid();
    await consentSvc.createConsent(patientId, 'treatment', {
      granted: true,
      grantedBy: `Patient/${patientId}`,
    });
    const exported = await consentSvc.exportConsents(patientId, 'json');
    const parsed = JSON.parse(exported);
    expect(parsed.consents.length).toBe(1);
    expect(parsed.consents[0].patient.reference).toBe(`Patient/${patientId}`);
  });
});