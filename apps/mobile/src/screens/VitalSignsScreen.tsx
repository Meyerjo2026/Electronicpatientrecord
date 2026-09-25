import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { recordVitalSigns } from '../store/observationSlice';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

export const VitalSignsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentVitalSigns, vitalSigns } = useSelector((state: RootState) => state.observation);

  const vitalsFields = [
    { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg' },
    { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
    { key: 'respiratoryRate', label: 'Respiratory Rate', unit: '/min' },
    { key: 'spo2', label: 'SpO₂', unit: '%' },
    { key: 'etco2', label: 'EtCO₂', unit: 'mmHg' },
    { key: 'temperature', label: 'Temperature', unit: '°C' },
    { key: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL' },
  ];

  const [formData, setFormData] = useState<Record<string, string>>({});
  const latestValues = currentVitalSigns as Record<string, { value?: number } | undefined> | null;

  const handleSave = () => {
    const numericData: Record<string, number> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num)) numericData[key] = num;
    });
    dispatch(recordVitalSigns({
      timestamp: new Date().toISOString(),
      ...numericData,
    } as any));
    setFormData({});
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Vital Signs</Text>
        <Text style={styles.pageSubtitle}>Record the latest observations for this encounter.</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formHeaderIcon}>
            <Ionicons name="pulse-outline" size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>New Observation Set</Text>
            <Text style={styles.subtitle}>All fields are optional</Text>
          </View>
        </View>

        {vitalsFields.map(field => (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter value"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={formData[field.key] ?? latestValues?.[field.key]?.value?.toString() ?? ''}
                onChangeText={value => setFormData(prev => ({ ...prev, [field.key]: value }))}
              />
              <Text style={styles.unit}>{field.unit}</Text>
            </View>
          </View>
        ))}

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>GCS</Text>
          <View style={styles.gcsInputs}>
            <GCSInput label="E" placeholder="4" />
            <GCSInput label="V" placeholder="5" />
            <GCSInput label="M" placeholder="6" />
            <View style={styles.gcsTotalBox}>
              <Text style={styles.gcsTotal}>15</Text>
              <Text style={styles.gcsTotalLabel}>Total</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={20} color={colors.textInverse} />
          <Text style={styles.saveButtonText}>Save Vital Signs</Text>
        </TouchableOpacity>
      </View>

      {vitalSigns.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>History</Text>
            <Text style={styles.historyCount}>{vitalSigns.length} {vitalSigns.length === 1 ? 'set' : 'sets'}</Text>
          </View>
          <View style={styles.historyCard}>
            {vitalSigns.slice().reverse().map((vs, index, list) => (
              <View key={`${vs.timestamp}-${index}`} style={[styles.historyItem, index < list.length - 1 && styles.historyItemBorder]}>
                <View style={styles.historyTimeBox}>
                  <Text style={styles.historyTime}>{new Date(vs.timestamp).toLocaleDateString()}</Text>
                  <Text style={styles.historyTime}>{new Date(vs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={styles.historyVitals}>
                  {vs.systolicBP && vs.diastolicBP && (
                    <Text style={styles.historyText}>{vs.systolicBP.value}/{vs.diastolicBP.value} mmHg</Text>
                  )}
                  {vs.heartRate && <Text style={styles.historyText}>HR {vs.heartRate.value}</Text>}
                  {vs.spo2 && <Text style={styles.historyText}>SpO₂ {vs.spo2.value}%</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const GCSInput: React.FC<{ label: string; placeholder: string }> = ({ label, placeholder }) => (
  <View style={styles.gcsInput}>
    <Text style={styles.gcsLabel}>{label}</Text>
    <TextInput
      style={styles.gcsInputField}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType="number-pad"
      maxLength={1}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  pageHeader: {
    marginBottom: spacing.lg,
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
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  formHeaderIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.title3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginLeft: spacing.xxs,
  },
  inputWrapper: {
    minHeight: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.fill,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  input: {
    flex: 1,
    height: layout.controlHeight,
    color: colors.textPrimary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.md,
  },
  unit: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
  },
  gcsInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  gcsInput: {
    flex: 1,
  },
  gcsLabel: {
    ...typography.styles.caption2,
    color: colors.textTertiary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  gcsInputField: {
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.fill,
    color: colors.textPrimary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.lg,
    textAlign: 'center',
  },
  gcsTotalBox: {
    width: 64,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  gcsTotal: {
    ...typography.styles.headline,
    color: colors.primary,
  },
  gcsTotalLabel: {
    ...typography.styles.caption2,
    color: colors.primary,
  },
  saveButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    ...typography.styles.headline,
    color: colors.textInverse,
  },
  historySection: {
    marginTop: spacing.xl,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  historyCount: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
  },
  historyCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  historyItem: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  historyTimeBox: {
    width: 92,
  },
  historyTime: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
  historyVitals: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  historyText: {
    ...typography.styles.footnote,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
