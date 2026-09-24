import React, { createContext, useContext } from 'react';
import { theme } from '../theme';

const ThemeContext = createContext(theme);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);