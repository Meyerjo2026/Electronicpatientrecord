import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { LoadingScreen } from '../components/LoadingScreen';
import { RootState } from '../store';
import { DashboardScreen } from '../screens/DashboardScreen';
import { EncounterScreen } from '../screens/EncounterScreen';
import { HandoffScreen } from '../screens/HandoffScreen';
import { InterventionsScreen } from '../screens/InterventionsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PatientListScreen } from '../screens/PatientListScreen';
import { PatientReportScreen } from '../screens/PatientReportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { VitalSignsScreen } from '../screens/VitalSignsScreen';
import { colors, layout, shadows, typography } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textTertiary,
      tabBarHideOnKeyboard: true,
      tabBarLabelStyle: {
        fontFamily: typography.systemFont,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
      },
      tabBarItemStyle: {
        paddingVertical: 4,
      },
      tabBarStyle: {
        position: 'absolute',
        backgroundColor: colors.surfaceTranslucent,
        borderTopWidth: 0,
        height: layout.tabBarHeight,
        paddingTop: 6,
        paddingBottom: 8,
        ...shadows.md,
      },
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        title: 'Dashboard',
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Patients"
      component={PatientListScreen}
      options={{
        title: 'Patients',
        tabBarLabel: 'Patients',
        tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="ActiveEncounter"
      component={EncounterScreen}
      options={{
        title: 'Encounter',
        tabBarLabel: 'Encounter',
        tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Vitals"
      component={VitalSignsScreen}
      options={{
        title: 'Vital Signs',
        tabBarLabel: 'Vitals',
        tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="More"
      component={SettingsScreen}
      options={{
        title: 'More',
        tabBarLabel: 'More',
        tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

const AuthStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

const MainStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: colors.surfaceTranslucent,
      },
      headerShadowVisible: false,
      headerTintColor: colors.primary,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        color: colors.textPrimary,
        fontFamily: typography.systemFont,
        fontSize: typography.sizes.md,
        fontWeight: '600',
      },
      headerBackTitleStyle: {
        fontFamily: typography.systemFont,
      },
      contentStyle: {
        backgroundColor: colors.background,
      },
    }}
  >
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="EncounterDetail" component={EncounterScreen} />
    <Stack.Screen name="VitalSignsDetail" component={VitalSignsScreen} />
    <Stack.Screen name="Interventions" component={InterventionsScreen} />
    <Stack.Screen name="Handoff" component={HandoffScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="PatientReport" component={PatientReportScreen} />
  </Stack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
};
