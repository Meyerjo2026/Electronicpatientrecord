import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Observation, ObservationCreate, VitalSignsSet, ObservationSearchParams } from '@prehospital-epr/core';
import { ulid } from 'ulid';

type VitalSignsRecord = VitalSignsSet & { id?: string };

interface ObservationState {
  vitalSigns: VitalSignsRecord[];
  observations: Observation[];
  currentVitalSigns: VitalSignsRecord | null;
  isLoading: boolean;
  error: string | null;
  autoCaptureEnabled: boolean;
  captureInterval: number; // seconds
}

const initialState: ObservationState = {
  vitalSigns: [],
  observations: [],
  currentVitalSigns: null,
  isLoading: false,
  error: null,
  autoCaptureEnabled: false,
  captureInterval: 300, // 5 minutes default
};

export const recordVitalSigns = createAsyncThunk(
  'observation/recordVitalSigns',
  async (data: VitalSignsRecord, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const vs: VitalSignsRecord = {
      ...data,
      id: data.id || ulid()
    };
    return vs;
  }
);

export const recordObservation = createAsyncThunk(
  'observation/recordObservation',
  async (data: ObservationCreate, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const obs: Observation = {
      ...data,
      id: data.id || ulid(),
      resourceType: 'Observation',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString(),
        source: 'prehospital-epr-mobile'
      }
    };
    return obs;
  }
);

export const loadVitalSignsForEncounter = createAsyncThunk(
  'observation/loadForEncounter',
  async (encounterId: string, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { vitalSigns: [] as VitalSignsRecord[], observations: [] as Observation[] };
  }
);

export const startAutoCapture = createAsyncThunk(
  'observation/startAutoCapture',
  async (interval: number, { rejectWithValue }) => {
    // This would start a background timer for device capture
    return interval;
  }
);

export const stopAutoCapture = createAsyncThunk(
  'observation/stopAutoCapture',
  async (_, { rejectWithValue }) => {
    return true;
  }
);

const observationSlice = createSlice({
  name: 'observation',
  initialState,
  reducers: {
    addVitalSigns: (state, action: PayloadAction<VitalSignsRecord>) => {
      state.vitalSigns.unshift(action.payload);
      state.currentVitalSigns = action.payload;
      // Keep only last 100 vital signs sets in memory
      if (state.vitalSigns.length > 100) {
        state.vitalSigns = state.vitalSigns.slice(0, 100);
      }
    },
    addObservation: (state, action: PayloadAction<Observation>) => {
      state.observations.unshift(action.payload);
    },
    setCurrentVitalSigns: (state, action: PayloadAction<VitalSignsRecord | null>) => {
      state.currentVitalSigns = action.payload;
    },
    setAutoCaptureEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoCaptureEnabled = action.payload;
    },
    setCaptureInterval: (state, action: PayloadAction<number>) => {
      state.captureInterval = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearVitalSigns: (state) => {
      state.vitalSigns = [];
      state.currentVitalSigns = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(recordVitalSigns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recordVitalSigns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vitalSigns.unshift(action.payload);
        state.currentVitalSigns = action.payload;
      })
      .addCase(recordVitalSigns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to record vital signs';
      })
      .addCase(recordObservation.fulfilled, (state, action) => {
        state.observations.unshift(action.payload);
      })
      .addCase(loadVitalSignsForEncounter.fulfilled, (state, action) => {
        state.vitalSigns = action.payload.vitalSigns;
        state.observations = action.payload.observations;
        if (action.payload.vitalSigns.length > 0) {
          state.currentVitalSigns = action.payload.vitalSigns[0];
        }
      })
      .addCase(startAutoCapture.fulfilled, (state, action) => {
        state.autoCaptureEnabled = true;
        state.captureInterval = action.payload;
      })
      .addCase(stopAutoCapture.fulfilled, (state) => {
        state.autoCaptureEnabled = false;
      });
  },
});

export const { 
  addVitalSigns, 
  addObservation, 
  setCurrentVitalSigns, 
  setAutoCaptureEnabled, 
  setCaptureInterval, 
  clearError, 
  clearVitalSigns 
} = observationSlice.actions;
export default observationSlice.reducer;