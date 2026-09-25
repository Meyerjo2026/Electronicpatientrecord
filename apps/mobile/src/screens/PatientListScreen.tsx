import React, { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  SegmentedControl,
  Text,
  TextField,
  useTheme,
  type Tone,
} from '@prehospital-epr/ui';
import { AppDispatch, RootState } from '../store';
import { clearSearchResults, createPatient, searchPatients, setCurrentPatient } from '../store/patientSlice';
import { createEncounter } from '../store/encounterSlice';
import {
  patientAgeLabel,
  patientDisplayName,
  patientInitials,
  patientMrn,
  patientPhone,
} from '../utils/format';

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
] as const;

type Gender = (typeof GENDERS)[number]['value'];

const GENDER_TONES: Record<Gender, Tone> = {
  female: 'critical',
  male: 'primary',
  other: 'info',
  unknown: 'neutral',
};

interface DraftPatient {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  phone: string;
}

const EMPTY_DRAFT: DraftPatient = {
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'unknown',
  phone: '',
};

export const PatientListScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const { patients, searchResults, lastSearchParams, isLoading } = useSelector(
    (state: RootState) => state.patient
  );

  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPatient>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | undefined>();

  const isSearching = lastSearchParams !== null;
  const visible = isSearching ? searchResults : patients;

  const handleSearch = useCallback(() => {
    dispatch(searchPatients({ name: query.trim() }));
  }, [dispatch, query]);

  const handleClear = useCallback(() => {
    setQuery('');
    dispatch(clearSearchResults());
  }, [dispatch]);

  const canCreate = draft.firstName.trim().length > 0 || draft.lastName.trim().length > 0;

  const handleCreate = useCallback(async () => {
    if (!canCreate) {
      setFormError('Enter at least a first or last name.');
      return;
    }
    if (draft.birthDate && Number.isNaN(Date.parse(draft.birthDate))) {
      setFormError('Date of birth must be formatted YYYY-MM-DD.');
      return;
    }

    const result = await dispatch(
      createPatient({
        name: [
          {
            family: draft.lastName.trim() || undefined,
            given: draft.firstName.trim() ? [draft.firstName.trim()] : undefined,
            text: [draft.firstName.trim(), draft.lastName.trim()]
              .filter(Boolean)
              .join(' ')
              .trim(),
          },
        ],
        gender: draft.gender,
        birthDate: draft.birthDate || undefined,
        telecom: draft.phone.trim()
          ? [{ system: 'phone', value: draft.phone.trim() }]
          : undefined,
      })
    );

    if (createPatient.fulfilled.match(result)) {
      setDraft(EMPTY_DRAFT);
      setFormError(undefined);
      setSheetOpen(false);
      // A patient record is only useful attached to a job, so open one.
      await dispatch(
        createEncounter({
          status: 'planned',
          class: 'emergency',
          subject: { reference: `Patient/${result.payload.id}` },
          period: { start: new Date().toISOString() },
        })
      );
    }
  }, [dispatch, canCreate, draft]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof patients)[number] }) => {
      const gender = (item.gender ?? 'unknown') as Gender;
      const mrn = patientMrn(item);
      const phone = patientPhone(item);

      return (
        <Pressable
          onPress={() => dispatch(setCurrentPatient(item))}
          accessibilityRole="button"
          accessibilityLabel={`Open ${patientDisplayName(item)}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.lg,
            padding: theme.spacing.lg,
            backgroundColor: pressed ? theme.colors.fill : 'transparent',
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.md,
              backgroundColor:
                gender === 'female'
                  ? theme.colors.femaleSurface
                  : gender === 'male'
                    ? theme.colors.maleSurface
                    : theme.colors.surfaceSunken,
            }}
          >
            <Text
              variant="subheading"
              style={{
                color:
                  gender === 'female'
                    ? theme.colors.female
                    : gender === 'male'
                      ? theme.colors.male
                      : theme.colors.textSecondary,
              }}
            >
              {patientInitials(item)}
            </Text>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheading" numberOfLines={1}>
              {patientDisplayName(item)}
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {[patientAgeLabel(item), mrn, phone].filter(Boolean).join(' · ')}
            </Text>
          </View>

          <Badge label={gender} tone={GENDER_TONES[gender]} />
        </Pressable>
      );
    },
    [dispatch, theme]
  );

  const header = (
    <View style={{ gap: theme.spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="title" accessibilityRole="header">
            Patients
          </Text>
          <Text variant="subheading" tone="tertiary">
            {isSearching
              ? `${visible.length} matching on this device`
              : `${patients.length} on this device`}
          </Text>
        </View>
        <Button
          label="New"
          icon="add"
          size="sm"
          onPress={() => {
            setDraft(EMPTY_DRAFT);
            setFormError(undefined);
            setSheetOpen(true);
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          minHeight: theme.layout.controlHeight,
          borderRadius: theme.borderRadius.md,
          backgroundColor: theme.colors.surfaceSunken,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name"
          placeholderTextColor={theme.colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Search patients by name"
          style={{
            flex: 1,
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.systemFont,
            fontSize: theme.typography.sizes.md,
            paddingVertical: theme.spacing.sm,
          }}
        />
        {query ? (
          <IconButton icon="close-circle" label="Clear search" size={17} onPress={handleClear} />
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <Divider inset={theme.spacing.lg + 44} />}
        contentContainerStyle={{
          width: '100%',
          maxWidth: theme.layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.layout.tabBarClearance + theme.spacing.lg,
          gap: theme.spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon={isSearching ? 'search-outline' : 'people-outline'}
              title={isSearching ? 'No matches' : 'No patients yet'}
              message={
                isSearching
                  ? 'Search covers patients stored on this device. Records held on the server are not yet searchable offline.'
                  : 'Create a patient to start an encounter. Everything is stored locally first.'
              }
              action={
                isSearching
                  ? { label: 'Clear search', onPress: handleClear }
                  : { label: 'New patient', onPress: () => setSheetOpen(true) }
              }
            />
          </Card>
        }
      />

      <NewPatientSheet
        open={sheetOpen}
        draft={draft}
        error={formError}
        busy={isLoading}
        onChange={setDraft}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
};

interface SheetProps {
  open: boolean;
  draft: DraftPatient;
  error?: string;
  busy: boolean;
  onChange: (draft: DraftPatient) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const NewPatientSheet: React.FC<SheetProps> = ({
  open,
  draft,
  error,
  busy,
  onChange,
  onClose,
  onSubmit,
}) => {
  const theme = useTheme();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.borderRadius.xl,
            borderTopRightRadius: theme.borderRadius.xl,
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
            maxHeight: '90%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="heading">New patient</Text>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="First name"
                  value={draft.firstName}
                  onChangeText={firstName => onChange({ ...draft, firstName })}
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Last name"
                  value={draft.lastName}
                  onChangeText={lastName => onChange({ ...draft, lastName })}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <TextField
              label="Date of birth"
              help="YYYY-MM-DD"
              value={draft.birthDate}
              onChangeText={birthDate => onChange({ ...draft, birthDate })}
              keyboardType="numbers-and-punctuation"
              error={error}
            />

            <TextField
              label="Phone"
              value={draft.phone}
              onChangeText={phone => onChange({ ...draft, phone })}
              keyboardType="phone-pad"
              placeholder="+27 …"
            />

            <SegmentedControl
              label="Sex"
              value={draft.gender}
              options={GENDERS.map(g => ({ value: g.value, label: g.label }))}
              onChange={gender => onChange({ ...draft, gender })}
            />
          </View>

          <Button label="Create and start encounter" onPress={onSubmit} loading={busy} fullWidth size="lg" />
        </View>
      </View>
    </Modal>
  );
};
