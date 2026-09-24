import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Session, SecurityRole, SecurityPermission } from '@prehospital-epr/core';
import { ulid } from 'ulid';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  error: string | null;
  biometricEnabled: boolean;
  pinEnabled: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  session: null,
  error: null,
  biometricEnabled: false,
  pinEnabled: false,
};

// Mock authentication - replace with actual API calls
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string; pin?: string }, { rejectWithValue }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation
    if (credentials.username === 'demo' && credentials.password === 'demo') {
      const session: Session = {
        id: ulid(),
        userId: ulid(),
        deviceId: ulid(),
        roles: ['EMS_PROVIDER', 'EMS_SUPERVISOR'],
        permissions: [
          'PATIENT_READ', 'PATIENT_WRITE',
          'ENCOUNTER_READ', 'ENCOUNTER_WRITE',
          'OBSERVATION_READ', 'OBSERVATION_WRITE',
          'MEDICATION_ADMINISTER',
          'PROCEDURE_PERFORM',
          'DOCUMENT_SIGN',
          'HANDOFF_CREATE',
          'REPORT_GENERATE'
        ],
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
        lastActivity: new Date().toISOString(),
      };
      return session;
    }
    
    return rejectWithValue('Invalid credentials');
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    // Check for existing session in secure storage
    // For now, return unauthenticated
    return null;
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    // Clear secure storage
    return true;
  }
);

export const refreshSession = createAsyncThunk(
  'auth/refresh',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    if (state.auth.session) {
      // Refresh token logic
      return { ...state.auth.session, lastActivity: new Date().toISOString() };
    }
    throw new Error('No session to refresh');
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setPinEnabled: (state, action: PayloadAction<boolean>) => {
      state.pinEnabled = action.payload;
    },
    updateLastActivity: (state) => {
      if (state.session) {
        state.session.lastActivity = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.session = action.payload;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.session = null;
        state.error = action.payload as string || 'Login failed';
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.session = action.payload;
        }
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.session = null;
        state.error = null;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.session = action.payload;
      });
  },
});

export const { clearError, setBiometricEnabled, setPinEnabled, updateLastActivity } = authSlice.actions;
export default authSlice.reducer;