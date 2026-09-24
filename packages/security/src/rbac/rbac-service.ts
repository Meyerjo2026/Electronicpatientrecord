import { z } from 'zod';
import {
  SecurityRoleSchema,
  SecurityPermissionSchema,
  RolePermissionsSchema,
  Session
} from '@prehospital-epr/core';

const RBACConfigSchema = z.object({
  defaultRole: SecurityRoleSchema.default('EMS_PROVIDER'),
  roleHierarchy: z.record(z.array(SecurityRoleSchema)).default({
    EMS_ADMIN: ['EMS_SUPERVISOR', 'EMS_PROVIDER', 'EMS_MEDICAL_DIRECTOR'],
    EMS_SUPERVISOR: ['EMS_PROVIDER'],
    EMS_MEDICAL_DIRECTOR: ['EMS_PROVIDER'],
    HOSPITAL_PHYSICIAN: ['HOSPITAL_STAFF'],
  }),
  permissionInheritance: z.boolean().default(true),
  emergencyOverrideEnabled: z.boolean().default(true),
  emergencyOverrideRoles: z.array(SecurityRoleSchema).default(['EMS_SUPERVISOR', 'EMS_MEDICAL_DIRECTOR', 'EMS_ADMIN']),
  emergencyOverrideDuration: z.number().int().positive().default(3600000), // 1 hour
  auditEmergencyOverrides: z.boolean().default(true),
});

export type RBACConfig = z.infer<typeof RBACConfigSchema>;

interface PermissionCheck {
  allowed: boolean;
  reason: string;
  requiredPermissions: string[];
  userPermissions: string[];
  userRoles: string[];
}

export class RBACService {
  private config: RBACConfig;
  private rolePermissions: Map<string, string[]> = new Map();
  private emergencyOverrides: Map<string, { sessionId: string; expiresAt: number; reason: string }> = new Map();

  constructor(config: Partial<RBACConfig> = {}) {
    this.config = RBACConfigSchema.parse(config);
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
    const defaultPermissions: Record<string, string[]> = {
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

    for (const [role, perms] of Object.entries(defaultPermissions)) {
      this.rolePermissions.set(role, perms);
    }
  }

  getPermissionsForRole(role: string): string[] {
    return this.rolePermissions.get(role) || [];
  }

  getAllPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();
    
    for (const role of roles) {
      // Add direct permissions
      const directPerms = this.getPermissionsForRole(role);
      directPerms.forEach(p => permissions.add(p));
      
      // Add inherited permissions if enabled
      if (this.config.permissionInheritance) {
        const inheritedRoles = this.config.roleHierarchy[role] || [];
        for (const inheritedRole of inheritedRoles) {
          const inheritedPerms = this.getPermissionsForRole(inheritedRole);
          inheritedPerms.forEach(p => permissions.add(p));
        }
      }
    }
    
    return Array.from(permissions);
  }

  checkPermission(session: Session, permission: string, context?: Record<string, any>): PermissionCheck {
    const userPermissions = session.permissions;
    const userRoles = session.roles;
    
    // Check for emergency override
    const hasEmergencyOverride = this.hasActiveEmergencyOverride(session.id);
    
    if (hasEmergencyOverride && this.config.emergencyOverrideEnabled) {
      const override = this.emergencyOverrides.get(session.id)!;
      if (this.config.emergencyOverrideRoles.some(r => userRoles.includes(r))) {
        return {
          allowed: true,
          reason: `Emergency override active: ${override.reason}`,
          requiredPermissions: [permission],
          userPermissions,
          userRoles,
        };
      }
    }
    
    const hasPermission = userPermissions.includes(permission as any);
    
    return {
      allowed: hasPermission,
      reason: hasPermission 
        ? 'Permission granted' 
        : `Missing required permission: ${permission}`,
      requiredPermissions: [permission],
      userPermissions,
      userRoles,
    };
  }

  checkPermissions(session: Session, permissions: string[], requireAll: boolean = true): PermissionCheck {
    const userPermissions = session.permissions;
    const userRoles = session.roles;
    
    const hasEmergencyOverride = this.hasActiveEmergencyOverride(session.id);
    
    if (hasEmergencyOverride && this.config.emergencyOverrideEnabled) {
      const override = this.emergencyOverrides.get(session.id)!;
      if (this.config.emergencyOverrideRoles.some(r => userRoles.includes(r))) {
        return {
          allowed: true,
          reason: `Emergency override active: ${override.reason}`,
          requiredPermissions: permissions,
          userPermissions,
          userRoles,
        };
      }
    }
    
    const results = permissions.map(p => userPermissions.includes(p as any));
    const allowed = requireAll ? results.every(r => r) : results.some(r => r);
    const missing = permissions.filter((p, i) => !results[i]);
    
    return {
      allowed,
      reason: allowed 
        ? 'All permissions granted' 
        : `Missing required permissions: ${missing.join(', ')}`,
      requiredPermissions: permissions,
      userPermissions,
      userRoles,
    };
  }

