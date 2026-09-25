import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  MedicationAdministration,
  MedicationAdministrationCreate,
  MedicationAdministrationCategory,
  Procedure,
  ProcedureCreate,
  ProcedureCategory,
  Route,
} from '@prehospital-epr/core';
import { ulid } from 'ulid';

export type InterventionState = {
  medications: MedicationAdministration[];
  procedures: Procedure[];
  isLoading: boolean;
  error: string | null;
};

const initialState: InterventionState = {
  medications: [],
  procedures: [],
  isLoading: false,
  error: null,
};

/**
 * The `*Create` schemas carry zod `.default()`s for `id`, `resourceType` and
 * `status`, so their inferred *output* type still requires them. Callers of
 * these thunks should not have to supply server-managed fields, so the thunks
 * accept the draft shape and fill the rest in.
 */
type MedicationDraft = Omit<
  MedicationAdministrationCreate,
  'id' | 'meta' | 'resourceType' | 'status'
> &
  Partial<Pick<MedicationAdministrationCreate, 'id' | 'status'>>;

type ProcedureDraft = Omit<ProcedureCreate, 'id' | 'meta' | 'resourceType' | 'status'> &
  Partial<Pick<ProcedureCreate, 'id' | 'status'>>;

export type { MedicationDraft, ProcedureDraft };

const stamp = () => ({
  versionId: '1',
  lastUpdated: new Date().toISOString(),
  source: 'prehospital-epr-mobile',
});

/**
 * Records a drug administration. Stored locally first; the sync engine
 * reconciles it with the server record on the next successful sync.
 */
export const recordMedication = createAsyncThunk(
  'intervention/recordMedication',
  async (data: MedicationDraft) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      ...data,
      id: data.id || ulid(),
      status: data.status ?? ('completed' as const),
      resourceType: 'MedicationAdministration' as const,
      meta: stamp(),
    } as MedicationAdministration;
  }
);

export const recordProcedure = createAsyncThunk(
  'intervention/recordProcedure',
  async (data: ProcedureDraft) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      ...data,
      id: data.id || ulid(),
      status: data.status ?? ('completed' as const),
      resourceType: 'Procedure' as const,
      meta: stamp(),
    } as Procedure;
  }
);

const interventionSlice = createSlice({
  name: 'intervention',
  initialState,
  reducers: {
    removeMedication: (state, action: PayloadAction<string>) => {
      state.medications = state.medications.filter(item => item.id !== action.payload);
    },
    removeProcedure: (state, action: PayloadAction<string>) => {
      state.procedures = state.procedures.filter(item => item.id !== action.payload);
    },
    clearError: state => {
      state.error = null;
    },
    clearAll: state => {
      state.medications = [];
      state.procedures = [];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(recordMedication.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recordMedication.fulfilled, (state, action) => {
        state.isLoading = false;
        state.medications.unshift(action.payload);
      })
      .addCase(recordMedication.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to record medication';
      })
      .addCase(recordProcedure.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(recordProcedure.fulfilled, (state, action) => {
        state.isLoading = false;
        state.procedures.unshift(action.payload);
      })
      .addCase(recordProcedure.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to record procedure';
      });
  },
});

export const { removeMedication, removeProcedure, clearError, clearAll } =
  interventionSlice.actions;
export default interventionSlice.reducer;

/** Administration routes accepted by the core schema, in triage-friendly order. */
export const ROUTES: Route[] = [
  'IV',
  'IO',
  'IM',
  'SUBQ',
  'IN',
  'PO',
  'SL',
  'BUCCAL',
  'RECTAL',
  'TOP',
  'INH',
  'NEB',
  'ETT',
  'TRANSDERMAL',
];

export const MEDICATION_CATEGORIES: {
  value: MedicationAdministrationCategory;
  label: string;
}[] = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'standing-order', label: 'Standing order' },
  { value: 'medical-direction', label: 'Medical direction' },
  { value: 'patient-assisted', label: 'Patient assisted' },
  { value: 'self-administered', label: 'Self administered' },
];

export const PROCEDURE_CATEGORIES: { value: ProcedureCategory; label: string }[] = [
  { value: 'airway', label: 'Airway' },
  { value: 'breathing', label: 'Breathing' },
  { value: 'circulation', label: 'Circulation' },
  { value: 'cardiac', label: 'Cardiac' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'medical', label: 'Medical' },
  { value: 'obstetric', label: 'Obstetric' },
  { value: 'pediatric', label: 'Paediatric' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'vascular-access', label: 'Vascular access' },
  { value: 'immobilization', label: 'Immobilisation' },
  { value: 'wound-care', label: 'Wound care' },
  { value: 'other', label: 'Other' },
];
