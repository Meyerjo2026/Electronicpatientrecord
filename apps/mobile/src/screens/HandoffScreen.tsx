import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

const handoffTypes = [
  { id: 'imist', name: 'IMIST-AMBO', description: 'Standard handoff format', color: colors.primary },
  { id: 'sbar', name: 'SBAR', description: 'Situation-Background-Assessment-Recommendation', color: colors.secondary },
  { id: 'cda', name: 'CDA Document', description: 'Clinical Document Architecture', color: colors.info },
  { id: 'fhir', name: 'FHIR Bundle', description: 'FHIR R4 transfer bundle', color: colors.warning },
];

export const HandoffScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.sectionTitle}>Patient Handoff</Text>
        <Text style={styles.subtitle}>Generate and send patient handoff reports</Text>
      </View>

      <View style={styles.grid}>
        {handoffTypes.map(type => (
          <TouchableOpacity key={type.id} style={[styles.categoryCard, { borderLeftColor: type.color }]}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{type.name}</Text>
            </View>
            <Text style={styles.categoryDesc}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>IMIST-AMBO Handoff</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Identification:</Text> Patient Name, DOB, ID</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Mechanism:</Text> MVC / Fall / Medical</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Injuries:</Text> Head, Chest, Abdomen...</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Signs:</Text> BP 120/80, HR 88, RR 16, SpO2 98%</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Treatment:</Text> IV, O2, C-collar, Splints</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Background:</Text> PMH, Meds, Allergies</Text>
          <Text style={styles.previewLine}><Text style={styles.previewLabel}>Other:</Text> Pregnancy, Tetanus, etc.</Text>
        </View>
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
    ...shadows.sm,
    borderLeftWidth: 4,
  },
  categoryHeader: { marginBottom: spacing.sm },
  categoryName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.textPrimary },
  categoryDesc: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: 'center' },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  previewBox: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.md },
  previewLine: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontFamily: 'monospace' },
  previewLabel: { fontWeight: '600', color: colors.textPrimary },
});