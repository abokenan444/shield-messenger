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
      'Delete Account',
      'This will permanently delete your account, all messages, keys, and wallet data. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
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
      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🔐"
          title="Biometric Unlock"
          subtitle="Use Face ID or Touch ID"
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
          title="Screenshot Protection"
          subtitle="Block screenshots and screen recording"
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
          title="Auto-Lock"
          subtitle="Lock after 1 minute of inactivity"
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
          title="Duress PIN"
          subtitle="Set a panic PIN that wipes all data"
          onPress={() => navigation.navigate('DuressPin')}
        />
        <SettingRow
          icon="🔑"
          title="Change Password"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </View>

      {/* Network Section */}
      <Text style={styles.sectionTitle}>Network & Privacy</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🧅"
          title="Tor Status"
          subtitle="Connected — 3 circuits active"
          onPress={() => navigation.navigate('TorStatus')}
        />
        <SettingRow
          icon="🌉"
          title="Use Bridges"
          subtitle="Bypass Tor censorship with obfs4/snowflake"
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
          title="Traffic Padding"
          subtitle="Send cover traffic to prevent analysis"
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
          title="New Tor Identity"
          subtitle="Get new circuits (may disconnect calls)"
          onPress={() => Alert.alert('New Identity', 'Requesting new Tor circuits...')}
        />
      </View>

      {/* Wallet Section */}
      <Text style={styles.sectionTitle}>Wallet</Text>
      <View style={styles.section}>
        <SettingRow
          icon="💰"
          title="Zcash Wallet"
          subtitle="Shielded transactions"
          onPress={() => navigation.navigate('Wallet')}
        />
        <SettingRow
          icon="📝"
          title="Backup Seed Phrase"
          subtitle="Required to recover your wallet"
          onPress={() => navigation.navigate('BackupSeed')}
        />
      </View>

      {/* About Section */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.section}>
        <SettingRow
          icon="ℹ️"
          title="Version"
          subtitle="1.0.0-beta (Rust core v0.3.0)"
        />
        <SettingRow
          icon="📄"
          title="Privacy Policy"
          onPress={() => navigation.navigate('Privacy')}
        />
        <SettingRow
          icon="📜"
          title="License"
          subtitle="PolyForm Noncommercial 1.0.0"
          onPress={() => navigation.navigate('License')}
        />
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionTitle, styles.destructiveText]}>Danger Zone</Text>
      <View style={styles.section}>
        <SettingRow
          icon="🗑️"
          title="Delete Account"
          subtitle="Permanently erase all data"
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
