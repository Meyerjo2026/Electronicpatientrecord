import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { login, checkAuthStatus } from '../store/authSlice';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

export const LoginScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    pin: '',
    biometric: false,
  });

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  const handleLogin = async () => {
    try {
      await dispatch(login(credentials)).unwrap();
    } catch {}
  };

  if (isLoading && !credentials.username) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking your session…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Ionicons name="medical" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>Prehospital EPR</Text>
          <Text style={styles.subtitle}>Your clinical record, ready when you are.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>Provider Sign In</Text>
            <Text style={styles.sectionSubtitle}>Use your clinical account to continue</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username or Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={credentials.username}
                onChangeText={text => setCredentials({ ...credentials, username: text })}
                placeholder="Enter username"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoComplete="username"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={credentials.password}
                onChangeText={text => setCredentials({ ...credentials, password: text })}
                placeholder="Enter password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN <Text style={styles.optional}>Optional</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="keypad-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={credentials.pin}
                onChangeText={text => setCredentials({ ...credentials, pin: text })}
                placeholder="4-digit PIN"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.biometricButton} onPress={() => {}}>
            <Ionicons name="finger-print" size={24} color={colors.primary} />
            <Text style={styles.biometricButtonText}>Use Face ID or Touch ID</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Version 1.0.0 · HIPAA compliant · FHIR R4</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    ...shadows.sm,
  },
  title: {
    ...typography.styles.title1,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.lg,
  },
  formHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.title2,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginLeft: spacing.xxs,
  },
  optional: {
    color: colors.textTertiary,
    fontWeight: '400',
  },
  inputWrapper: {
    minHeight: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.fill,
  },
  input: {
    flex: 1,
    height: layout.controlHeight,
    color: colors.textPrimary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '14',
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.styles.footnote,
    color: colors.error,
    flex: 1,
  },
  loginButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  loginButtonText: {
    ...typography.styles.headline,
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.72,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  dividerText: {
    ...typography.styles.caption2,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  biometricButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  biometricButtonText: {
    ...typography.styles.headline,
    color: colors.primary,
  },
  footerText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },
});
