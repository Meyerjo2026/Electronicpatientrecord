import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  activeTab: string;
  modals: Record<string, boolean>;
  toasts: Array<{ id: string; message: string; type: 'info' | 'success' | 'warning' | 'error'; duration?: number }>;
  loading: Record<string, boolean>;
}

const initialState: UIState = {
  theme: 'auto',
  sidebarOpen: false,
  activeTab: 'dashboard',
  modals: {},
  toasts: [],
  loading: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
    showToast: (state, action: PayloadAction<{ message: string; type: UIState['toasts'][0]['type']; duration?: number }>) => {
      const id = Math.random().toString(36).substr(2, 9);
      state.toasts.push({ id, ...action.payload });
    },
    hideToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
  },
});

export const { 
  setTheme, 
  toggleSidebar, 
  setSidebarOpen, 
  setActiveTab, 
  openModal, 
  closeModal, 
  showToast, 
  hideToast, 
  setLoading 
} = uiSlice.actions;
export default uiSlice.reducer;