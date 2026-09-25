import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createEncounter, setActiveEncounter } from '../store/encounterSlice';
import { syncNow } from '../store/syncSlice';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentEncounter, encounters } = useSelector((state: RootState) => state.encounter);
  const { session } = useSelector((state: RootState) => state.auth);
  const { isOnline, isSyncing, pendingOperations } = useSelector((state: RootState) => state.sync);

  const handleNewEncounter = () => {
    dispatch(createEncounter({
      id: '',
      resourceType: 'Encounter',
      subject: { reference: 'Patient/new', display: 'New Patient' },
      class: 'emergency',
      period: { start: new Date().toISOString() },
      priority: 'urgent',
      status: 'planned',
    }));
  };

  const handleSync = () => {
    dispatch(syncNow());
  };

  const recentEncounters = encounters.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            Good {getDayPart()}, {session?.roles?.[0]?.replace('EMS_', '') || 'Provider'}
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View
          style={[
            styles.connectionBadge,
            { backgroundColor: isOnline ? colors.secondaryLight : colors.error + '18' },
          ]}
        >
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: isOnline ? colors.success : colors.error },
            ]}
          />
          <Text
            style={[
              styles.connectionText,
              { color: isOnline ? colors.secondaryDark : colors.error },
            ]}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {currentEncounter && (
        <View style={styles.activeEncounterCard}>
          <View style={styles.activeEncounterHeader}>
            <View style={styles.activeLabelRow}>
              <View style={styles.liveDot} />
              <Text style={styles.activeEncounterLabel}>Active Encounter</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(currentEncounter.status) + '18' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(currentEncounter.status) },
                ]}
              >
                {formatStatus(currentEncounter.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.activePatientName}>
            {currentEncounter.subject?.display || 'New Patient'}
          </Text>

          <View style={styles.activeEncounterInfo}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Unit</Text>
              <Text style={styles.infoValue}>Medic 12</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: getPriorityColor(currentEncounter.priority || 'urgent') },
                ]}
              >
                {currentEncounter.priority?.toUpperCase() || 'URGENT'}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {calculateDuration(currentEncounter.period.start || new Date().toISOString())}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => dispatch(setActiveEncounter(currentEncounter.id || null))}
          >
            <Text style={styles.continueButtonText}>Continue Encounter</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>Common tasks</Text>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleNewEncounter}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>New Encounter</Text>
            <Text style={styles.actionSubtitle}>Start a patient care record</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {}}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="search" size={22} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Find Patient</Text>
            <Text style={styles.actionSubtitle}>Search existing records</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleSync}
          disabled={isSyncing}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="sync" size={22} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Sync Data</Text>
            <Text style={styles.actionSubtitle}>
              {isSyncing ? 'Syncing…' : pendingOperations > 0 ? `${pendingOperations} pending` : 'Up to date'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {}}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>Protocols</Text>
            <Text style={styles.actionSubtitle}>Clinical guidelines</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Encounters</Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={() => {}}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentEncounters.length > 0 ? (
        <View style={styles.encounterList}>
          {recentEncounters.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.encounterRow,
                index < recentEncounters.length - 1 && styles.encounterRowBorder,
              ]}
              onPress={() => dispatch(setActiveEncounter(item.id || null))}
            >
              <View
                style={[
                  styles.encounterStatusIndicator,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              />
              <View style={styles.encounterInfo}>
                <View style={styles.encounterRowTop}>
                  <Text style={styles.encounterType}>
                    {item.class?.toUpperCase() || 'EMERGENCY'}
                  </Text>
                  <Text
                    style={[
                      styles.encounterTime,
                      { color: getPriorityColor(item.priority || 'urgent') },
                    ]}
                  >
                    {item.priority?.toUpperCase() || 'URGENT'}
                  </Text>
                </View>
                <Text style={styles.encounterPatient}>
                  {item.subject?.display || 'Unknown Patient'}
                </Text>
                <Text style={styles.encounterDetail}>
                  {item.period.start ? formatDateTime(item.period.start) : 'No time'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="clipboard-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No recent encounters</Text>
          <Text style={styles.emptyText}>Start a new encounter when you’re ready.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleNewEncounter}>
            <Text style={styles.emptyButtonText}>Create First Encounter</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

function getDayPart(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    planned: colors.info,
    arrived: colors.warning,
    triaged: colors.warning,
    'in-progress': colors.primary,
    'on-scene': colors.primary,
    'in-transit': colors.secondary,
    'at-destination': colors.info,
    finished: colors.success,
    cancelled: colors.error,
    'entered-in-error': colors.error,
    unknown: colors.textTertiary,
  };
  return statusColors[status] || colors.textTertiary;
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

function formatStatus(status: string): string {
  return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateDuration(start: string): string {
  const diff = Date.now() - new Date(start).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  greeting: {
    ...typography.styles.largeTitle,
    color: colors.textPrimary,
  },
  date: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  connectionText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  activeEncounterCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  activeEncounterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  activeEncounterLabel: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.styles.caption2,
    fontWeight: '600',
  },
  activePatientName: {
    ...typography.styles.title2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  activeEncounterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.styles.caption2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.styles.footnote,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  infoDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: colors.separator,
  },
  continueButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  continueButtonText: {
    ...typography.styles.headline,
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.title3,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
  },
  viewAllButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  viewAllText: {
    ...typography.styles.subheadline,
    color: colors.primary,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: 210,
    minWidth: 210,
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: spacing.md,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  actionSubtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  encounterList: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  encounterRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  encounterRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  encounterStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
  },
  encounterInfo: {
    flex: 1,
  },
  encounterRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  encounterType: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  encounterTime: {
    ...typography.styles.caption2,
    fontWeight: '600',
  },
  encounterPatient: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  encounterDetail: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  emptyTitle: {
    ...typography.styles.headline,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  emptyButtonText: {
    ...typography.styles.subheadline,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
