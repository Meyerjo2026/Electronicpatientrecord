import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createEncounter, setActiveEncounter } from '../store/encounterSlice';
import { searchPatients } from '../store/patientSlice';
import { syncNow } from '../store/syncSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentEncounter, encounters, activeEncounterId } = useSelector((state: RootState) => state.encounter);
  const { isAuthenticated, session } = useSelector((state: RootState) => state.auth);
  const { isOnline, isSyncing, lastSyncTime, pendingOperations } = useSelector((state: RootState) => state.sync);
  const { patients } = useSelector((state: RootState) => state.patient);

  const handleNewEncounter = () => {
    dispatch(createEncounter({
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good morning, {session?.roles?.[0]?.replace('EMS_', '') || 'Provider'}</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isOnline ? colors.success + '20' : colors.error + '20' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isOnline ? colors.success : colors.error }
            ]} />
            <Text style={[
              styles.statusText,
              { color: isOnline ? colors.success : colors.error }
            ]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {currentEncounter && (
        <View style={styles.activeEncounterCard}>
          <View style={styles.activeEncounterHeader}>
            <Text style={styles.activeEncounterLabel}>ACTIVE ENCOUNTER</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(currentEncounter.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(currentEncounter.status) }
              ]}>
                {formatStatus(currentEncounter.status)}
              </Text>
            </View>
          </View>
          <View style={styles.activeEncounterInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Unit</Text>
              <Text style={styles.infoValue}>Medic 12</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={[
                styles.infoValue,
                { color: getPriorityColor(currentEncounter.priority || 'urgent') }
              ]}>
                {currentEncounter.priority?.toUpperCase() || 'URGENT'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>{calculateDuration(currentEncounter.period.start)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={() => dispatch(setActiveEncounter(currentEncounter.id))}>
            <Text style={styles.continueButtonText}>Continue Encounter</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={handleNewEncounter}>
          <View style={styles.actionIcon}><Text style={styles.actionIconText}>+</Text></View>
          <Text style={styles.actionTitle}>New Encounter</Text>
          <Text style={styles.actionSubtitle}>Start patient care record</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => {}}>
          <View style={styles.actionIcon}><Text style={styles.actionIconText}>👤</Text></View>
          <Text style={styles.actionTitle}>Find Patient</Text>
          <Text style={styles.actionSubtitle}>Search existing records</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={handleSync} disabled={isSyncing}>
          <View style={styles.actionIcon}><Text style={styles.actionIconText}>{isSyncing ? '⟳' : '☁'}</Text></View>
          <Text style={styles.actionTitle}>Sync Data</Text>
          <Text style={styles.actionSubtitle}>
            {isSyncing ? 'Syncing...' : pendingOperations > 0 ? `${pendingOperations} pending` : 'Up to date'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => {}}>
          <View style={styles.actionIcon}><Text style={styles.actionIconText}>📋</Text></View>
          <Text style={styles.actionTitle}>Protocols</Text>
          <Text style={styles.actionSubtitle}>Clinical guidelines</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Recent Encounters</Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recentEncounters}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.encounterRow} onPress={() => dispatch(setActiveEncounter(item.id))}>
            <View style={[
              styles.encounterStatusIndicator,
              { backgroundColor: getStatusColor(item.status) }
            ]} />
            <View style={styles.encounterInfo}>
              <View style={styles.encounterRowTop}>
                <Text style={styles.encounterType}>{item.class?.toUpperCase() || 'EMERGENCY'}</Text>
                <Text style={[
                  styles.encounterTime,
                  { color: getPriorityColor(item.priority || 'urgent') }
                ]}>
                  {item.priority?.toUpperCase() || 'URGENT'}
                </Text>
              </View>
              <Text style={styles.encounterDetail}>{item.period.start ? formatDateTime(item.period.start) : 'No time'}</Text>
              <Text style={styles.encounterDetail}>{item.subject?.display || 'Unknown Patient'}</Text>
            </View>
            <View style={[
              styles.encounterStatusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' }
            ]}>
              <Text style={[
                styles.encounterStatusText,
                { color: getStatusColor(item.status) }
              ]}>
                {formatStatus(item.status)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent encounters</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleNewEncounter}>
              <Text style={styles.emptyButtonText}>Create First Encounter</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'planned': colors.info,
    'arrived': colors.warning,
    'triaged': colors.warning,
    'in-progress': colors.primary,
    'on-scene': colors.primary,
    'in-transit': colors.secondary,
    'at-destination': colors.info,
    'finished': colors.success,
    'cancelled': colors.error,
    'entered-in-error': colors.error,
    'unknown': colors.textTertiary,
  };
  return statusColors[status] || colors.textTertiary;
}

function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    'routine': colors.info,
    'urgent': colors.warning,
    'emergent': colors.error,
    'critical': colors.error,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  date: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  activeEncounterCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  activeEncounterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeEncounterLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  activeEncounterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  viewAllButton: {
    padding: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  encounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  encounterStatusIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: spacing.md,
  },
  encounterInfo: {
    flex: 1,
  },
  encounterRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  encounterType: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  encounterTime: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  encounterDetail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  encounterStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginLeft: spacing.md,
  },
  encounterStatusText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});