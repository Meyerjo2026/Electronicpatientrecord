import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { updateEncounterStatus } from '../store/encounterSlice';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

export const EncounterScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentEncounter, encounters, activeEncounterId } = useSelector((state: RootState) => state.encounter);
  const { currentPatient } = useSelector((state: RootState) => state.patient);
  const { vitalSigns, currentVitalSigns } = useSelector((state: RootState) => state.observation);

  const encounter = currentEncounter || (activeEncounterId ? encounters.find(e => e.id === activeEncounterId) : null);

  const statusOptions = [
    { value: 'planned', label: 'Planned', color: colors.info },
    { value: 'arrived', label: 'On Scene', color: colors.warning },
    { value: 'triaged', label: 'Triaged', color: colors.warning },
    { value: 'in-progress', label: 'In Progress', color: colors.primary },
    { value: 'in-transit', label: 'Transporting', color: colors.secondary },
    { value: 'at-destination', label: 'At Hospital', color: colors.info },
    { value: 'finished', label: 'Completed', color: colors.success },
  ];

  const handleStatusChange = (status: string) => {
    if (encounter) {
      dispatch(updateEncounterStatus({ encounterId: encounter.id, status: status as any }));
    }
  };

  if (!encounter) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="pulse-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Active Encounter</Text>
        <Text style={styles.emptySubtitle}>Create or select an encounter to begin documentation.</Text>
      </View>
    );
  }

  const statusOption = statusOptions.find(s => s.value === encounter.status) || statusOptions[0];
  const foundIndex = statusOptions.findIndex(s => s.value === encounter.status);
  const currentIndex = foundIndex < 0 ? 0 : foundIndex;
  const nextStatus = currentIndex < statusOptions.length - 1 ? statusOptions[currentIndex + 1] : null;
  const patientName = currentPatient?.name?.[0]?.given?.[0]
    ? `${currentPatient.name[0].given?.[0]} ${currentPatient.name[0].family || ''}`
    : encounter.subject?.display || 'New Patient';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.patientInfo}>
            <Text style={styles.eyebrow}>Encounter</Text>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.patientDetails}>
              {currentPatient?.gender?.charAt(0).toUpperCase() || 'Unknown'} · {currentPatient?.birthDate ? calculateAge(currentPatient.birthDate) + ' years' : 'Age unknown'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusOption.color + '18' }]}>
            <View style={[styles.statusBadgeDot, { backgroundColor: statusOption.color }]} />
            <Text style={[styles.statusBadgeText, { color: statusOption.color }]}>{statusOption.label}</Text>
          </View>
        </View>

        <View style={styles.encounterMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Unit</Text>
            <Text style={styles.metaValue}>Medic 12 · ALS</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Priority</Text>
            <Text style={[styles.metaValue, { color: getPriorityColor(encounter.priority || 'urgent') }]}>
              {encounter.priority?.toUpperCase() || 'URGENT'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaValue}>{calculateDuration(encounter.period.start || new Date().toISOString())}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Incident #</Text>
            <Text style={styles.metaValue}>{(encounter.id || '').slice(-8)}</Text>
          </View>
        </View>

        {nextStatus && (
          <TouchableOpacity
            style={[styles.nextStatusButton, { backgroundColor: nextStatus.color }]}
            onPress={() => handleStatusChange(nextStatus.value)}
          >
            <Text style={styles.nextStatusButtonText}>Move to {nextStatus.label}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>Encounter progress</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressContent}>
        {statusOptions.map((opt, index) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.progressItem}
            onPress={() => handleStatusChange(opt.value)}
            disabled={index > currentIndex + 1}
          >
            <View
              style={[
                styles.progressStep,
                {
                  backgroundColor: index <= currentIndex ? opt.color : colors.fill,
                  borderColor: index === currentIndex ? opt.color : colors.separator,
                },
              ]}
            >
              {index < currentIndex && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
              {index === currentIndex && <Text style={styles.progressCurrent}>{index + 1}</Text>}
              {index > currentIndex && <Text style={styles.progressNumber}>{index + 1}</Text>}
            </View>
            <Text style={[styles.progressLabel, { color: index <= currentIndex ? opt.color : colors.textTertiary }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionHint}>Common documentation</Text>
        </View>
        <View style={styles.actionGrid}>
          {[
            { label: 'Vital Signs', icon: 'speedometer-outline' as const },
            { label: 'Medications', icon: 'medical-outline' as const },
            { label: 'Procedures', icon: 'construct-outline' as const },
            { label: 'Notes', icon: 'create-outline' as const },
            { label: 'Handoff', icon: 'swap-horizontal-outline' as const },
            { label: 'Protocols', icon: 'document-text-outline' as const },
          ].map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={() => {}}
            >
              <View style={styles.actionButtonIcon}>
                <Ionicons name={action.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {currentVitalSigns && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Vital Signs</Text>
            <Text style={styles.vitalsTime}>{new Date(currentVitalSigns.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.vitalsGrid}>
            {currentVitalSigns.systolicBP && currentVitalSigns.diastolicBP && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>BP</Text>
                <Text style={styles.vitalValue}>{currentVitalSigns.systolicBP.value}/{currentVitalSigns.diastolicBP.value}</Text>
                <Text style={styles.vitalUnit}>mmHg</Text>
              </View>
            )}
            {currentVitalSigns.heartRate && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>HR</Text>
                <Text style={styles.vitalValue}>{currentVitalSigns.heartRate.value}</Text>
                <Text style={styles.vitalUnit}>/min</Text>
              </View>
            )}
            {currentVitalSigns.respiratoryRate && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>RR</Text>
                <Text style={styles.vitalValue}>{currentVitalSigns.respiratoryRate.value}</Text>
                <Text style={styles.vitalUnit}>/min</Text>
              </View>
            )}
            {currentVitalSigns.spo2 && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>SpO₂</Text>
                <Text style={styles.vitalValue}>{currentVitalSigns.spo2.value}</Text>
                <Text style={styles.vitalUnit}>%</Text>
              </View>
            )}
            {currentVitalSigns.etco2 && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>EtCO₂</Text>
                <Text style={styles.vitalValue}>{currentVitalSigns.etco2.value}</Text>
                <Text style={styles.vitalUnit}>mmHg</Text>
              </View>
            )}
            {currentVitalSigns.gcs && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>GCS</Text>
                <Text style={styles.vitalValue}>{currentVitalSigns.gcs.total}</Text>
                <Text style={styles.vitalUnit}>E{currentVitalSigns.gcs.eye} V{currentVitalSigns.gcs.verbal} M{currentVitalSigns.gcs.motor}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timeline}>
          <TimelineItem time={formatTime(encounter.period.start || new Date().toISOString())} title="Encounter Started" description={`Priority: ${encounter.priority || 'urgent'}`} color={colors.info} isFirst />
          {encounter.status !== 'planned' && (
            <TimelineItem time={formatTime(new Date().toISOString())} title={getStatusLabel(encounter.status)} description="Status updated" color={statusOption.color} />
          )}
          {vitalSigns.length > 0 && (
            <TimelineItem time={formatTime(vitalSigns[vitalSigns.length - 1].timestamp || new Date().toISOString())} title="Vital Signs Recorded" description={`${vitalSigns.length} sets recorded`} color={colors.primary} />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calculateDuration(start: string): string {
  const diff = Date.now() - new Date(start).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    arrived: 'Arrived on Scene',
    triaged: 'Patient Triaged',
    'in-progress': 'Treatment Initiated',
    'in-transit': 'Transport Started',
    'at-destination': 'Arrived at Hospital',
    finished: 'Encounter Completed',
  };
  return labels[status] || status;
}

function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    routine: colors.info,
    urgent: colors.warning,
    emergent: colors.error,
    critical: colors.error,
  };
  return priorityColors[priority] || colors.textPrimary;
}

const TimelineItem: React.FC<{
  time: string;
  title: string;
  description: string;
  color: string;
  isFirst?: boolean;
}> = ({ time, title, description, color, isFirst }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLine}>
      <View style={[styles.timelineDot, { backgroundColor: color }, isFirst && styles.timelineDotFirst]} />
      <View style={styles.timelineConnector} />
    </View>
    <View style={styles.timelineContent}>
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTime}>{time}</Text>
        <Text style={[styles.timelineTitle, { color }]}>{title}</Text>
      </View>
      <Text style={styles.timelineDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
  },
  emptyTitle: {
    ...typography.styles.title2,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  patientInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    ...typography.styles.footnote,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  patientName: {
    ...typography.styles.title1,
    color: colors.textPrimary,
  },
  patientDetails: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  encounterMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  metaItem: {
    minWidth: '42%',
    flexGrow: 1,
  },
  metaLabel: {
    ...typography.styles.caption2,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.styles.footnote,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  nextStatusButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
  },
  nextStatusButtonText: {
    ...typography.styles.headline,
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionLabel: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xxs,
  },
  progressContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  progressItem: {
    width: 82,
    alignItems: 'center',
  },
  progressStep: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 2,
    marginBottom: spacing.xs,
  },
  progressCurrent: {
    ...typography.styles.footnote,
    color: colors.textInverse,
    fontWeight: '700',
  },
  progressNumber: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  progressLabel: {
    ...typography.styles.caption2,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.title3,
    color: colors.textPrimary,
  },
  sectionHint: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 94,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionButtonIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    ...typography.styles.footnote,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  vitalsTime: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  vitalCard: {
    flexGrow: 1,
    flexBasis: 100,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  vitalLabel: {
    ...typography.styles.caption2,
    color: colors.textTertiary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  vitalValue: {
    ...typography.styles.title2,
    color: colors.textPrimary,
  },
  vitalUnit: {
    ...typography.styles.caption2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeline: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 70,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    zIndex: 1,
  },
  timelineDotFirst: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.separator,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  timelineTime: {
    ...typography.styles.caption2,
    color: colors.textTertiary,
  },
  timelineTitle: {
    ...typography.styles.footnote,
    fontWeight: '600',
  },
  timelineDescription: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