  checkResourceAccess(
    session: Session, 
    resourceType: string, 
    action: 'read' | 'write' | 'delete',
    resourceOwnerId?: string
  ): PermissionCheck {
    // Map actions to permissions
    const actionPermissionMap: Record<string, Record<string, string>> = {
      Patient: {
        read: 'PATIENT_READ',
        write: 'PATIENT_WRITE',
        delete: 'PATIENT_DELETE',
      },
      Encounter: {
        read: 'ENCOUNTER_READ',
        write: 'ENCOUNTER_WRITE',
        delete: 'ENCOUNTER_DELETE',
      },
      Observation: {
        read: 'OBSERVATION_READ',
        write: 'OBSERVATION_WRITE',
        delete: 'OBSERVATION_WRITE', // Same as write
      },
      MedicationAdministration: {
        read: 'OBSERVATION_READ',
        write: 'MEDICATION_ADMINISTER',
        delete: 'MEDICATION_ADMINISTER',
      },
      Procedure: {
        read: 'OBSERVATION_READ',
        write: 'PROCEDURE_PERFORM',
        delete: 'PROCEDURE_PERFORM',
      },
      Condition: {
        read: 'OBSERVATION_READ',
        write: 'OBSERVATION_WRITE',
        delete: 'OBSERVATION_WRITE',
      },
    };

    const permission = actionPermissionMap[resourceType]?.[action];
    if (!permission) {
      return {
        allowed: false,
        reason: `Unknown resource type or action: ${resourceType}.${action}`,
        requiredPermissions: [],
        userPermissions: session.permissions,
        userRoles: session.roles,
      };
    }

    // Check if user owns the resource (for patient-owned resources)
    if (resourceOwnerId && session.userId === resourceOwnerId) {
      // Owners can always read their own data
      if (action === 'read') {
        return {
          allowed: true,
          reason: 'Resource owner',
          requiredPermissions: [permission],
          userPermissions: session.permissions,
          userRoles: session.roles,
        };
      }
    }

    return this.checkPermission(session, permission);
  }

  // Emergency override for critical situations
  activateEmergencyOverride(sessionId: string, reason: string, requestedBy: string): boolean {
    const override = {
      sessionId,
      expiresAt: Date.now() + this.config.emergencyOverrideDuration,
      reason: `${reason} (requested by ${requestedBy})`,
    };

    if (!this.config.emergencyOverrideEnabled) {
      return false;
    }

    this.emergencyOverrides.set(sessionId, override);
    
    // Log for audit
    if (this.config.auditEmergencyOverrides) {
      console.log(`[RBAC] Emergency override activated for session ${sessionId}: ${override.reason}`);
    }

    return true;
  }

  deactivateEmergencyOverride(sessionId: string): boolean {
    const deleted = this.emergencyOverrides.delete(sessionId);
    if (deleted) {
      console.log(`[RBAC] Emergency override deactivated for session ${sessionId}`);
    }
    return deleted;
  }

  hasActiveEmergencyOverride(sessionId: string): boolean {
    const override = this.emergencyOverrides.get(sessionId);
    if (!override) return false;
    
    if (override.expiresAt < Date.now()) {
      this.emergencyOverrides.delete(sessionId);
      return false;
    }
    
    return true;
  }

  getEmergencyOverrideInfo(sessionId: string): { active: boolean; reason?: string; expiresAt?: number } {
    const override = this.emergencyOverrides.get(sessionId);
    if (!override || override.expiresAt < Date.now()) {
      if (override) this.emergencyOverrides.delete(sessionId);
      return { active: false };
    }
    
    return {
      active: true,
      reason: override.reason,
      expiresAt: override.expiresAt,
    };
  }

  // Role management
  setRolePermissions(role: string, permissions: string[]): void {
    this.rolePermissions.set(role, permissions);
  }

  addRolePermission(role: string, permission: string): void {
    const perms = this.rolePermissions.get(role) || [];
    if (!perms.includes(permission)) {
      perms.push(permission);
      this.rolePermissions.set(role, perms);
    }
  }

  removeRolePermission(role: string, permission: string): void {
    const perms = this.rolePermissions.get(role) || [];
    const filtered = perms.filter(p => p !== permission);
    this.rolePermissions.set(role, filtered);
  }

  getRoleHierarchy(): Record<string, string[]> {
    return { ...this.config.roleHierarchy };
  }

  setRoleHierarchy(hierarchy: Record<string, string[]>): void {
    this.config.roleHierarchy = hierarchy as RBACConfig['roleHierarchy'];
  }

  // Check if role can manage another role
  canManageRole(managerRole: string, targetRole: string): boolean {
    const hierarchy = this.config.roleHierarchy[managerRole] || [];
    return hierarchy.includes(targetRole as any) || managerRole === 'SYSTEM_ADMIN';
  }

  // Get effective permissions for a session (including inheritance and overrides)
  getEffectivePermissions(session: Session): string[] {
    const permissions = this.getAllPermissionsForRoles(session.roles);
    
    if (this.hasActiveEmergencyOverride(session.id) && this.config.emergencyOverrideEnabled) {
      // Emergency override grants all clinical permissions
      const clinicalPermissions = [
        'PATIENT_READ', 'PATIENT_WRITE',
        'ENCOUNTER_READ', 'ENCOUNTER_WRITE',
        'OBSERVATION_READ', 'OBSERVATION_WRITE',
        'MEDICATION_ADMINISTER',
        'PROCEDURE_PERFORM',
        'DOCUMENT_SIGN',
        'HANDOFF_CREATE', 'HANDOFF_RECEIVE',
      ];
      
      clinicalPermissions.forEach(p => permissions.push(p));
    }
    
    return [...new Set(permissions)]; // Deduplicate
  }
}

export const rbacService = new RBACService();