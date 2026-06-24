/**
 * Settings screen — profile, backup, sync, and app settings.
 */

import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius, typography, shadows } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/auth-store';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { useAlert } from '../../src/components/AlertProvider';
import { playSound } from '../../src/lib/sound-manager';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { user, clearAuth } = useAuthStore();
  const { showAlert } = useAlert();

  const [autoBackup, setAutoBackup] = useState(
    user?.autoBackupEnabled ?? false
  );

  const handleLogout = () => {
    playSound('click');
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          playSound('success');
          clearAuth();
        },
      },
    ]);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
      {title}
    </Text>
  );

  const SettingRow = ({
    icon,
    title,
    subtitle,
    value,
    onPress,
    trailing,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    trailing?: React.ReactNode;
  }) => (
    <AnimatedPressable
      style={[
        styles.settingRow,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
      ]}
      onPress={onPress}
      disabled={!onPress && !trailing}
      haptic="light"
    >
      <Ionicons name={icon} size={24} color={theme.colors.textSecondary} style={styles.settingIcon} />
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.settingSubtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text style={[styles.settingValue, { color: theme.colors.textTertiary }]}>
          {value}
        </Text>
      )}
      {trailing}
    </AnimatedPressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile */}
      <SectionHeader title="ACCOUNT" />
      <View
        style={[
          styles.profileCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.primary + '30' },
          ]}
        >
          <Text style={styles.avatarText}>
            {(user?.displayName?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.colors.text }]}>
            {user?.displayName || 'User'}
          </Text>
          <Text
            style={[
              styles.profileEmail,
              { color: theme.colors.textSecondary },
            ]}
          >
            {user?.email || 'Not signed in'}
          </Text>
        </View>
      </View>

      {/* Google Drive Backup */}
      <SectionHeader title="GOOGLE DRIVE BACKUP" />
      <SettingRow
        icon="cloud-upload-outline"
        title="Auto Backup"
        subtitle="Automatically back up notes to Google Drive"
        trailing={
          <Switch
            value={autoBackup}
            onValueChange={(val) => {
              playSound('tap');
              setAutoBackup(val);
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary + '50',
            }}
            thumbColor={autoBackup ? theme.colors.primary : theme.colors.textTertiary}
          />
        }
      />
      <SettingRow
        icon="archive-outline"
        title="Back Up Now"
        subtitle={
          user?.lastBackupAt
            ? `Last backup: ${new Date(user.lastBackupAt).toLocaleDateString()}`
            : 'No backups yet'
        }
        onPress={() => { playSound('click'); showAlert('Backup', 'Starting backup...'); }}
      />
      <SettingRow
        icon="download-outline"
        title="Restore from Backup"
        subtitle="Restore notes from a previous backup"
        onPress={() => { playSound('click'); showAlert('Restore', 'Loading backups...'); }}
      />

      {/* Data Management */}
      <SectionHeader title="DATA" />
      <SettingRow
        icon="archive-outline"
        title="Archive"
        subtitle="View and restore archived notes"
        onPress={() => { playSound('click'); router.push('/archive'); }}
      />
      <SettingRow
        icon="trash-bin-outline"
        title="Trash"
        subtitle="View and restore deleted notes"
        onPress={() => { playSound('click'); router.push('/trash'); }}
      />

      {/* Appearance */}
      <SectionHeader title="APPEARANCE" />
      <SettingRow
        icon="moon-outline"
        title="Theme"
        value={themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light'}
        onPress={() => {
          playSound('tap');
          const modes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
          const current = modes.indexOf(themeMode as any);
          const next = modes[(current + 1) % modes.length];
          setThemeMode(next);
        }}
      />

      {/* Security */}
      <SectionHeader title="SECURITY" />
      <SettingRow
        icon="lock-closed-outline"
        title="App Lock"
        subtitle="Require Face ID / fingerprint to open app"
        trailing={
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary + '50',
            }}
          />
        }
      />

      {/* About */}
      <SectionHeader title="ABOUT" />
      <SettingRow icon="information-circle-outline" title="Version" value="1.0.0" />
      <SettingRow
        icon="star-outline"
        title="Rate App"
        onPress={() => {}}
      />

      {/* Logout */}
      <AnimatedPressable
        style={[
          styles.logoutButton,
          { backgroundColor: theme.colors.error + '15' },
        ]}
        onPress={handleLogout}
        haptic="medium"
      >
        <Text style={[styles.logoutText, { color: theme.colors.error }]}>
          Sign Out
        </Text>
      </AnimatedPressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base },
  sectionHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadows.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  profileEmail: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  settingIcon: { marginRight: spacing.md },
  settingContent: { flex: 1 },
  settingTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  settingSubtitle: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  settingValue: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
  },
  logoutButton: {
    marginTop: spacing.xl,
    padding: spacing.base,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
});
