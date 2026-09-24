import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { store, persistor } from './store';
import { AppNavigator } from './navigation/AppNavigator';
import { ThemeProvider } from './theme/ThemeProvider';
import { SyncProvider } from './providers/SyncProvider';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <SyncProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </SyncProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}