import type { Middleware } from '@reduxjs/toolkit';
import type { AuditService } from '@prehospital-epr/security';

/**
 * Records the audit trail from dispatched actions.
 *
 * Done in middleware rather than in the reducers so that recording is a side
 * effect of an action rather than something a reducer can forget, and so a
 * single mapping documents what is auditable.
 *
 * Writes are best-effort so a storage problem can never block clinical work,
 * but a failure is reported rather than swallowed.
 */

interface Actor {
  userId: string;
  role: string;
}

type Action = { type: string; payload?: unknown };

interface Mapping {
  /** Redux action types that trigger this event. */
  types: string[];
  build: (action: Action, actor: Actor) => Promise<void>;
}

const UNKNOWN_ACTOR: Actor = { userId: 'unknown', role: 'UNKNOWN' };

const idOf = (payload: unknown): string | undefined => (payload as { id?: string } | undefined)?.id;

const buildMappings = (audit: AuditService): Mapping[] => [
  {
    types: ['auth/login/fulfilled'],
    build: async (action, actor) => {
      const session = action.payload as { id?: string } | undefined;
      await audit.logSecurityEvent('login', actor.userId, { sessionId: session?.id });
    },
  },
  {
    types: ['auth/login/rejected'],
    build: async (action, actor) => {
      const reason = (action.payload as string | undefined) ?? 'Invalid credentials';
      await audit.logSecurityEvent('failed-login', actor.userId, { reason }, 'failure');
    },
  },
  {
    types: ['auth/logout/fulfilled'],
    build: async (_action, actor) => {
      await audit.logSecurityEvent('logout', actor.userId, {});
    },
  },
  {
    types: ['patient/setCurrentPatient'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logAccess(actor.userId, actor.role, 'Patient', id, 'read');
    },
  },
  {
    types: ['patient/addPatient'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logAccess(actor.userId, actor.role, 'Patient', id, 'create');
    },
  },
  {
    types: ['patient/updatePatient'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logAccess(actor.userId, actor.role, 'Patient', id, 'update');
    },
  },
  {
    types: ['patient/removePatient'],
    build: async (action, actor) => {
      const id = action.payload as string | undefined;
      if (id) await audit.logAccess(actor.userId, actor.role, 'Patient', id, 'delete');
    },
  },
  {
    types: ['encounter/setCurrentEncounter'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logAccess(actor.userId, actor.role, 'Encounter', id, 'read');
    },
  },
  {
    types: ['encounter/addEncounter'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logAccess(actor.userId, actor.role, 'Encounter', id, 'create');
    },
  },
  {
    types: ['intervention/recordMedication/fulfilled'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logClinicalEvent(actor.userId, actor.role, '', 'medication', { medicationId: id });
    },
  },
  {
    types: ['intervention/recordProcedure/fulfilled'],
    build: async (action, actor) => {
      const id = idOf(action.payload);
      if (id) await audit.logClinicalEvent(actor.userId, actor.role, '', 'procedure', { procedureId: id });
    },
  },
  {
    types: ['intervention/removeMedication', 'intervention/removeProcedure'],
    build: async (action, actor) => {
      const id = action.payload as string | undefined;
      if (id) await audit.logClinicalEvent(actor.userId, actor.role, '', 'procedure', { removed: id });
    },
  },
  {
    types: ['sync/syncNow/fulfilled'],
    build: async (action, actor) => {
      const result = action.payload as { syncedCount?: number } | undefined;
      await audit.logSystemEvent('sync', { trigger: 'completed', syncedCount: result?.syncedCount, by: actor.userId });
    },
  },
  {
    types: ['sync/syncNow/rejected'],
    build: async action => {
      await audit.logSystemEvent(
        'sync',
        { trigger: 'failed', error: String((action.payload as string | undefined) ?? 'unknown') },
        'failure'
      );
    },
  },
];

export function createAuditMiddleware(auditService: AuditService): Middleware {
  const mappings = buildMappings(auditService);

  return api => next => (action: unknown) => {
    const result = next(action);
    const typed = action as Action;
    const mapping = mappings.find(m => m.types.includes(typed.type));

    if (mapping) {
      const state = api.getState() as { auth?: { session?: { userId?: string; roles?: string[] } | null } };
      const session = state.auth?.session;
      const actor: Actor = session?.userId
        ? { userId: session.userId, role: session.roles?.[0] ?? 'UNKNOWN' }
        : UNKNOWN_ACTOR;

      mapping.build(typed, actor).catch((error: unknown) => {
        console.warn(`[audit] could not record ${typed.type}:`, error);
      });
    }

    return result;
  };
}
