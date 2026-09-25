import React from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { searchPatients, createPatient, setCurrentPatient } from '../store/patientSlice';
import { setCurrentEncounter } from '../store/encounterSlice';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

export const PatientListScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { patients, searchResults, isLoading, lastSearchParams } = useSelector((state: RootState) => state.patient);
  const { currentEncounter } = useSelector((state: RootState) => state.encounter);

  const [query, setQuery] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newPatient, setNewPatient] = React.useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'unknown',
    phone: '',
  });

  const handleSearch = () => {
    if (query.trim()) {
      dispatch(searchPatients({ name: query }));
    }
  };

  const handleCreatePatient = async () => {
    try {
      const patientData = {
        id: '',
        resourceType: 'Patient' as const,
        name: [{
          given: [newPatient.firstName],
          family: newPatient.lastName,
        }],
        gender: newPatient.gender as any,
        birthDate: newPatient.dob || undefined,
        telecom: newPatient.phone ? [{
          system: 'phone' as const,
          value: newPatient.phone,
          use: 'mobile' as const,
        }] : undefined,
      };

      const result = await dispatch(createPatient(patientData)).unwrap();
      dispatch(setCurrentPatient(result));

      if (currentEncounter) {
        dispatch(setCurrentEncounter({
          ...currentEncounter,
          subject: { reference: `Patient/${result.id}`, display: `${result.name?.[0]?.given?.[0]} ${result.name?.[0]?.family}` },
        }));
      }

      setShowCreateModal(false);
      setNewPatient({ firstName: '', lastName: '', dob: '', gender: 'unknown', phone: '' });
    } catch {}
  };

  const displayPatients = lastSearchParams ? searchResults : patients;

  return (
    <View style={styles.container}>
      <View style={styles.page}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Patients</Text>
            <Text style={styles.pageSubtitle}>
              {isLoading ? 'Searching…' : `${displayPatients.length} ${displayPatients.length === 1 ? 'patient' : 'patients'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.createButtonText}>New Patient</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, or phone"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.patientList}
          contentContainerStyle={styles.patientListContent}
          data={displayPatients}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientRow}
              onPress={() => {
                dispatch(setCurrentPatient(item));
                if (currentEncounter) {
                  dispatch(setCurrentEncounter({
                    ...currentEncounter,
                    subject: { reference: `Patient/${item.id}`, display: `${item.name?.[0]?.given?.[0]} ${item.name?.[0]?.family}` },
                  }));
                }
              }}
            >
              <View style={styles.patientAvatar}>
                <Text style={styles.patientInitials}>
                  {item.name?.[0]?.given?.[0]?.[0] || ''}{item.name?.[0]?.family?.[0] || ''}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <View style={styles.patientNameRow}>
                  <Text style={styles.patientName}>
                    {item.name?.[0]?.given?.[0] || ''} {item.name?.[0]?.family || ''}
                  </Text>
                  {item.gender && (
                    <View
                      style={[
                        styles.genderBadge,
                        {
                          backgroundColor: item.gender === 'male'
                            ? colors.maleLight
                            : item.gender === 'female'
                              ? colors.femaleLight
                              : colors.fill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.genderBadgeText,
                          {
                            color: item.gender === 'male'
                              ? colors.male
                              : item.gender === 'female'
                                ? colors.female
                                : colors.textTertiary,
                          },
                        ]}
                      >
                        {item.gender.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.patientDetails}>
                  {item.birthDate && (
                    <Text style={styles.patientDetail}>
                      DOB {new Date(item.birthDate).toLocaleDateString()} · {calculateAge(item.birthDate)} yrs
                    </Text>
                  )}
                  {item.telecom?.[0]?.value && (
                    <Text style={styles.patientDetail}>{item.telecom[0].value}</Text>
                  )}
                  {item.identifier?.[0]?.value && (
                    <Text style={styles.patientDetail}>MRN {item.identifier[0].value}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {query ? 'No patients found' : 'No patients yet'}
              </Text>
              <Text style={styles.emptyText}>
                {query ? 'Try a different name, ID, or phone number.' : 'Create a patient record to get started.'}
              </Text>
              {!query && (
                <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreateModal(true)}>
                  <Text style={styles.emptyButtonText}>Create First Patient</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Patient</Text>
                <Text style={styles.modalSubtitle}>Add the patient’s identifying details</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentInner}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>First Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPatient.firstName}
                  onChangeText={text => setNewPatient({ ...newPatient, firstName: text })}
                  placeholder="First name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Last Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPatient.lastName}
                  onChangeText={text => setNewPatient({ ...newPatient, lastName: text })}
                  placeholder="Last name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newPatient.dob}
                    onChangeText={text => setNewPatient({ ...newPatient, dob: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Gender</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newPatient.gender}
                    onChangeText={text => setNewPatient({ ...newPatient, gender: text })}
                    placeholder="Unknown"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPatient.phone}
                  onChangeText={text => setNewPatient({ ...newPatient, phone: text })}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  (!newPatient.firstName || !newPatient.lastName) && styles.modalConfirmDisabled,
                ]}
                onPress={handleCreatePatient}
                disabled={!newPatient.firstName || !newPatient.lastName}
              >
                <Text style={styles.modalConfirmText}>Create Patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    ...typography.styles.largeTitle,
    color: colors.textPrimary,
  },
  pageSubtitle: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  createButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  createButtonText: {
    ...typography.styles.subheadline,
    color: colors.primary,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.68,
  },
  searchBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.fill,
  },
  searchInput: {
    flex: 1,
    height: layout.controlHeight,
    color: colors.textPrimary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.md,
  },
  clearButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  patientList: {
    flex: 1,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  patientListContent: {
    flexGrow: 1,
    paddingBottom: layout.tabBarHeight + spacing.xl,
  },
  patientRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  patientInitials: {
    ...typography.styles.headline,
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
    minWidth: 0,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientName: {
    ...typography.styles.headline,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  genderBadge: {
    minWidth: 24,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  genderBadgeText: {
    ...typography.styles.caption2,
    fontWeight: '700',
  },
  patientDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  patientDetail: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
    backgroundColor: colors.separator,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
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
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '94%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.xl,
  },
  modalHandle: {
    width: 36,
    height: 5,
    alignSelf: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.disabled,
    marginTop: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    ...typography.styles.title2,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.fill,
  },
  modalContent: {
    flexGrow: 0,
  },
  modalContentInner: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formGroupHalf: {
    flex: 1,
  },
  formLabel: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginLeft: spacing.xxs,
  },
  formInput: {
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.fill,
    color: colors.textPrimary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  modalCancel: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.fill,
  },
  modalCancelText: {
    ...typography.styles.headline,
    color: colors.textSecondary,
  },
  modalConfirm: {
    flex: 1.4,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  modalConfirmDisabled: {
    backgroundColor: colors.disabled,
  },
  modalConfirmText: {
    ...typography.styles.headline,
    color: colors.textInverse,
  },
});
