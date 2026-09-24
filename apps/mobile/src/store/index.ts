import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './authSlice';
import patientReducer from './patientSlice';
import encounterReducer from './encounterSlice';
import observationReducer from './observationSlice';
import syncReducer from './syncSlice';
import uiReducer from './uiSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  patient: patientReducer,
  encounter: encounterReducer,
  observation: observationReducer,
  sync: syncReducer,
  ui: uiReducer,
});

const persistConfig = {
  key: 'prehospital-epr',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'patient', 'encounter', 'observation', 'ui'],
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
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;