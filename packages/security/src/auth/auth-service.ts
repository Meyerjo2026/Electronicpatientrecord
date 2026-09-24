import { z } from 'zod';
import * as jose from 'jose';
import * as CryptoJS from 'crypto-js';
import { ulid } from 'ulid';
import {
  Session,
  SessionSchema,
  SecurityRoleSchema,
  SecurityPermissionSchema,
  RolePermissionsSchema
} from '@prehospital-epr/core';

const AuthConfigSchema = z.object({
  issuer: z.string().url(),
  audience: z.string(),
  accessTokenExpiry: z.string().default('12h'),
  refreshTokenExpiry: z.string().default('30d'),
  algorithm: z.enum(['RS256', 'ES256', 'HS256']).default('RS256'),
  keyRotationInterval: z.number().int().positive().default(24 * 60 * 60 * 1000), // 24 hours
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  EMS_PROVIDER: [
    'PATIENT_READ', 'PATIENT_WRITE',
    'ENCOUNTER_READ', 'ENCOUNTER_WRITE',
    'OBSERVATION_READ', 'OBSERVATION_WRITE',
    'MEDICATION_ADMINISTER',
    'PROCEDURE_PERFORM',
    'DOCUMENT_SIGN',
    'HANDOFF_CREATE',
    'REPORT_GENERATE'
  ],
  EMS_SUPERVISOR: [
    'PATIENT_READ', 'PATIENT_WRITE', 'PATIENT_DELETE',
    'ENCOUNTER_READ', 'ENCOUNTER_WRITE', 'ENCOUNTER_DELETE',
    'OBSERVATION_READ', 'OBSERVATION_WRITE',
    'MEDICATION_ADMINISTER',
    'PROCEDURE_PERFORM',
    'DOCUMENT_SIGN',
    'HANDOFF_CREATE', 'HANDOFF_RECEIVE',
    'REPORT_GENERATE',
    'ADMIN_USERS',
    'PROTOCOL_MANAGE'
  ],
  EMS_MEDICAL_DIRECTOR: [
    'PATIENT_READ', 'PATIENT_WRITE',
    'ENCOUNTER_READ', 'ENCOUNTER_WRITE',
    'OBSERVATION_READ', 'OBSERVATION_WRITE',
    'MEDICATION_ADMINISTER',
    'PROCEDURE_PERFORM',
    'DOCUMENT_SIGN',
    'HANDOFF_CREATE', 'HANDOFF_RECEIVE',
    'REPORT_GENERATE',
    'DATA_EXPORT',
    'PROTOCOL_MANAGE',
    'QUALITY_REVIEW'
  ],
  EMS_ADMIN: [
    'PATIENT_READ', 'PATIENT_WRITE', 'PATIENT_DELETE',
    'ENCOUNTER_READ', 'ENCOUNTER_WRITE', 'ENCOUNTER_DELETE',
    'OBSERVATION_READ', 'OBSERVATION_WRITE',
    'MEDICATION_ADMINISTER',
    'PROCEDURE_PERFORM',
    'DOCUMENT_SIGN',
    'HANDOFF_CREATE', 'HANDOFF_RECEIVE',
    'REPORT_GENERATE',
    'ADMIN_USERS', 'ADMIN_SYSTEM',
    'PROTOCOL_MANAGE', 'DEVICE_MANAGE',
    'DATA_EXPORT'
  ],
  HOSPITAL_STAFF: [
    'PATIENT_READ',
    'ENCOUNTER_READ',
    'OBSERVATION_READ',
    'HANDOFF_RECEIVE',
    'REPORT_GENERATE'
  ],
  HOSPITAL_PHYSICIAN: [
    'PATIENT_READ', 'PATIENT_WRITE',
    'ENCOUNTER_READ', 'ENCOUNTER_WRITE',
    'OBSERVATION_READ', 'OBSERVATION_WRITE',
    'HANDOFF_RECEIVE', 'HANDOFF_CREATE',
    'REPORT_GENERATE',
    'DATA_EXPORT'
  ],
  DISPATCHER: [
    'PATIENT_READ',
    'ENCOUNTER_READ', 'ENCOUNTER_WRITE',
    'OBSERVATION_READ',
    'HANDOFF_CREATE'
  ],
  QUALITY_MANAGER: [
    'PATIENT_READ',
    'ENCOUNTER_READ',
    'OBSERVATION_READ',
    'REPORT_GENERATE',
    'DATA_EXPORT',
    'AUDIT_READ',
    'QUALITY_REVIEW'
  ],
  AUDITOR: [
    'PATIENT_READ',
    'ENCOUNTER_READ',
    'OBSERVATION_READ',
    'AUDIT_READ',
    'DATA_EXPORT'
  ],
  SYSTEM_ADMIN: [
    'ADMIN_USERS', 'ADMIN_SYSTEM',
    'DEVICE_MANAGE',
    'DATA_EXPORT',
    'AUDIT_READ'
  ],
};

export class AuthService {
  private config: AuthConfig;
  private privateKey: CryptoKey | null = null;
  publicKey: CryptoKey | null = null;
  private sessions: Map<string, Session> = new Map();
  private refreshTokens: Map<string, { sessionId: string; expiresAt: number }> = new Map();

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = AuthConfigSchema.parse({
      issuer: 'prehospital-epr',
      audience: 'prehospital-epr-client',
      ...config
    });
  }

  async initialize(): Promise<void> {
    // Generate or load key pair
    const keyPair = await jose.generateKeyPair(this.config.algorithm, {
      extractable: true,
    });
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
  }

  async login(
    userId: string,
    deviceId: string,
    roles: string[],
    credentials: { username: string; password?: string; pin?: string; biometric?: boolean }
  ): Promise<{ session: Session; accessToken: string; refreshToken: string }> {
    // Validate credentials (would check against secure storage)
    const validatedRoles = roles.filter(r => SecurityRoleSchema.safeParse(r).success) as SecurityRole[];
    
    const permissions = this.getPermissionsForRoles(validatedRoles);
    
    const session: Session = {
      id: ulid(),
      userId,
      deviceId,
      roles: validatedRoles,
      permissions,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.parseExpiry(this.config.accessTokenExpiry)).toISOString(),
      lastActivity: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);

    const accessToken = await this.createAccessToken(session);
    const refreshToken = await this.createRefreshToken(session);

    return { session, accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<Session | null> {
    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey!, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });
      
      const session = this.sessions.get(payload.sid as string);
      if (!session) return null;
      
      if (new Date(session.expiresAt) < new Date()) {
        this.sessions.delete(session.id);
        return null;
      }
      
      return session;
    } catch {
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const { payload } = await jose.jwtVerify(refreshToken, this.publicKey!, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      const tokenData = this.refreshTokens.get(payload.jti as string);
      if (!tokenData || tokenData.expiresAt < Date.now()) {
        return null;
      }

      const session = this.sessions.get(tokenData.sessionId);
      if (!session) return null;

      // Rotate refresh token
      this.refreshTokens.delete(payload.jti as string);
      const newAccessToken = await this.createAccessToken(session);
      const newRefreshToken = await this.createRefreshToken(session);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      return null;
    }
  }

  async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove associated refresh tokens
      for (const [jti, data] of this.refreshTokens) {
        if (data.sessionId === sessionId) {
          this.refreshTokens.delete(jti);
        }
      }
      this.sessions.delete(sessionId);
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        await this.logout(sessionId);
      }
    }
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }
  }

  hasPermission(session: Session, permission: string): boolean {
    return session.permissions.includes(permission as any);
  }

  hasRole(session: Session, role: string): boolean {
    return session.roles.includes(role as any);
  }

  hasAnyRole(session: Session, roles: string[]): boolean {
    return roles.some(r => session.roles.includes(r as any));
  }

  private getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();
    for (const role of roles) {
      const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      rolePerms.forEach(p => permissions.add(p));
    }
    return Array.from(permissions);
  }

  private async createAccessToken(session: Session): Promise<string> {
    return new jose.SignJWT({
      sub: session.userId,
      sid: session.id,
      roles: session.roles,
      permissions: session.permissions,
      deviceId: session.deviceId,
    })
      .setProtectedHeader({ alg: this.config.algorithm })
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setIssuedAt()
      .setExpirationTime(this.config.accessTokenExpiry)
      .sign(this.privateKey!);
  }

  private async createRefreshToken(session: Session): Promise<string> {
    const jti = ulid();
    const token = await new jose.SignJWT({
      sub: session.userId,
      sid: session.id,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: this.config.algorithm })
      .setIssuer(this.config.issuer)
      .setAudience(this.config.audience)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(this.config.refreshTokenExpiry)
      .sign(this.privateKey!);

    this.refreshTokens.set(jti, {
      sessionId: session.id,
      expiresAt: Date.now() + this.parseExpiry(this.config.refreshTokenExpiry),
    });

    return token;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([hmd])$/);
    if (!match) return 12 * 60 * 60 * 1000; // default 12h
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 12 * 60 * 60 * 1000;
    }
  }

  // Key rotation
  async rotateKeys(): Promise<void> {
    await this.initialize();
    // In production, would need to handle key transition gracefully
  }
}

export const authService = new AuthService();