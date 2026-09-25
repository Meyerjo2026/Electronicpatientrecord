import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createPatient } from '../store/patientSlice';
import { createEncounter } from '../store/encounterSlice';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';
import {
  getFormSections,
  getValueSetForElement,
  validatePatientReportFormData,
  createEmptyPatientReportFormData,
  type FormElementConfig,
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
  const currentSection = useMemo(() => sections.find(section => section.id === activeSection), [sections, activeSection]);

  const handleValueChange = useCallback((sectionId: string, elementCode: string, value: any) => {
    setFormData(previous => ({
      ...previous,
      [sectionId]: { ...previous[sectionId], [elementCode]: value },
    }));
    setErrors(previous => previous.filter(error => !error.includes(elementCode)));
  }, []);

  const handleSaveDraft = useCallback(() => {
    setErrors([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    const validationErrors = validatePatientReportFormData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
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
          gender: patientData['ePatient.25'] === '9919001' ? 'female' : patientData['ePatient.25'] === '9919003' ? 'male' : 'unknown',
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

        if (currentEncounter) {
          await dispatch(createEncounter({
            ...currentEncounter,
            subject: { reference: `Patient/${patientResult.id}`, display: patientResult.name?.[0]?.family },
          })).unwrap();
        }
      }

      setErrors([]);
    } catch {
      setErrors(['Failed to submit report. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, formData, currentEncounter]);

  const renderField = (element: FormElementConfig) => {
    const value = formData[element.sectionId]?.[element.code] ?? '';
    const valueSet = getValueSetForElement(element as any);

    switch (element.controlType) {
      case 'select':
        return (
          <TouchableOpacity style={styles.selectButton} onPress={() => {}}>
            <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
              {value ? valueSet?.values.find(option => option.code === value)?.label || value : 'Select…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        );
      case 'radio':
        return (
          <View style={styles.radioGroup}>
            {valueSet?.values.slice(0, 5).map(option => (
              <TouchableOpacity
                key={option.code}
                style={[styles.radioOption, value === option.code && styles.radioOptionSelected]}
                onPress={() => handleValueChange(element.sectionId, element.code, option.code)}
              >
                <View style={[styles.radioCircle, value === option.code && styles.radioCircleSelected]} />
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'textarea':
        return (
          <TextInput
            style={styles.textarea}
            value={value}
            onChangeText={text => handleValueChange(element.sectionId, element.code, text)}
            multiline
            numberOfLines={4}
            placeholder={element.placeholder || element.definition}
            placeholderTextColor={colors.textTertiary}
          />
        );
      case 'number':
        return (
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={text => handleValueChange(element.sectionId, element.code, text)}
            keyboardType="decimal-pad"
            placeholder={element.placeholder}
            placeholderTextColor={colors.textTertiary}
          />
        );
      case 'datetime':
        return (
          <TouchableOpacity style={styles.datetimeButton} onPress={() => {}}>
            <Text style={value ? styles.datetimeValue : styles.datetimePlaceholder}>
              {value ? new Date(value).toLocaleString() : 'Select date & time'}
            </Text>
          </TouchableOpacity>
        );
      case 'date':
        return (
          <TouchableOpacity style={styles.dateButton} onPress={() => {}}>
            <Text style={value ? styles.dateValue : styles.datePlaceholder}>
              {value ? new Date(value).toLocaleDateString() : 'Select date'}
            </Text>
          </TouchableOpacity>
        );
      case 'gps':
        return (
          <View style={styles.gpsInputs}>
            <TextInput
              style={styles.gpsInput}
              placeholder="Latitude"
              placeholderTextColor={colors.textTertiary}
              value={String(value?.lat || '')}
              onChangeText={text => handleValueChange(element.sectionId, element.code, { ...value, lat: parseFloat(text) })}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.gpsInput}
              placeholder="Longitude"
              placeholderTextColor={colors.textTertiary}
              value={String(value?.lon || '')}
              onChangeText={text => handleValueChange(element.sectionId, element.code, { ...value, lon: parseFloat(text) })}
              keyboardType="decimal-pad"
            />
          </View>
        );
      default:
        return (
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={text => handleValueChange(element.sectionId, element.code, text)}
            placeholder={element.placeholder || element.definition}
            placeholderTextColor={colors.textTertiary}
          />
        );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.eyebrow}>NEMSIS 3.5</Text>
          <Text style={styles.reportTitle}>Patient Report</Text>
          <Text style={styles.reportSubtitle}>
            {currentPatient?.name?.[0]?.given?.[0] || 'New patient'} {currentPatient?.name?.[0]?.family || ''}
          </Text>
        </View>
        <View style={styles.draftBadge}>
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text style={styles.draftText}>Draft</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabs}>
        {sections.map(section => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionTab, activeSection === section.id && styles.sectionTabActive]}
            onPress={() => setActiveSection(section.id)}
          >
            <Text style={[styles.sectionTabText, activeSection === section.id && styles.sectionTabTextActive]}>
              {section.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {currentSection && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>{currentSection.name}</Text>
              <Text style={styles.formSubtitle}>
                {currentSection.elements.filter(element => element.required).length} required fields
              </Text>
            </View>
            <View style={styles.formIcon}>
              <Ionicons name="list-outline" size={20} color={colors.primary} />
            </View>
          </View>

          {currentSection.elements.map(element => (
            <View key={element.code} style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={[styles.fieldLabel, element.required && styles.fieldLabelRequired]}>
                  {element.name}
                  {element.required && <Text style={styles.requiredAsterisk}> *</Text>}
                </Text>
                {element.valueSetId != null && <Text style={styles.valueSetBadge}>List</Text>}
              </View>
              <Text style={styles.fieldHelp}>{element.definition}</Text>
              {renderField(element)}
              {errors.some(error => error.includes(element.code)) && (
                <Text style={styles.fieldError}>{errors.find(error => error.includes(element.code))}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft} disabled={isSubmitting}>
          <Text style={styles.draftButtonText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Report</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const fieldInputStyle = {
  minHeight: layout.controlHeight,
  paddingHorizontal: spacing.md,
  borderRadius: borderRadius.md,
  backgroundColor: colors.fill,
  color: colors.textPrimary,
  fontFamily: typography.systemFont,
  fontSize: typography.sizes.md,
};

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
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.styles.footnote,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reportTitle: {
    ...typography.styles.largeTitle,
    color: colors.textPrimary,
  },
  reportSubtitle: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  draftText: {
    ...typography.styles.caption2,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTabs: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sectionTab: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.fill,
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionTabText: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: colors.textInverse,
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
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  formTitle: {
    ...typography.styles.title2,
    color: colors.textPrimary,
  },
  formSubtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.styles.headline,
    color: colors.textPrimary,
    flex: 1,
  },
  fieldLabelRequired: {
    color: colors.error,
  },
  requiredAsterisk: {
    color: colors.error,
  },
  valueSetBadge: {
    ...typography.styles.caption2,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  fieldHelp: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: fieldInputStyle,
  textarea: {
    ...fieldInputStyle,
    minHeight: 108,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  selectButton: {
    ...fieldInputStyle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },
  selectPlaceholder: {
    ...typography.styles.body,
    color: colors.textTertiary,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  radioOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.fill,
  },
  radioOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.disabled,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    ...typography.styles.footnote,
    color: colors.textPrimary,
  },
  datetimeButton: {
    ...fieldInputStyle,
    justifyContent: 'center',
  },
  datetimeValue: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },
  datetimePlaceholder: {
    ...typography.styles.body,
    color: colors.textTertiary,
  },
  dateButton: {
    ...fieldInputStyle,
    justifyContent: 'center',
  },
  dateValue: {
    ...typography.styles.body,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    ...typography.styles.body,
    color: colors.textTertiary,
  },
  gpsInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gpsInput: {
    ...fieldInputStyle,
    flex: 1,
  },
  fieldError: {
    ...typography.styles.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  draftButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  draftButtonText: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  submitButton: {
    flex: 1.4,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  submitButtonText: {
    ...typography.styles.headline,
    color: colors.textInverse,
  },
});
