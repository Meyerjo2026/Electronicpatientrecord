import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Patient, PatientCreate, PatientSearchParams } from '@prehospital-epr/core';
import { ulid } from 'ulid';

/**
 * `PatientCreate` carries zod `.default()`s for the server-managed fields, so its
 * inferred type still demands them. Callers supply only clinical content; the
 * thunk mints the identity fields.
 */
export type PatientDraft = Omit<PatientCreate, 'id' | 'meta' | 'resourceType'> &
  Partial<Pick<PatientCreate, 'id' | 'resourceType'>>;

interface PatientState {
  currentPatient: Patient | null;
  patients: Patient[];
  searchResults: Patient[];
  isLoading: boolean;
  error: string | null;
  lastSearchParams: PatientSearchParams | null;
}

const initialState: PatientState = {
  currentPatient: null,
  patients: [],
  searchResults: [],
  isLoading: false,
  error: null,
  lastSearchParams: null,
};

/**
 * Creates a patient record in the local store. The API client will mirror this
 * to the FHIR server on the next sync; the local record is the source of truth
 * in the field.
 */
export const createPatient = createAsyncThunk(
  'patient/create',
  async (data: PatientDraft) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const patient: Patient = {
      ...data,
      id: data.id || ulid(),
      resourceType: 'Patient',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString(),
        source: 'prehospital-epr-mobile'
      }
    };
    return patient;
  }
);

/**
 * Offline-first search: filters the locally held patient list so lookup works
 * with no connectivity. Replace the body with a FHIR `Patient` search once the
 * API client is wired up, keeping the same result contract.
 */
export const searchPatients = createAsyncThunk(
  'patient/search',
  async (params: PatientSearchParams, { getState }) => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const { patient } = getState() as { patient: PatientState };
    const term = (params.name ?? '').trim().toLowerCase();

    const matches = patient.patients.filter(item => {
      if (term) {
        const haystack = [item.name?.[0]?.text, item.name?.[0]?.family, item.name?.[0]?.given?.join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (params.gender && item.gender !== params.gender) return false;
      if (params.birthdate && item.birthDate !== params.birthdate) return false;
      if (params.phone) {
        const hasPhone = (item.telecom ?? []).some(
          contact => contact.system === 'phone' && contact.value === params.phone
        );
        if (!hasPhone) return false;
      }
      if (params.identifier) {
        const hasIdentifier = (item.identifier ?? []).some(
          entry => entry.value === params.identifier
        );
        if (!hasIdentifier) return false;
      }
      return true;
    });

    return { patients: matches, total: matches.length };
  }
);

/**
 * Resolve a patient by id from the local store. Returns null when unknown so
 * callers can fall back to fetching from the API.
 */
export const loadPatient = createAsyncThunk<Patient | null, string>(
  'patient/load',
  async (patientId: string, { getState }) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const { patient } = getState() as { patient: PatientState };
    return patient.patients.find(item => item.id === patientId) ?? null;
  }
);

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {
    setCurrentPatient: (state, action: PayloadAction<Patient | null>) => {
      state.currentPatient = action.payload;
    },
    addPatient: (state, action: PayloadAction<Patient>) => {
      const exists = state.patients.find(p => p.id === action.payload.id);
      if (!exists) {
        state.patients.unshift(action.payload);
      }
    },
    updatePatient: (state, action: PayloadAction<Patient>) => {
      const idx = state.patients.findIndex(p => p.id === action.payload.id);
      if (idx >= 0) {
        state.patients[idx] = action.payload;
      }
      if (state.currentPatient?.id === action.payload.id) {
        state.currentPatient = action.payload;
      }
    },
    removePatient: (state, action: PayloadAction<string>) => {
      state.patients = state.patients.filter(p => p.id !== action.payload);
      if (state.currentPatient?.id === action.payload) {
        state.currentPatient = null;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.lastSearchParams = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createPatient.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPatient.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPatient = action.payload;
        state.patients.unshift(action.payload);
      })
      .addCase(createPatient.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to create patient';
      })
      .addCase(searchPatients.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchPatients.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload.patients;
        state.lastSearchParams = action.meta.arg;
      })
      .addCase(searchPatients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Search failed';
      })
      .addCase(loadPatient.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentPatient = action.payload;
        }
      });
  },
});

export const { 
  setCurrentPatient, 
  addPatient, 
  updatePatient, 
  removePatient, 
  clearError, 
  clearSearchResults 
} = patientSlice.actions;
export default patientSlice.reducer;