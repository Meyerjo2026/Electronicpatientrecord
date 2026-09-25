import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

const interventionTypes: Array<{
  id: string;
  name: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}> = [
  { id: 'airway', name: 'Airway Management', description: 'Assess and maintain the airway', icon: 'fitness-outline', color: colors.primary },
  { id: 'breathing', name: 'Breathing Support', description: 'Oxygen, ventilation, and airway adjuncts', icon: 'pulse-outline', color: colors.secondary },
  { id: 'circulation', name: 'Circulation', description: 'Hemorrhage control and circulation support', icon: 'heart-outline', color: colors.error },
  { id: 'medication', name: 'Medication', description: 'Record medications and doses', icon: 'medical-outline', color: colors.warning },
  { id: 'procedure', name: 'Procedures', description: 'Document performed procedures', icon: 'construct-outline', color: colors.info },
  { id: 'monitoring', name: 'Monitoring', description: 'Track devices, observations, and trends', icon: 'speedometer-outline', color: colors.triage.minimal },
];

export const InterventionsScreen: React.FC = () => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.pageHeader}>
      <Text style={styles.pageTitle}>Interventions</Text>
      <Text style={styles.pageSubtitle}>Document care delivered during this encounter.</Text>
    </View>

    <Text style={styles.sectionLabel}>Choose a category</Text>
    <View style={styles.grid}>
      {interventionTypes.map(type => (
        <TouchableOpacity
          key={type.id}
          style={styles.categoryCard}
          onPress={() => {}}
        >
          <View style={[styles.categoryIcon, { backgroundColor: type.color + '18' }]}>
            <Ionicons name={type.icon} size={24} color={type.color} />
          </View>
          <View style={styles.categoryCopy}>
            <Text style={styles.categoryName}>{type.name}</Text>
            <Text style={styles.categoryDescription}>{type.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.performedSection}>
      <View style={styles.performedHeader}>
        <Text style={styles.sectionTitle}>Performed Interventions</Text>
        <Text style={styles.count}>0</Text>
      </View>
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="checkmark-done-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Nothing documented yet</Text>
        <Text style={styles.emptyText}>Completed interventions will appear here.</Text>
      </View>
    </View>
  </ScrollView>
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
  pageHeader: {
    marginBottom: spacing.xl,
  },
  pageTitle: {
    ...typography.styles.largeTitle,
    color: colors.textPrimary,
  },
  pageSubtitle: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xxs,
  },
  grid: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  categoryCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  categoryIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  categoryCopy: {
    flex: 1,
  },
  categoryName: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  categoryDescription: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pressed: {
    backgroundColor: colors.fill,
  },
  performedSection: {
    marginTop: spacing.xl,
  },
  performedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.title3,
    color: colors.textPrimary,
  },
  count: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
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
});
