import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@prehospital-epr/ui';
import { RootState } from '../store';
import { LoadingScreen } from '../components/LoadingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PatientListScreen } from '../screens/PatientListScreen';
import { EncounterScreen } from '../screens/EncounterScreen';
import { VitalSignsScreen } from '../screens/VitalSignsScreen';
import { InterventionsScreen } from '../screens/InterventionsScreen';
import { HandoffScreen } from '../screens/HandoffScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PatientReportScreen } from '../screens/PatientReportScreen';
import { QualityIndicatorsScreen } from '../screens/QualityIndicatorsScreen';
import { FormReadinessScreen } from '../screens/FormReadinessScreen';

export type MainStackParamList = {
  MainTabs: undefined;
  EncounterDetail: { encounterId: string };
  VitalSignsDetail: { encounterId: string };
  Interventions: { encounterId: string };
  Handoff: { encounterId: string };
  Settings: undefined;
  PatientReport: { encounterId: string };
  QualityIndicators: undefined;
  FormReadiness: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Patients: undefined;
  Encounter: undefined;
  Vitals: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();
const AuthStack = createNativeStackNavigator();

const TAB_ICONS: Record<keyof TabParamList, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { on: 'grid', off: 'grid-outline' },
  Patients: { on: 'people', off: 'people-outline' },
  Encounter: { on: 'pulse', off: 'pulse-outline' },
  Vitals: { on: 'speedometer', off: 'speedometer-outline' },
  More: { on: 'ellipsis-horizontal-circle', off: 'ellipsis-horizontal-circle-outline' },
};

const createTabStyles = (theme: Theme, bottomInset: number) => ({
  tabBarStyle: {
    position: 'absolute' as const,
    backgroundColor: theme.colors.surfaceTranslucent,
    borderTopWidth: 0,
    borderTopColor: theme.colors.border,
    height: theme.layout.tabBarClearance - 20 + bottomInset,
    paddingTop: theme.spacing.sm,
    paddingBottom: 8 + bottomInset,
    ...theme.elevation.md,
  },
  tabBarActiveTintColor: theme.colors.primary,
  tabBarInactiveTintColor: theme.colors.textTertiary,
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.semibold,
  },
  tabBarItemStyle: {
    paddingVertical: 2,
  },
});

const MainTabs: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createTabStyles(theme, insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        ...styles,
        tabBarIcon: ({ focused, color }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name].on : TAB_ICONS[route.name].off}
            size={22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Patients" component={PatientListScreen} />
      <Tab.Screen name="Encounter" component={EncounterScreen} />
      <Tab.Screen name="Vitals" component={VitalSignsScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const MainStack: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surfaceTranslucent },
        headerShadowVisible: false,
        headerTintColor: theme.colors.primary,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: theme.typography.systemFont,
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.weights.semibold,
        },
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
        headerBlurEffect: Platform.OS === 'ios' ? 'systemChromeMaterial' : undefined,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="EncounterDetail"
        component={EncounterScreen}
        options={{ title: 'Encounter' }}
      />
      <Stack.Screen
        name="VitalSignsDetail"
        component={VitalSignsScreen}
        options={{ title: 'Vital Signs' }}
      />
      <Stack.Screen
        name="Interventions"
        component={InterventionsScreen}
        options={{ title: 'Interventions' }}
      />
      <Stack.Screen name="Handoff" component={HandoffScreen} options={{ title: 'Handoff' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen
        name="PatientReport"
        component={PatientReportScreen}
        options={{ title: 'Patient Report' }}
      />
      <Stack.Screen
        name="QualityIndicators"
        component={QualityIndicatorsScreen}
        options={{ title: 'Quality Indicators' }}
      />
      <Stack.Screen
        name="FormReadiness"
        component={FormReadinessScreen}
        options={{ title: 'Form Readiness' }}
      />
    </Stack.Navigator>
  );
};

const Auth: React.FC = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);

  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? <MainStack /> : <Auth />;
};
