import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuditService } from '@prehospital-epr/security';
import { PersistentAuditStore } from './persistent-audit-store';

/**
 * The app's audit trail.
 *
 * Backed by AsyncStorage so events survive a restart, which is what makes the
 * integrity chain rehydratable and the SOC 2 report meaningful across sessions.
 * It is deliberately separate from the persisted clinical Redux state: audit
 * records are append-only and must not be rewritten by ordinary app state
 * updates.
 */
export const auditStore = new PersistentAuditStore(AsyncStorage);

export const audit = new AuditService(
  {
    serviceName: 'prehospital-epr-mobile',
    environment: __DEV__ ? 'development' : 'production',
    // 7 years, matching the HIPAA retention expectation in the package default.
    retentionDays: 2555,
    // Flush often: this is a patient-safety app used on a moving vehicle, and
    // an unflushed buffer is lost if the process is killed.
    batchSize: 20,
    flushInterval: 5_000,
  },
  auditStore
);
