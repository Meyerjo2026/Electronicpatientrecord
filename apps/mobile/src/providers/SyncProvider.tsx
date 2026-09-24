import React, { createContext, useContext, ReactNode } from 'react';

interface SyncContextType {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value: SyncContextType = {
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    syncNow: async () => {},
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};