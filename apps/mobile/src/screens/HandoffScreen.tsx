import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

const handoffTypes: Array<{
  id: string;
  name: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { id: 'imist', name: 'IMIST-AMBO', description: 'Standard handoff format', icon: 'reader-outline' },
  { id: 'sbar', name: 'SBAR', description: 'Situation, background, assessment, recommendation', icon: 'chatbubbles-outline' },
  { id: 'cda', name: 'CDA Document', description: 'Clinical Document Architecture', icon: 'document-text-outline' },
  { id: 'fhir', name: 'FHIR Bundle', description: 'FHIR R4 transfer bundle', icon: 'git-network-outline' },
];

export const HandoffScreen: React.FC = () => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.pageHeader}>
      <Text style={styles.pageTitle}>Handoff</Text>
      <Text style={styles.pageSubtitle}>Create a clear, structured transfer of care.</Text>
    </View>

    <Text style={styles.sectionLabel}>Handoff format</Text>
    <View style={styles.typeList}>
      {handoffTypes.map((type, index) => (
        <TouchableOpacity
          key={type.id}
          style={[styles.typeRow, index < handoffTypes.length - 1 && styles.rowBorder]}
          onPress={() => {}}
        >
          <View style={styles.typeIcon}>
            <Ionicons name={type.icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.typeCopy}>
            <Text style={styles.typeName}>{type.name}</Text>
            <Text style={styles.typeDescription}>{type.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.previewSection}>
      <View style={styles.previewHeader}>
        <View>
          <Text style={styles.sectionTitle}>Preview</Text>
          <Text style={styles.previewSubtitle}>IMIST-AMBO handoff</Text>
        </View>
        <View style={styles.previewBadge}>
          <Ionicons name="eye-outline" size={15} color={colors.primary} />
          <Text style={styles.previewBadgeText}>Live preview</Text>
        </View>
      </View>
      <View style={styles.previewBox}>
        {[
          ['Identification', 'Patient name, date of birth, ID'],
          ['Mechanism', 'MVC, fall, or medical'],
          ['Injuries', 'Head, chest, abdomen…'],
          ['Signs', 'BP 120/80, HR 88, RR 16, SpO₂ 98%'],
          ['Treatment', 'IV, oxygen, C-collar, splints'],
          ['Background', 'History, medications, allergies'],
          ['Other', 'Pregnancy, tetanus, and relevant details'],
        ].map(([label, value], index) => (
          <View key={label} style={[styles.previewRow, index < 6 && styles.previewRowBorder]}>
            <Text style={styles.previewLabel}>{label}</Text>
            <Text style={styles.previewValue}>{value}</Text>
          </View>
        ))}
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
  typeList: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  typeRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  typeIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.md,
  },
  typeCopy: {
    flex: 1,
  },
  typeName: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  typeDescription: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewSection: {
    marginTop: spacing.xl,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.title3,
    color: colors.textPrimary,
  },
  previewSubtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  previewBadgeText: {
    ...typography.styles.caption2,
    color: colors.primary,
    fontWeight: '600',
  },
  previewBox: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  previewRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  previewLabel: {
    width: 112,
    ...typography.styles.footnote,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  previewValue: {
    flex: 1,
    ...typography.styles.footnote,
    color: colors.textSecondary,
  },
});
