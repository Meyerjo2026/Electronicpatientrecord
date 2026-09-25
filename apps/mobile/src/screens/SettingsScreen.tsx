import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { colors, spacing, typography, borderRadius, shadows, layout } from '../theme';

type SettingItem = {
  key: string;
  label: string;
  subtitle: string;
  value?: string;
  isStatus?: boolean;
  isInfo?: boolean;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export const SettingsScreen: React.FC = () => {
  const { session } = useSelector((state: RootState) => state.auth);
  const { isOnline } = useSelector((state: RootState) => state.sync);

  const settingsSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        { key: 'profile', label: 'Profile', subtitle: 'Manage your profile and credentials' },
        { key: 'notifications', label: 'Notifications', subtitle: 'Configure alert preferences' },
        { key: 'security', label: 'Security', subtitle: 'Biometric auth, PIN, session timeout' },
      ],
    },
    {
      title: 'App Preferences',
      items: [
        { key: 'theme', label: 'Theme', subtitle: 'Light, dark, or system', value: 'System' },
        { key: 'units', label: 'Units', subtitle: 'Metric or imperial', value: 'Metric' },
        { key: 'language', label: 'Language', subtitle: 'English or Spanish', value: 'English' },
      ],
    },
    {
      title: 'Clinical',
      items: [
        { key: 'protocols', label: 'Protocols', subtitle: 'View and manage clinical protocols' },
        { key: 'medications', label: 'Medication Library', subtitle: 'Drug reference and dosing' },
        { key: 'equipment', label: 'Equipment', subtitle: 'Bluetooth devices and monitors' },
      ],
    },
    {
      title: 'Data & Sync',
      items: [
        { key: 'sync', label: 'Sync Status', subtitle: isOnline ? 'Online and synced' : 'Offline with pending changes', isStatus: true },
        { key: 'storage', label: 'Storage', subtitle: 'Manage local data and cache' },
        { key: 'export', label: 'Export Data', subtitle: 'Export encounters and reports' },
      ],
    },
    {
      title: 'About',
      items: [
        { key: 'version', label: 'Version', subtitle: '1.0.0', isInfo: true },
        { key: 'license', label: 'Licenses', subtitle: 'Open source licenses' },
        { key: 'support', label: 'Support', subtitle: 'Help and feedback' },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>More</Text>
        <Text style={styles.pageSubtitle}>Account, preferences, and clinical tools.</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session?.roles?.[0]?.charAt(0) || 'P'}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{session?.roles?.[0]?.replace('EMS_', '') || 'Provider'}</Text>
            <Text style={styles.userRole}>{session?.roles?.join(', ') || 'EMS Provider'}</Text>
          </View>
        </View>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.error }]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {settingsSections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.settingsList}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.settingRow, index < section.items.length - 1 && styles.settingRowBorder]}
                onPress={() => {}}
              >
                <View style={styles.settingIcon}>
                  <Ionicons
                    name={getSettingIcon(item.key)}
                    size={20}
                    color={item.key === 'sync' ? (isOnline ? colors.success : colors.warning) : colors.primary}
                  />
                </View>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.settingRight}>
                  {item.isStatus && (
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDotSmall, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
                      <Text style={styles.statusBadgeText}>{isOnline ? 'Synced' : 'Pending'}</Text>
                    </View>
                  )}
                  {item.isInfo && <Text style={styles.infoValue}>{item.value || item.subtitle}</Text>}
                  {!item.isStatus && !item.isInfo && <Text style={styles.valueText}>{item.value || ''}</Text>}
                  {!item.isStatus && !item.isInfo && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={() => {}}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

function getSettingIcon(key: string): React.ComponentProps<typeof Ionicons>['name'] {
  const icons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    profile: 'person-outline',
    notifications: 'notifications-outline',
    security: 'shield-checkmark-outline',
    theme: 'color-palette-outline',
    units: 'speedometer-outline',
    language: 'language-outline',
    protocols: 'document-text-outline',
    medications: 'medical-outline',
    equipment: 'hardware-chip-outline',
    sync: 'sync-outline',
    storage: 'server-outline',
    export: 'download-outline',
    version: 'information-circle-outline',
    license: 'document-outline',
    support: 'help-circle-outline',
  };
  return icons[key] || 'chevron-forward';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  pageHeader: {
    marginBottom: spacing.lg,
  },
  pageTitle: {
    ...typography.styles.largeTitle,
    color: colors.textPrimary,
  },
  pageSubtitle: {
    ...typography.styles.subheadline,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  profileCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  avatarText: {
    ...typography.styles.title2,
    color: colors.primary,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  userRole: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xxs,
  },
  settingsList: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  settingRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  settingIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.md,
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    ...typography.styles.headline,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondaryLight,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.styles.caption2,
    color: colors.secondaryDark,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.styles.footnote,
    color: colors.textTertiary,
  },
  valueText: {
    ...typography.styles.footnote,
    color: colors.textSecondary,
  },
  logoutButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '14',
  },
  logoutText: {
    ...typography.styles.headline,
    color: colors.error,
  },
});
