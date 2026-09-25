import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface SyncStateSlice {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingOperations: number;
  failedOperations: number;
  conflicts: number;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'conflict';
  error: string | null;
  devices: Array<{ id: string; name: string; lastSeen: string }>;
}

const initialState: SyncStateSlice = {
  isOnline: false,
  isSyncing: false,
  lastSyncTime: null,
  pendingOperations: 0,
  failedOperations: 0,
  conflicts: 0,
  syncStatus: 'idle',
  error: null,
  devices: [],
};

export const syncNow = createAsyncThunk(
  'sync/syncNow',
  async (_, { rejectWithValue, getState }) => {
    // This would trigger the sync engine
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, syncedCount: 5 };
  }
);

export const setOnlineStatus = createAsyncThunk(
  'sync/setOnline',
  async (isOnline: boolean) => {
    return isOnline;
  }
);

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncStatus: (state, action: PayloadAction<SyncStateSlice['syncStatus']>) => {
      state.syncStatus = action.payload;
      state.isSyncing = action.payload === 'syncing';
    },
    updatePendingCount: (state, action: PayloadAction<number>) => {
      state.pendingOperations = action.payload;
    },
    updateFailedCount: (state, action: PayloadAction<number>) => {
      state.failedOperations = action.payload;
    },
    updateConflicts: (state, action: PayloadAction<number>) => {
      state.conflicts = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<string | null>) => {
      state.lastSyncTime = action.payload;
    },
    setDevices: (state, action: PayloadAction<SyncStateSlice['devices']>) => {
      state.devices = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncNow.pending, (state) => {
        state.isSyncing = true;
        state.syncStatus = 'syncing';
        state.error = null;
      })
      .addCase(syncNow.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.syncStatus = 'success';
        state.lastSyncTime = new Date().toISOString();
        state.pendingOperations = Math.max(0, state.pendingOperations - action.payload.syncedCount);
      })
      .addCase(syncNow.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncStatus = 'error';
        state.error = action.payload as string || 'Sync failed';
      })
      .addCase(setOnlineStatus.fulfilled, (state, action) => {
        state.isOnline = action.payload;
      });
  },
});

export const { 
  setSyncStatus, 
  updatePendingCount, 
  updateFailedCount, 
  updateConflicts, 
  setLastSyncTime, 
  setDevices,
  clearError 
} = syncSlice.actions;
export default syncSlice.reducer;