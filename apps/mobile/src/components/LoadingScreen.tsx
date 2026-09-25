import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading' }) => (
  <View style={styles.container}>
    <View style={styles.mark}>
      <Ionicons name="medical" size={30} color={colors.primary} />
    </View>
    <Text style={styles.title}>Prehospital EPR</Text>
    <ActivityIndicator size="small" color={colors.primary} style={styles.indicator} />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  title: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  indicator: {
    marginTop: spacing.xl,
  },
  message: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontFamily: typography.systemFont,
    fontSize: typography.sizes.sm,
  },
});
