import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { recordVitalSigns } from '../store/observationSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

export const VitalSignsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentVitalSigns, vitalSigns } = useSelector((state: RootState) => state.observation);
  const { currentEncounter } = useSelector((state: RootState) => state.encounter);

  const vitalsFields = [
    { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg' },
    { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg' },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
    { key: 'respiratoryRate', label: 'Resp. Rate', unit: '/min' },
    { key: 'spo2', label: 'SpO₂', unit: '%' },
    { key: 'etco2', label: 'EtCO₂', unit: 'mmHg' },
    { key: 'temperature', label: 'Temperature', unit: '°C' },
    { key: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL' },
  ];

  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSave = () => {
    const numericData: Record<string, number> = {};
    Object.entries(formData).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num)) numericData[key] = num;
    });
    dispatch(recordVitalSigns({
      encounterId: currentEncounter?.id || 'new',
      timestamp: new Date().toISOString(),
      ...numericData,
    }));
    setFormData({});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.sectionTitle}>Record Vital Signs</Text>
        <Text style={styles.subtitle}>Enter the latest vital signs for this encounter</Text>
      </View>

      <View style={styles.formCard}>
        {vitalsFields.map(field => (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${field.label}`}
                keyboardType="numeric"
                value={formData[field.key] || ''}
                onChangeText={value => setFormData(prev => ({ ...prev, [field.key]: value }))}
                defaultValue={currentVitalSigns?.[field.key]?.value?.toString() || ''}
              />
              {field.unit && <Text style={styles.unit}>{field.unit}</Text>}
            </View>
          </View>
        ))}

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>GCS</Text>
          <View style={styles.gcsInputs}>
            <GCSInput label="E" placeholder="4" />
            <GCSInput label="V" placeholder="5" />
            <GCSInput label="M" placeholder="6" />
            <Text style={styles.gcsTotal}>Total: 15</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Vital Signs</Text>
        </TouchableOpacity>
      </View>

      {vitalSigns.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>Vital Signs History</Text>
          {vitalSigns.slice().reverse().map((vs, idx) => (
            <View key={vs.id || idx} style={styles.historyItem}>
              <Text style={styles.historyTime}>{new Date(vs.timestamp).toLocaleString()}</Text>
              <View style={styles.historyVitals}>
                {vs.systolicBP && vs.diastolicBP && (
                  <Text>{vs.systolicBP.value}/{vs.diastolicBP.value} mmHg</Text>
                )}
                {vs.heartRate && <Text>HR: {vs.heartRate.value}</Text>}
                {vs.spo2 && <Text>SpO₂: {vs.spo2.value}%</Text>}
              </View>
            </View>
          ))}
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
      keyboardType="numeric"
      maxLength={1}
    />
  </View>
);

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
  formCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  fieldContainer: { marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.sizes.md, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.xs },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, fontSize: typography.sizes.md },
  unit: { marginLeft: spacing.sm, fontSize: typography.sizes.md, color: colors.textSecondary },
  gcsInputs: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  gcsInput: { flex: 1 },
  gcsLabel: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginBottom: 2 },
  gcsInputField: { width: 50, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, textAlign: 'center' },
  gcsTotal: { marginLeft: spacing.md, fontSize: typography.sizes.md, fontWeight: '600', color: colors.primary },
  saveButton: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.lg },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '600' },
  historyCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  historyItem: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyTime: { fontSize: typography.sizes.sm, color: colors.textTertiary, marginBottom: spacing.xs },
  historyVitals: { flexDirection: 'row', gap: spacing.lg },
});