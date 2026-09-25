import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Encounter, EncounterCreate, EncounterSearchParams } from '@prehospital-epr/core';
import { ulid } from 'ulid';

type EncounterStatus = Encounter['status'];

interface EncounterState {
  currentEncounter: Encounter | null;
  encounters: Encounter[];
  searchResults: Encounter[];
  isLoading: boolean;
  error: string | null;
  activeEncounterId: string | null;
}

const initialState: EncounterState = {
  currentEncounter: null,
  encounters: [],
  searchResults: [],
  isLoading: false,
  error: null,
  activeEncounterId: null,
};

export const createEncounter = createAsyncThunk(
  'encounter/create',
  async (data: EncounterCreate, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const encounter: Encounter = {
      ...data,
      id: data.id || ulid(),
      resourceType: 'Encounter',
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString(),
        source: 'prehospital-epr-mobile'
      }
    };
    return encounter;
  }
);

export const updateEncounterStatus = createAsyncThunk(
  'encounter/updateStatus',
  async ({ encounterId, status }: { encounterId: string; status: EncounterStatus }, { rejectWithValue, getState }) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const state = getState() as { encounter: EncounterState };
    const encounter = state.encounter.encounters.find(e => e.id === encounterId) || state.encounter.currentEncounter;
    if (!encounter) {
      return rejectWithValue('Encounter not found');
    }
    return { ...encounter, status, meta: { ...encounter.meta, lastUpdated: new Date().toISOString() } };
  }
);

export const loadEncounter = createAsyncThunk<Encounter | null, string>(
  'encounter/load',
  async (encounterId: string, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return null;
  }
);

export const searchEncounters = createAsyncThunk(
  'encounter/search',
  async (params: EncounterSearchParams, { rejectWithValue }) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { encounters: [], total: 0 };
  }
);

const encounterSlice = createSlice({
  name: 'encounter',
  initialState,
  reducers: {
    setCurrentEncounter: (state, action: PayloadAction<Encounter | null>) => {
      state.currentEncounter = action.payload;
      if (action.payload) {
        state.activeEncounterId = action.payload.id;
      }
    },
    addEncounter: (state, action: PayloadAction<Encounter>) => {
      const exists = state.encounters.find(e => e.id === action.payload.id);
      if (!exists) {
        state.encounters.unshift(action.payload);
      }
    },
    updateEncounter: (state, action: PayloadAction<Encounter>) => {
      const idx = state.encounters.findIndex(e => e.id === action.payload.id);
      if (idx >= 0) {
        state.encounters[idx] = action.payload;
      }
      if (state.currentEncounter?.id === action.payload.id) {
        state.currentEncounter = action.payload;
      }
    },
    removeEncounter: (state, action: PayloadAction<string>) => {
      state.encounters = state.encounters.filter(e => e.id !== action.payload);
      if (state.currentEncounter?.id === action.payload) {
        state.currentEncounter = null;
        state.activeEncounterId = null;
      }
    },
    setActiveEncounter: (state, action: PayloadAction<string | null>) => {
      state.activeEncounterId = action.payload;
      if (action.payload) {
        const encounter = state.encounters.find(e => e.id === action.payload);
        if (encounter) state.currentEncounter = encounter;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createEncounter.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEncounter.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEncounter = action.payload;
        state.activeEncounterId = action.payload.id;
        state.encounters.unshift(action.payload);
      })
      .addCase(createEncounter.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to create encounter';
      })
      .addCase(updateEncounterStatus.fulfilled, (state, action) => {
        const updatedEncounter = action.payload as Encounter;
        const idx = state.encounters.findIndex(e => e.id === updatedEncounter.id);
        if (idx >= 0) state.encounters[idx] = updatedEncounter;
        if (state.currentEncounter?.id === updatedEncounter.id) {
          state.currentEncounter = updatedEncounter;
        }
      })
      .addCase(loadEncounter.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentEncounter = action.payload;
          state.activeEncounterId = action.payload.id;
        }
      })
      .addCase(searchEncounters.fulfilled, (state, action) => {
        state.searchResults = action.payload.encounters;
      });
  },
});

export const { 
  setCurrentEncounter, 
  addEncounter, 
  updateEncounter, 
  removeEncounter, 
  setActiveEncounter,
  clearError 
} = encounterSlice.actions;
export default encounterSlice.reducer;