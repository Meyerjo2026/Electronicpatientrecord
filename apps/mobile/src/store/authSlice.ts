import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Session } from '@prehospital-epr/core';
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
  isLoading: false,
  session: null,
  error: null,
  biometricEnabled: false,
  pinEnabled: false,
};

/** Shift length; the session is re-authenticated at the end of it. */
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

const DEMO_PERMISSIONS: Session['permissions'] = [
  'PATIENT_READ',
  'PATIENT_WRITE',
  'ENCOUNTER_READ',
  'ENCOUNTER_WRITE',
  'OBSERVATION_READ',
  'OBSERVATION_WRITE',
  'MEDICATION_ADMINISTER',
  'PROCEDURE_PERFORM',
  'DOCUMENT_SIGN',
  'HANDOFF_CREATE',
  'REPORT_GENERATE',
  'AUDIT_READ',
];

const buildSession = (): Session => ({
  id: ulid(),
  userId: ulid(),
  deviceId: ulid(),
  roles: ['EMS_PROVIDER', 'EMS_SUPERVISOR'],
  permissions: DEMO_PERMISSIONS,
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  lastActivity: new Date().toISOString(),
});

/**
 * A persisted session is only reusable while it is unexpired. Anything else
 * must send the crew back through the login screen.
 */
export function isSessionValid(session: Session | null): session is Session {
  if (!session) return false;
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/**
 * Whether the placeholder demo login is available.
 *
 * `__DEV__` is true only in development and Metro dev bundles, and false in
 * every release build. Gating on it means a shipped app cannot be signed into
 * with `demo`/`demo` and handed document-signing rights. The default is
 * therefore "closed": authentication has to be implemented before a release
 * build can be used at all, rather than the other way round.
 */
export const DEMO_AUTH_ENABLED: boolean = typeof __DEV__ !== 'undefined' && __DEV__;

/** Shown when a release build has no real authentication wired up yet. */
export const AUTH_UNAVAILABLE = 'Authentication is not available in this build';

/**
 * Placeholder credential check. Replace with a call to the Laravel
 * `/api/fhir/auth/login` endpoint once the API client is wired up.
 *
 * Until then the only accepted credentials are the demo pair, and only in a
 * development build.
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string; pin?: string }, { rejectWithValue }) => {
    if (!DEMO_AUTH_ENABLED) {
      return rejectWithValue(AUTH_UNAVAILABLE);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (credentials.username === 'demo' && credentials.password === 'demo') {
      return buildSession();
    }

    return rejectWithValue('Invalid credentials');
  }
);

/**
 * Restore a persisted session on cold start, returning null when there is no
 * session or it has expired so the navigator falls through to the login stack.
 */
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const session = state.auth.session;

    // A session persisted by a development build must not carry over into a
    // release build of the same app.
    if (!DEMO_AUTH_ENABLED) {
      return rejectWithValue(AUTH_UNAVAILABLE);
    }

    if (isSessionValid(session)) {
      return session;
    }
    return rejectWithValue('No valid session');
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    return true;
  }
);

export const refreshSession = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    if (!DEMO_AUTH_ENABLED) {
      return rejectWithValue(AUTH_UNAVAILABLE);
    }
    if (isSessionValid(state.auth.session)) {
      return { ...state.auth.session, lastActivity: new Date().toISOString() };
    }
    return rejectWithValue('No session to refresh');
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
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.session = action.payload;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        // No usable session: send the crew to the login screen.
        state.isLoading = false;
        state.isAuthenticated = false;
        state.session = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.session = null;
        state.error = null;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.session = action.payload;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.isAuthenticated = false;
        state.session = null;
      });
  },
});

export const { clearError, setBiometricEnabled, setPinEnabled, updateLastActivity } = authSlice.actions;
export default authSlice.reducer;