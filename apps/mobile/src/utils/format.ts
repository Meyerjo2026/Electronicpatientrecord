import type { Coding, Encounter, Patient } from '@prehospital-epr/core';
import type { Tone } from '@prehospital-epr/ui';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export const UNKNOWN_PATIENT = 'Unknown patient';

/** Preferred name, falling back to the family name then a placeholder. */
export function patientDisplayName(patient: Patient | null | undefined): string {
  const name = patient?.name?.[0];
  if (!name) return UNKNOWN_PATIENT;

  if (name.text?.trim()) return name.text.trim();

  const family = name.family?.trim();
  const given = name.given?.filter(Boolean).join(' ').trim();
  const composed = [given, family].filter(Boolean).join(' ').trim();
  return composed || UNKNOWN_PATIENT;
}

export function patientInitials(patient: Patient | null | undefined): string {
  const name = patient?.name?.[0];
  const given = name?.given?.filter(Boolean)[0]?.[0];
  const family = name?.family?.trim()?.[0];
  const initials = `${given ?? ''}${family ?? ''}`.toUpperCase();
  return initials || '?';
}

/** Age in whole years, or null when the date of birth is absent or invalid. */
export function patientAgeYears(patient: Patient | null | undefined): number | null {
  if (!patient?.birthDate) return null;
  const birth = Date.parse(patient.birthDate);
  if (!Number.isFinite(birth)) return null;
  return Math.max(0, Math.floor((Date.now() - birth) / MS_PER_YEAR));
}

/**
 * Age formatted the way it is spoken on scene, with the year unit dropped for
 * neonates so the band is unambiguous.
 */
export function patientAgeLabel(patient: Patient | null | undefined): string {
  const years = patientAgeYears(patient);
  if (years === null) return 'Age unknown';

  if (years === 0) {
    const months = Math.floor((Date.now() - Date.parse(patient!.birthDate as string)) / (MS_PER_YEAR / 12));
    return months <= 0 ? 'Neonate' : `${months} mo`;
  }
  return years === 1 ? '1 yr' : `${years} yrs`;
}

export function patientPhone(patient: Patient | null | undefined): string | null {
  const phone = patient?.telecom?.find(item => item.system === 'phone');
  return phone?.value ?? null;
}

/** The medical record number, taken from the first MR-typed identifier. */
export function patientMrn(patient: Patient | null | undefined): string | null {
  const identifier = patient?.identifier?.find(item =>
    (item.type?.coding?.some((coding: Coding) => coding.code === 'MR') ?? false) ||
    (item.type?.text ?? '').toLowerCase().includes('medical record')
  );
  return identifier?.value ?? patient?.identifier?.[0]?.value ?? null;
}

export const ENCOUNTER_STATUS_LABELS: Record<Encounter['status'], string> = {
  planned: 'Planned',
  arrived: 'Arrived',
  triaged: 'Triaged',
  'in-progress': 'In progress',
  'on-scene': 'On scene',
  'in-transit': 'In transit',
  'at-destination': 'At destination',
  finished: 'Finished',
  cancelled: 'Cancelled',
  'entered-in-error': 'Entered in error',
  unknown: 'Unknown',
};

export const ENCOUNTER_PRIORITY_TONES: Record<
  NonNullable<Encounter['priority']>,
  Tone
> = {
  routine: 'neutral',
  urgent: 'warning',
  emergent: 'critical',
  critical: 'critical',
};

/**
 * The next status in the prehospital sequence, or null once the encounter has
 * been closed out.
 */
export function nextEncounterStatus(
  status: Encounter['status']
): Encounter['status'] | null {
  const flow: Encounter['status'][] = [
    'planned',
    'arrived',
    'triaged',
    'in-progress',
    'on-scene',
    'in-transit',
    'at-destination',
    'finished',
  ];
  const index = flow.indexOf(status);
  if (index < 0 || index === flow.length - 1) return null;
  return flow[index + 1] ?? null;
}

/** Human readable time of day, e.g. `Mon 25 Sep, 14:05`. */
export function formatTimeOfDay(date: Date = new Date()): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatClock(iso: string | null | undefined): string {  if (!iso) return '--:--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(iso)} ${formatClock(iso)}`;
}

/** Compact elapsed duration, e.g. `1h 04m` or `12m 30s`. */
export function formatDuration(fromIso: string | null | undefined): string {
  if (!fromIso) return '—';
  const start = Date.parse(fromIso);
  if (!Number.isFinite(start)) return '—';

  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
  return `${remainder}s`;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return 'never';

  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return formatDate(iso);
}
