import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createPatient } from '../store/patientSlice';
import { createEncounter } from '../store/encounterSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { 
  getFormSections, 
  getFormElements, 
  getValueSetForElement,
  validatePatientReportFormData,
  createEmptyPatientReportFormData,
  type FormElementConfig,
  type FormSectionConfig 
} from '@prehospital-epr/nemsis';

export const PatientReportScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentPatient } = useSelector((state: RootState) => state.patient);
  const { currentEncounter } = useSelector((state: RootState) => state.encounter);

  const [formData, setFormData] = useState<Record<string, any>>(createEmptyPatientReportFormData());
  const [activeSection, setActiveSection] = useState<string>('ePatient');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections = useMemo(() => getFormSections(), []);
  const currentSection = useMemo(() => sections.find(s => s.id === activeSection), [sections, activeSection]);

  const handleValueChange = useCallback((sectionId: string, elementCode: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [elementCode]: value },
    }));
    // Clear error for this field
    setErrors(prev => prev.filter(e => !e.includes(elementCode)));
  }, []);

  const handleSaveDraft = useCallback(() => {
    // Save to local storage or dispatch to store
    console.log('Saving draft:', formData);
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const validationErrors = validatePatientReportFormData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Create patient from ePatient data
      const patientData = formData.ePatient;
      if (patientData['ePatient.02'] || patientData['ePatient.03']) {
        const patient = {
          id: patientData['ePatient.01'] || undefined,
          resourceType: 'Patient' as const,
          identifier: patientData['ePatient.01'] ? [{ value: patientData['ePatient.01'] }] : [],
          name: [{
            family: patientData['ePatient.02'],
            given: patientData['ePatient.03'] ? [patientData['ePatient.03']] : [],
            suffix: patientData['ePatient.23'] ? [patientData['ePatient.23']] : [],
          }],
          gender: patientData['ePatient.25'] === '9919001' ? 'female' : 
                  patientData['ePatient.25'] === '9919003' ? 'male' : 'unknown',
          birthDate: patientData['ePatient.17'],
          address: patientData['ePatient.05'] ? [{
            line: [patientData['ePatient.05']],
            city: patientData['ePatient.06'],
            district: patientData['ePatient.07'],
            state: patientData['ePatient.08'],
            postalCode: patientData['ePatient.09'],
            country: patientData['ePatient.10'],
          }] : [],
          telecom: [
            patientData['ePatient.18'] ? { system: 'phone', value: patientData['ePatient.18'] } : null,
            patientData['ePatient.19'] ? { system: 'email', value: patientData['ePatient.19'] } : null,
          ].filter(Boolean) as any[],
        };
        const patientResult = await dispatch(createPatient(patient as any)).unwrap();
        
        // Create encounter linking to patient
        if (currentEncounter) {
          await dispatch(createEncounter({
            ...currentEncounter,
            subject: { reference: `Patient/${patientResult.id}`, display: patientResult.name?.[0]?.family },
          })).unwrap();
        }
      }

      setErrors([]);
      console.log('Patient report submitted successfully');
    } catch (error) {
      console.error('Submit failed:', error);
      setErrors(['Failed to submit report. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, formData, currentEncounter]);

  const renderField = (element: FormElementConfig) => {
    const value = formData[element.sectionId]?.[element.code] ?? '';
    const valueSet = getValueSetForElement(element);
    
    switch (element.controlType) {
      case 'select':
        return (
          <TouchableOpacity style={styles.selectButton} onPress={() => { /* show picker */ }}>
            <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
              {value ? valueSet?.values.find(v => v.code === value)?.label || value : 'Select...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        );
      case 'radio':
        return (
          <View style={styles.radioGroup}>
            {valueSet?.values.slice(0, 5).map(opt => (
              <TouchableOpacity key={opt.code} style={[
                styles.radioOption,
                value === opt.code && styles.radioOptionSelected
              ]} onPress={() => handleValueChange(element.sectionId, element.code, opt.code)}>
                <View style={[
                  styles.radioCircle,
                  value === opt.code && styles.radioCircleSelected
                ]} />
                <Text style={styles.radioLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'textarea':
        return (
          <TextInput
            style={styles.textarea}
            value={value}
            onChangeText={v => handleValueChange(element.sectionId, element.code, v)}
            multiline
            numberOfLines={4}
            placeholder={element.placeholder || element.definition}
          />
        );
      case 'number':
        return (
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={v => handleValueChange(element.sectionId, element.code, v)}
            keyboardType="numeric"
            placeholder={element.placeholder}
          />
        );
      case 'datetime':
        return (
          <TouchableOpacity style={styles.datetimeButton} onPress={() => { /* show datetime picker */ }}>
            <Text style={value ? styles.datetimeValue : styles.datetimePlaceholder}>
              {value ? new Date(value).toLocaleString() : 'Select date & time'}
            </Text>
          </TouchableOpacity>
        );
      case 'date':
        return (
          <TouchableOpacity style={styles.dateButton} onPress={() => { /* show date picker */ }}>
            <Text style={value ? styles.dateValue : styles.datePlaceholder}>
              {value ? new Date(value).toLocaleDateString() : 'Select date'}
            </Text>
          </TouchableOpacity>
        );
      case 'gps':
        return (
          <View style={styles.gpsInputs}>
            <TextInput style={styles.gpsInput} placeholder="Latitude" value={String(value?.lat || '')} onChangeText={v => handleValueChange(element.sectionId, element.code, { ...value, lat: parseFloat(v) })} keyboardType="decimal-pad" />
            <TextInput style={styles.gpsInput} placeholder="Longitude" value={String(value?.lon || '')} onChangeText={v => handleValueChange(element.sectionId, element.code, { ...value, lon: parseFloat(v) })} keyboardType="decimal-pad" />
          </View>
        );
      default:
        return (
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={v => handleValueChange(element.sectionId, element.code, v)}
            placeholder={element.placeholder || element.definition}
            multiline={element.controlType === 'textarea'}
          />
        );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        {sections.map(section => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.sectionTab,
              activeSection === section.id && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection(section.id)}
          >
            <Text style={[
              styles.sectionTabText,
              activeSection === section.id && styles.sectionTabTextActive,
            ]}>
              {section.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Form Content */}
      {currentSection && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{currentSection.name}</Text>
            <Text style={styles.formSubtitle}>
              {currentSection.elements.filter(e => e.required).length} required fields
            </Text>
          </View>

          {currentSection.elements.map(element => (
            <View key={element.code} style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={[
                  styles.fieldLabel,
                  element.required && styles.fieldLabelRequired,
                ]}>
                  {element.name}
                  {element.required && <Text style={styles.requiredAsterisk}> *</Text>}
                </Text>
                {element.hasValueSet && <Text style={styles.valueSetBadge}>List</Text>}
              </View>
              <Text style={styles.fieldHelp}>{element.definition}</Text>
              {renderField(element)}
              {errors.some(e => e.includes(element.code)) && (
                <Text style={styles.fieldError}>
                  {errors.find(e => e.includes(element.code))}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft} disabled={isSubmitting}>
          <Text style={styles.draftButtonText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  sectionTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  sectionTabActive: {
    backgroundColor: colors.primaryLight,
  },
  sectionTabText: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary },
  sectionTabTextActive: { color: colors.primary, fontWeight: '600' },
  formCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  formHeader: { marginBottom: spacing.lg },
  formTitle: { fontSize: typography.sizes.xl, fontWeight: '600', color: colors.textPrimary },
  formSubtitle: { fontSize: typography.sizes.sm, color: colors.textTertiary, marginTop: spacing.xs },
  fieldContainer: { marginBottom: spacing.lg },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  fieldLabel: { fontSize: typography.sizes.md, fontWeight: '500', color: colors.textPrimary, flex: 1 },
  fieldLabelRequired: { color: colors.error },
  requiredAsterisk: { color: colors.error, fontSize: typography.sizes.lg },
  valueSetBadge: { fontSize: typography.sizes.xs, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: borderRadius.sm },
  fieldHelp: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginBottom: spacing.sm },
  input: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, fontSize: typography.sizes.md, backgroundColor: colors.background },
  textarea: { ...StyleSheet.flatten([styles.input, { minHeight: 100, textAlignVertical: 'top' }]) },
  selectButton: { ...StyleSheet.flatten([styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]) },
  selectValue: { fontSize: typography.sizes.md, color: colors.textPrimary },
  selectPlaceholder: { fontSize: typography.sizes.md, color: colors.textTertiary },
  chevron: { fontSize: typography.sizes.md, color: colors.textTertiary },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full },
  radioOptionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioCircleSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioLabel: { fontSize: typography.sizes.sm, color: colors.textPrimary },
  datetimeButton: { ...StyleSheet.flatten([styles.input, { justifyContent: 'center' }]) },
  datetimeValue: { fontSize: typography.sizes.md, color: colors.textPrimary },
  datetimePlaceholder: { fontSize: typography.sizes.md, color: colors.textTertiary },
  dateButton: { ...StyleSheet.flatten([styles.input, { justifyContent: 'center' }]) },
  dateValue: { fontSize: typography.sizes.md, color: colors.textPrimary },
  datePlaceholder: { fontSize: typography.sizes.md, color: colors.textTertiary },
  gpsInputs: { flexDirection: 'row', gap: spacing.md },
  gpsInput: { flex: 1, ...StyleSheet.flatten([styles.input]) },
  fieldError: { fontSize: typography.sizes.xs, color: colors.error, marginTop: spacing.xs },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginTop: spacing.lg },
  draftButton: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  draftButtonText: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.textPrimary },
  submitButton: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { backgroundColor: colors.textTertiary },
  submitButtonText: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.white },
});