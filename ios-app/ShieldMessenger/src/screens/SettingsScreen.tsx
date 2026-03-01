import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface SettingsScreenProps {
  navigation: any;
}

interface SettingRowProps {
  title: string;
  subtitle?: string;
  icon: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  rightElement,
  destructive,
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
    accessibilityRole="button">
    <Text style={styles.settingIcon}>{icon}</Text>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>
        {title}
      </Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (
      <Text style={styles.chevron}>{'›'}</Text>
    )}
  </TouchableOpacity>
);

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [screenshotProtection, setScreenshotProtection] = useState(true);
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [useBridges, setUseBridges] = useState(false);
  const [paddingEnabled, setPaddingEnabled] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      t('delete_account'),
      t('delete_account_warning'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('confirm_delete'),
          style: 'destructive',
          onPress: () => {
            // TODO: Call Rust core secure wipe
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>SM</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Shield User</Text>
          <Text style={styles.profileAddress}>abc123...xyz.onion</Text>
        </View>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => navigation.navigate('QRCode')}
          accessibilityLabel="Show QR code">
          <Text style={styles.qrButtonText}>QR</Text>
        </TouchableOpacity>
      </View>

      {/* Security Section */}
      <Text style={styles.sectionTitle}>{t('security')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🔐"
          title={t('biometric_unlock')}
          subtitle={t('use_faceid_touchid')}
          rightElement={
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{false: Colors.surfaceVariant, true: Colors.primary}}
              thumbColor={Colors.textPrimary}
            />
          }
        />
        <SettingRow
          icon="📸"
          title={t('screenshot_protection')}
          subtitle={t('block_screenshots')}
          rightElement={
            <Switch
              value={screenshotProtection}
              onValueChange={setScreenshotProtection}
              trackColor={{false: Colors.surfaceVariant, true: Colors.primary}}
              thumbColor={Colors.textPrimary}
            />
          }
        />
        <SettingRow
          icon="⏱️"
          title={t('auto_lock')}
          subtitle={t('lock_after_1min')}
          rightElement={
            <Switch
              value={autoLockEnabled}
              onValueChange={setAutoLockEnabled}
              trackColor={{false: Colors.surfaceVariant, true: Colors.primary}}
              thumbColor={Colors.textPrimary}
            />
          }
        />
        <SettingRow
          icon="🚨"
          title={t('duress_pin')}
          subtitle={t('set_panic_pin')}
          onPress={() => navigation.navigate('DuressPin')}
        />
        <SettingRow
          icon="🔑"
          title={t('change_password')}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <SettingRow
          icon="🔒"
          title={t('two_factor')}
          onPress={() => navigation.navigate('TotpSetup')}
        />
      </View>

      {/* Network Section */}
      <Text style={styles.sectionTitle}>{t('network_privacy')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🧅"
          title={t('tor_status')}
          subtitle={t('circuits_active')}
          onPress={() => navigation.navigate('TorStatus')}
        />
        <SettingRow
          icon="🌉"
          title={t('use_bridges')}
          subtitle={t('bypass_censorship')}
          rightElement={
            <Switch
              value={useBridges}
              onValueChange={setUseBridges}
              trackColor={{false: Colors.surfaceVariant, true: Colors.primary}}
              thumbColor={Colors.textPrimary}
            />
          }
        />
        <SettingRow
          icon="📊"
          title={t('traffic_padding')}
          subtitle={t('send_cover_traffic')}
          rightElement={
            <Switch
              value={paddingEnabled}
              onValueChange={setPaddingEnabled}
              trackColor={{false: Colors.surfaceVariant, true: Colors.primary}}
              thumbColor={Colors.textPrimary}
            />
          }
        />
        <SettingRow
          icon="🔄"
          title={t('new_identity')}
          subtitle={t('get_new_circuits')}
          onPress={() => Alert.alert(t('new_identity'), t('get_new_circuits'))}
        />
      </View>

      {/* Wallet Section */}
      <Text style={styles.sectionTitle}>{t('wallet')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="💰"
          title={t('wallet')}
          subtitle={t('shielded_transactions')}
          onPress={() => navigation.navigate('Wallet')}
        />
        <SettingRow
          icon="📝"
          title={t('backup_seed')}
          subtitle={t('required_recover_wallet')}
          onPress={() => navigation.navigate('BackupSeed')}
        />
      </View>

      {/* General Section */}
      <Text style={styles.sectionTitle}>{t('settings')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🌐"
          title={t('language')}
          onPress={() => navigation.navigate('Language')}
        />
        <SettingRow
          icon="⭐"
          title={t('subscription')}
          onPress={() => navigation.navigate('Subscription')}
        />
        <SettingRow
          icon="🔔"
          title={t('notifications')}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      {/* About Section */}
      <Text style={styles.sectionTitle}>{t('about')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="ℹ️"
          title={t('version')}
          subtitle="1.0.0-beta (Rust core v0.3.0)"
        />
        <SettingRow
          icon="📄"
          title={t('privacy_policy')}
          onPress={() => navigation.navigate('Privacy')}
        />
        <SettingRow
          icon="📜"
          title={t('license')}
          subtitle="PolyForm Noncommercial 1.0.0"
          onPress={() => navigation.navigate('License')}
        />
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionTitle, styles.destructiveText]}>{t('danger_zone')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🗑️"
          title={t('delete_account')}
          subtitle={t('permanently_erase')}
          onPress={handleDeleteAccount}
          destructive
        />
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingTop: Spacing.xl + Spacing.lg,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profileAddress: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg + Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textTertiary,
  },
  destructiveText: {
    color: Colors.destructive,
  },
  footer: {
    height: 100,
  },
});

// Platform import for monospace font
import {Platform} from 'react-native';

export default SettingsScreen;
