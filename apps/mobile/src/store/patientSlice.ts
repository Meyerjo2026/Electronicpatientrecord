import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Patient, PatientCreate, PatientSearchParams } from '@prehospital-epr/core';
import { ulid } from 'ulid';

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

// Mock patient creation - replace with actual API/storage
export const createPatient = createAsyncThunk(
  'patient/create',
  async (data: PatientCreate, { rejectWithValue }) => {
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

export const searchPatients = createAsyncThunk(
  'patient/search',
  async (params: PatientSearchParams, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock search - would query local storage or API
    return { patients: [], total: 0 };
  }
);

export const loadPatient = createAsyncThunk(
  'patient/load',
  async (patientId: string, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    // Load from local storage
    return null;
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