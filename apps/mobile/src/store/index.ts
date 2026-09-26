import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './authSlice';
import patientReducer from './patientSlice';
import encounterReducer from './encounterSlice';
import observationReducer from './observationSlice';
import interventionReducer from './interventionSlice';
import syncReducer from './syncSlice';
import uiReducer from './uiSlice';
import { createAuditMiddleware } from './auditMiddleware';
import { audit } from '../security/audit';

const rootReducer = combineReducers({
  auth: authReducer,
  patient: patientReducer,
  encounter: encounterReducer,
  observation: observationReducer,
  intervention: interventionReducer,
  sync: syncReducer,
  ui: uiReducer,
});

const persistConfig = {
  key: 'prehospital-epr',
  version: 1,
  storage: AsyncStorage,
  // `sync` is transient by design: connectivity and counters are re-derived on
  // launch rather than restored from a stale snapshot.
  whitelist: ['auth', 'patient', 'encounter', 'observation', 'intervention', 'ui'],
  blacklist: ['sync'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(createAuditMiddleware(audit)),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;