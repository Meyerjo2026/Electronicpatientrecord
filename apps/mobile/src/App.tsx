import React from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { LoadingScreen } from './components/LoadingScreen';
import { AppNavigator } from './navigation/AppNavigator';
import { store, persistor } from './store';
import { ThemeProvider } from './theme/ThemeProvider';
import { colors } from './theme';
import { SyncProvider } from './providers/SyncProvider';

const navigationTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surfaceTranslucent,
    text: colors.textPrimary,
    border: colors.separator,
    notification: colors.error,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <ThemeProvider>
            <SyncProvider>
              <NavigationContainer theme={navigationTheme}>
                <AppNavigator />
              </NavigationContainer>
            </SyncProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
