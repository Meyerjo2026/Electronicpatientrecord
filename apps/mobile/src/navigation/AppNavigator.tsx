import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PatientListScreen } from '../screens/PatientListScreen';
import { EncounterScreen } from '../screens/EncounterScreen';
import { VitalSignsScreen } from '../screens/VitalSignsScreen';
import { InterventionsScreen } from '../screens/InterventionsScreen';
import { HandoffScreen } from '../screens/HandoffScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientListScreen}
        options={{
          title: 'Patients',
          tabBarLabel: 'Patients',
        }}
      />
      <Tab.Screen
        name="ActiveEncounter"
        component={EncounterScreen}
        options={{
          title: 'Encounter',
          tabBarLabel: 'Encounter',
        }}
      />
      <Tab.Screen
        name="Vitals"
        component={VitalSignsScreen}
        options={{
          title: 'Vital Signs',
          tabBarLabel: 'Vitals',
        }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          title: 'More',
          tabBarLabel: 'More',
        }}
      />
    </Tab.Navigator>
  );
};

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

const MainStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.textPrimary,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="EncounterDetail" component={EncounterScreen} />
      <Stack.Screen name="VitalSignsDetail" component={VitalSignsScreen} />
      <Stack.Screen name="Interventions" component={InterventionsScreen} />
      <Stack.Screen name="Handoff" component={HandoffScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);

  if (isLoading) {
    return null; // Or a loading screen
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
};