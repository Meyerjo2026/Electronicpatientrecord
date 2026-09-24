import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setCurrentEncounter, updateEncounterStatus } from '../store/encounterSlice';
import { recordVitalSigns } from '../store/observationSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

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
        <Text style={styles.emptyTitle}>No Active Encounter</Text>
        <Text style={styles.emptySubtitle}>Create or select an encounter to begin documentation</Text>
      </View>
    );
  }

  const statusOption = statusOptions.find(s => s.value === encounter.status) || statusOptions[0];
  const currentIndex = statusOptions.findIndex(s => s.value === encounter.status);
  const nextStatus = currentIndex < statusOptions.length - 1 ? statusOptions[currentIndex + 1] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Encounter Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {currentPatient?.name?.[0]?.given?.[0]} {currentPatient?.name?.[0]?.family}
            </Text>
            <Text style={styles.patientDetails}>
              {currentPatient?.gender?.charAt(0).toUpperCase()} | {currentPatient?.birthDate ? calculateAge(currentPatient.birthDate) : '?'}y
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusOption.color + '20' }
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: statusOption.color }
            ]}>
              {statusOption.label}
            </Text>
          </View>
        </View>

        <View style={styles.encounterMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Unit</Text>
            <Text style={styles.metaValue}>Medic 12 (ALS)</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Priority</Text>
            <Text style={[
              styles.metaValue,
              { color: getPriorityColor(encounter.priority || 'urgent') }
            ]}>
              {encounter.priority?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Duration</Text>
            <Text style={styles.metaValue}>{calculateDuration(encounter.period.start)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Incident #</Text>
            <Text style={styles.metaValue}>{encounter.id.slice(-8)}</Text>
          </View>
        </View>

        {nextStatus && (
          <TouchableOpacity 
            style={[
              styles.nextStatusButton,
              { backgroundColor: nextStatus.color }
            ]}
            onPress={() => handleStatusChange(nextStatus.value)}
          >
            <Text style={styles.nextStatusButtonText}>
              → {nextStatus.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Progress */}
      <View style={styles.progressContainer}>
        {statusOptions.map((opt, index) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.progressItem}
            onPress={() => handleStatusChange(opt.value)}
            disabled={index > currentIndex + 1}
          >
            <View style={[
              styles.progressStep,
              { 
                backgroundColor: index <= currentIndex ? opt.color : colors.border,
                borderColor: index === currentIndex ? opt.color : colors.border,
              }
            ]}>
              {index < currentIndex && <Text style={styles.progressCheck}>✓</Text>}
              {index === currentIndex && <Text style={styles.progressCurrent}>{index + 1}</Text>}
              {index > currentIndex && <Text style={styles.progressNumber}>{index + 1}</Text>}
            </View>
            <Text style={[
              styles.progressLabel,
              { color: index <= currentIndex ? opt.color : colors.textTertiary }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionButtonIcon}>📊</Text>
            <Text style={styles.actionButtonText}>Vital Signs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionButtonIcon}>💊</Text>
            <Text style={styles.actionButtonText}>Medications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionButtonIcon}>🩺</Text>
            <Text style={styles.actionButtonText}>Procedures</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionButtonIcon}>📝</Text>
            <Text style={styles.actionButtonText}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionButtonIcon}>🏥</Text>
            <Text style={styles.actionButtonText}>Handoff</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Text style={styles.actionButtonIcon}>📋</Text>
            <Text style={styles.actionButtonText}>Protocols</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Vitals Summary */}
      {currentVitalSigns && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Vital Signs</Text>
            <Text style={styles.vitalsTime}>
              {new Date(currentVitalSigns.timestamp).toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.vitalsGrid}>
            {currentVitalSigns.systolicBP && currentVitalSigns.diastolicBP && (
              <View style={styles.vitalCard}>
                <Text style={styles.vitalLabel}>BP</Text>
                <Text style={styles.vitalValue}>
                  {currentVitalSigns.systolicBP.value}/{currentVitalSigns.diastolicBP.value}
                </Text>
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

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timeline}>
          <TimelineItem 
            time={formatTime(encounter.period.start)} 
            title="Encounter Started" 
            description={`Priority: ${encounter.priority}`}
            color={colors.info}
            isFirst
          />
          {encounter.status !== 'planned' && (
            <TimelineItem 
              time={formatTime(new Date().toISOString())} 
              title={getStatusLabel(encounter.status)} 
              description="Status updated"
              color={statusOption.color}
            />
          )}
          {vitalSigns.length > 0 && (
            <TimelineItem 
              time={formatTime(vitalSigns[vitalSigns.length - 1].timestamp)} 
              title="Vital Signs Recorded" 
              description={`${vitalSigns.length} sets recorded`}
              color={colors.primary}
            />
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
    'arrived': 'Arrived on Scene',
    'triaged': 'Patient Triaged',
    'in-progress': 'Treatment Initiated',
    'in-transit': 'Transport Started',
    'at-destination': 'Arrived at Hospital',
    'finished': 'Encounter Completed',
  };
  return labels[status] || status;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'routine': '#0066CC',
    'urgent': '#FF9900',
    'emergent': '#CC0000',
    'critical': '#CC0000',
  };
  return colors[priority] || '#1A1A1A';
}

const TimelineItem: React.FC<{
  time: string;
  title: string;
  description: string;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ time, title, description, color, isFirst, isLast }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLine}>
      <View style={[
        styles.timelineDot,
        { backgroundColor: color },
        isFirst && { borderWidth: 3, borderColor: colors.surface }
      ]} />
      {!isLast && <View style={styles.timelineConnector} />}
    </View>
    <View style={styles.timelineContent}>
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTime}>{time}</Text>
        <Text style={[
          styles.timelineTitle,
          { color }
        ]}>{title}</Text>
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
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  patientDetails: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  encounterMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    minWidth: '40%',
  },
  metaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  nextStatusButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  nextStatusButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  progressCheck: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressCurrent: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  progressNumber: {
    color: colors.textTertiary,
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  progressLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    textAlign: 'center',
    width: 70,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  vitalsTime: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  actionButtonIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  vitalCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  vitalLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  vitalValue: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vitalUnit: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 1,
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: -spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  timelineTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  timelineDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm + spacing.sm + 20, // Align with title
  },
});