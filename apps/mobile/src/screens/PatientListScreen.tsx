import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { searchPatients, createPatient, setCurrentPatient } from '../store/patientSlice';
import { createEncounter, setCurrentEncounter } from '../store/encounterSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

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
      
      // If there's an active encounter, link patient
      if (currentEncounter) {
        dispatch(setCurrentEncounter({
          ...currentEncounter,
          subject: { reference: `Patient/${result.id}`, display: `${result.name?.[0]?.given?.[0]} ${result.name?.[0]?.family}` }
        }));
      }
      
      setShowCreateModal(false);
      setNewPatient({ firstName: '', lastName: '', dob: '', gender: 'unknown', phone: '' });
    } catch (e) {
      // Error handled by slice
    }
  };

  const displayPatients = lastSearchParams ? searchResults : patients;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients by name, ID, phone..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createButtonText}>+ New Patient</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayPatients}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.patientRow} onPress={() => {
            dispatch(setCurrentPatient(item));
            if (currentEncounter) {
              dispatch(setCurrentEncounter({
                ...currentEncounter,
                subject: { reference: `Patient/${item.id}`, display: `${item.name?.[0]?.given?.[0]} ${item.name?.[0]?.family}` }
              }));
            }
          }}>
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
                  <View style={[
                    styles.genderBadge,
                    { backgroundColor: item.gender === 'male' ? colors.primaryLight : item.gender === 'female' ? '#FCE4EC' : colors.border }
                  ]}>
                    <Text style={[
                      styles.genderBadgeText,
                      { color: item.gender === 'male' ? colors.primary : item.gender === 'female' ? '#C2185B' : colors.textTertiary }
                    ]}>
                      {item.gender.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.patientDetails}>
                {item.birthDate && (
                  <Text style={styles.patientDetail}>
                    DOB: {new Date(item.birthDate).toLocaleDateString()} ({calculateAge(item.birthDate)})
                  </Text>
                )}
                {item.telecom?.[0]?.value && (
                  <Text style={styles.patientDetail}>
                    {item.telecom[0].value}
                  </Text>
                )}
                {item.identifier?.[0]?.value && (
                  <Text style={styles.patientDetail}>
                    MRN: {item.identifier[0].value}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {query ? 'No patients found' : 'No patients recorded yet'}
            </Text>
            {!query && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreateModal(true)}>
                <Text style={styles.emptyButtonText}>Create First Patient</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Patient</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>First Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPatient.firstName}
                  onChangeText={text => setNewPatient({ ...newPatient, firstName: text })}
                  placeholder="John"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Last Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPatient.lastName}
                  onChangeText={text => setNewPatient({ ...newPatient, lastName: text })}
                  placeholder="Doe"
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
                    keyboardType="date-time"
                  />
                </View>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Gender</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newPatient.gender}
                    onChangeText={text => setNewPatient({ ...newPatient, gender: text })}
                    placeholder="male/female/other"
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
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreatePatient} disabled={!newPatient.firstName || !newPatient.lastName}>
                <Text style={styles.modalConfirmText}>Create Patient</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  searchBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  actionBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  createButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  patientInitials: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  patientName: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  genderBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  genderBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  patientDetails: {
    gap: 2,
  },
  patientDetail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: typography.sizes.xl,
    color: colors.textTertiary,
  },
  modalContent: {
    padding: spacing.lg,
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
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  modalCancel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalCancelText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalConfirm: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalConfirmText: {
    fontSize: typography.sizes.md,
    color: colors.white,
    fontWeight: '600',
  },
});