import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const AccountCreatedScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.title}>Account Created</Text>
        <Text style={styles.subtitle}>Your keys have been generated and your database is encrypted</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🔑</Text>
            <Text style={styles.infoText}>Ed25519 identity keypair generated</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🔐</Text>
            <Text style={styles.infoText}>ML-KEM post-quantum keys created</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🗄️</Text>
            <Text style={styles.infoText}>SQLCipher database initialized</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🧅</Text>
            <Text style={styles.infoText}>Tor hidden service configured</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Important: Back Up Your Seed Phrase</Text>
          <Text style={styles.warningText}>
            Your seed phrase is the only way to recover your account. Back it up now before you start messaging.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.backupBtn} onPress={() => navigation.navigate('BackupSeed')}>
          <Text style={styles.backupBtnText}>Back Up Seed Phrase</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.skipBtnText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between'},
  content: {alignItems: 'center', paddingTop: 100, paddingHorizontal: Spacing.xl},
  checkmark: {width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success, color: '#FFFFFF', fontSize: 40, fontWeight: '700', textAlign: 'center', lineHeight: 80, overflow: 'hidden'},
  title: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.xl},
  subtitle: {color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm},
  infoCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', marginTop: Spacing.xl},
  infoRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md},
  infoIcon: {fontSize: 20, marginRight: Spacing.md},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1},
  warningCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', marginTop: Spacing.lg, borderLeftWidth: 3, borderLeftColor: Colors.warning},
  warningTitle: {color: Colors.warning, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm},
  warningText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
  actions: {paddingHorizontal: Spacing.xl, paddingBottom: 50, gap: Spacing.md},
  backupBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  backupBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  skipBtn: {paddingVertical: Spacing.md, alignItems: 'center'},
  skipBtnText: {color: Colors.textTertiary, fontSize: FontSize.md},
});

export default AccountCreatedScreen;
