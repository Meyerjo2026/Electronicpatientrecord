import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Card,
  Screen,
  Text,
  TextField,
  useTheme,
} from '@prehospital-epr/ui';
import type { AppDispatch, RootState } from '../store';
import { checkAuthStatus, clearError, DEMO_AUTH_ENABLED, login } from '../store/authSlice';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const error = useSelector((state: RootState) => state.auth.error);
  const biometricEnabled = useSelector((state: RootState) => state.auth.biometricEnabled);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  const handleSignIn = useCallback(() => {
    dispatch(login({ username: username.trim(), password, pin: pin || undefined }));
  }, [dispatch, username, password, pin]);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <Screen contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.borderRadius.xl,
              backgroundColor: theme.colors.primarySurface,
            }}
          >
            <Ionicons name="medical" size={34} color={theme.colors.primary} />
          </View>
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Text variant="title">Prehospital EPR</Text>
            <Text variant="subheading" tone="tertiary" style={{ textAlign: 'center' }}>
              Offline-first patient record for EMS crews
            </Text>
          </View>
        </View>

        {!DEMO_AUTH_ENABLED ? (
          <Card>
            <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons name="lock-closed" size={26} color={theme.colors.warning} />
              <Text variant="subheading" style={{ textAlign: 'center' }}>
                Sign-in is not configured
              </Text>
              <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
                This build has no authentication provider connected, so no crew member can be
                signed in. The demo login is available in development builds only.
              </Text>
            </View>
          </Card>
        ) : (
          <Card>
            <TextField
              label="Username"
              required
              value={username}
              onChangeText={value => {
                setUsername(value);
                if (error) dispatch(clearError());
              }}
              placeholder="EMS crew identifier"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="next"
              editable={!isLoading}
            />

            <TextField
              label="Password"
              required
              value={password}
              onChangeText={value => {
                setPassword(value);
                if (error) dispatch(clearError());
              }}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={canSubmit ? handleSignIn : undefined}
              editable={!isLoading}
            />

            <TextField
              label="PIN"
              help="Required on shared and vehicle-mounted devices."
              value={pin}
              onChangeText={setPin}
              placeholder="4 digits"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              editable={!isLoading}
            />

            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.errorSurface,
                }}
                accessibilityLiveRegion="assertive"
              >
                <Ionicons name="alert-circle" size={17} color={theme.colors.error} />
                <Text variant="subheading" tone="critical" style={{ flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Button
              label="Sign In"
              onPress={handleSignIn}
              loading={isLoading}
              disabled={!canSubmit}
              fullWidth
              size="lg"
              icon="log-in-outline"
            />

            {biometricEnabled ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    marginVertical: theme.spacing.lg,
                  }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.separator }} />
                  <Text variant="caption" tone="tertiary">
                    or
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.separator }} />
                </View>
                <Button
                  label="Use biometrics"
                  onPress={() => dispatch(checkAuthStatus())}
                  variant="secondary"
                  fullWidth
                  icon="finger-print-outline"
                />
              </>
            ) : null}
          </Card>
        )}

        <Text
          variant="caption"
          tone="tertiary"
          style={{ textAlign: 'center', marginTop: theme.spacing.xl }}
        >
          Access is logged and audited. Handle patient data in accordance with
          your service&apos;s information governance policy.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
};
