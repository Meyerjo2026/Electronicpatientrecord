import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Text } from '@prehospital-epr/ui';

export interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading',
}) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        gap: theme.spacing.lg,
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <View
        style={{
          width: 64,
          height: 64,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.borderRadius.lg,
          backgroundColor: theme.colors.primarySurface,
        }}
      >
        <Ionicons name="medical" size={30} color={theme.colors.primary} />
      </View>
      <Text variant="heading">Prehospital EPR</Text>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text variant="caption" tone="tertiary">
        {message}
      </Text>
    </View>
  );
};
