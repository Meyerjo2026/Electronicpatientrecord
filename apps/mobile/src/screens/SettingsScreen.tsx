import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

export const SettingsScreen: React.FC = () => {
  const { session, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isOnline } = useSelector((state: RootState) => state.sync);

  const settingsSections = [
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
        { key: 'theme', label: 'Theme', subtitle: 'Light / Dark / System', value: 'System' },
        { key: 'units', label: 'Units', subtitle: 'Metric / Imperial', value: 'Metric' },
        { key: 'language', label: 'Language', subtitle: 'English / Spanish', value: 'English' },
      ],
    },
    {
      title: 'Clinical',
      items: [
        { key: 'protocols', label: 'Protocols', subtitle: 'View and manage clinical protocols' },
        { key: 'medications', label: 'Medication Library', subtitle: 'Drug reference and dosing' },
        { key: 'equipment', label: 'Equipment', subtitle: 'Bluetooth devices, monitors' },
      ],
    },
    {
      title: 'Data & Sync',
      items: [
        { key: 'sync', label: 'Sync Status', subtitle: isOnline ? 'Online - Synced' : 'Offline - Pending sync', isStatus: true },
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
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
            {section.items.map(item => (
              <TouchableOpacity key={item.key} style={styles.settingRow} onPress={() => {}}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
                </View>
                <View style={styles.settingRight}>
                  {item.isStatus && (
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDotSmall, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
                      <Text style={styles.statusBadgeText}>{isOnline ? 'Synced' : 'Pending'}</Text>
                    </View>
                  )}
                  {item.isInfo && <Text style={styles.infoValue}>{item.subtitle}</Text>}
                  {!item.isStatus && !item.isInfo && <Text style={styles.chevron}>›</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.logoutButton} onPress={() => {}}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  headerCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.sizes.xl, fontWeight: '600', color: colors.primary },
  userDetails: { flex: 1 },
  userName: { fontSize: typography.sizes.lg, fontWeight: '600', color: colors.textPrimary },
  userRole: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm, letterSpacing: 0.5 },
  settingsList: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, ...shadows.sm },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: { flex: 1 },
  settingLabel: { fontSize: typography.sizes.md, fontWeight: '500', color: colors.textPrimary },
  settingSubtitle: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: colors.primaryLight },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.primary },
  infoValue: { fontSize: typography.sizes.md, color: colors.textTertiary },
  chevron: { fontSize: typography.sizes.lg, color: colors.textTertiary },
  logoutButton: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontSize: typography.sizes.md, fontWeight: '600' },
});