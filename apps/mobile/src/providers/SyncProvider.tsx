import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { syncNow, setOnlineStatus } from '../store/syncSlice';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  isOnline: boolean;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSyncing, lastSyncTime, pendingOperations, isOnline } = useSelector(
    (state: RootState) => state.sync
  );

  const handleSync = useCallback(async () => {
    await dispatch(syncNow());
  }, [dispatch]);

  const value = useMemo<SyncContextType>(
    () => ({
      isSyncing,
      lastSyncTime,
      pendingCount: pendingOperations,
      isOnline,
      syncNow: handleSync,
    }),
    [isSyncing, lastSyncTime, pendingOperations, isOnline, handleSync]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
};

export { setOnlineStatus };
