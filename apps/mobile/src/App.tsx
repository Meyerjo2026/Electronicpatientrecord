import React from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { useTheme, type Theme } from '@prehospital-epr/ui';
import { LoadingScreen } from './components/LoadingScreen';
import { AppNavigator } from './navigation/AppNavigator';
import { store, persistor } from './store';
import { ThemeProvider } from './theme/ThemeProvider';
import { SyncProvider } from './providers/SyncProvider';

const toNavigationTheme = (theme: Theme): NavigationTheme => {
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.scheme === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surfaceTranslucent,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
  };
};

const Root: React.FC = () => {
  const theme = useTheme();
  return (
    <>
      <StatusBar
        style={theme.scheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
      <NavigationContainer theme={toNavigationTheme(theme)}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <ThemeProvider>
            <SyncProvider>
              <Root />
            </SyncProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
