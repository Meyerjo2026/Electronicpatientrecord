import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const interventionTypes = [
  { id: 'airway', name: 'Airway Management', icon: '🫁', color: colors.primary },
  { id: 'breathing', name: 'Breathing Support', icon: '🌬️', color: colors.secondary },
  { id: 'circulation', name: 'Circulation', icon: '❤️', color: colors.error },
  { id: 'medication', name: 'Medication', icon: '💊', color: colors.warning },
  { id: 'procedure', name: 'Procedure', icon: '🩺', color: colors.info },
  { id: 'monitoring', name: 'Monitoring', icon: '📊', color: colors.triage.minimal },
];

export const InterventionsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentEncounter } = useSelector((state: RootState) => state.encounter);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.sectionTitle}>Interventions & Procedures</Text>
        <Text style={styles.subtitle}>Record interventions performed during this encounter</Text>
      </View>

      <View style={styles.grid}>
        {interventionTypes.map(type => (
          <TouchableOpacity key={type.id} style={[styles.categoryCard, { borderLeftColor: type.color }]}>
            <Text style={styles.categoryIcon}>{type.icon}</Text>
            <Text style={styles.categoryName}>{type.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performed Interventions</Text>
        <Text style={styles.emptyState}>No interventions recorded yet</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  sectionTitle: { fontSize: typography.sizes.xl, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: typography.sizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  grid: { paddingHorizontal: spacing.md, gap: spacing.md },
  categoryCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    borderLeftWidth: 4,
  },
  categoryIcon: { fontSize: 32, marginBottom: spacing.sm },
  categoryName: { fontSize: typography.sizes.md, fontWeight: '500', color: colors.textPrimary, textAlign: 'center' },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  emptyState: { textAlign: 'center', color: colors.textTertiary, marginTop: spacing.md, fontSize: typography.sizes.md },
});