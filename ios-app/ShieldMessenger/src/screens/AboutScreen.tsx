import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const AboutScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('about')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.logoSection}>
        <Text style={styles.logo}>🛡️</Text>
        <Text style={styles.appName}>Shield Messenger</Text>
        <Text style={styles.version}>{t('version')} 1.0.0-beta ({t('build')} 42)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('cryptography')}</Text>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>{t('key_exchange')}</Text>
          <Text style={styles.cryptoValue}>ML-KEM-1024 (PQ) + X25519</Text>
        </View>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>{t('signatures')}</Text>
          <Text style={styles.cryptoValue}>Ed25519</Text>
        </View>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>{t('ratchet')}</Text>
          <Text style={styles.cryptoValue}>PQ Double Ratchet (Hybrid)</Text>
        </View>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>{t('symmetric')}</Text>
          <Text style={styles.cryptoValue}>AES-256-GCM / ChaCha20-Poly1305</Text>
        </View>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>KDF</Text>
          <Text style={styles.cryptoValue}>Argon2id</Text>
        </View>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>Database</Text>
          <Text style={styles.cryptoValue}>SQLCipher (AES-256)</Text>
        </View>
        <View style={styles.cryptoRow}>
          <Text style={styles.cryptoLabel}>{t('network')}</Text>
          <Text style={styles.cryptoValue}>Tor v3 Onion Services</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Privacy')}>
          <Text style={styles.linkText}>{t('privacy_policy')}</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('License')}>
          <Text style={styles.linkText}>{t('open_source_licenses')}</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>{t('security_audit_report')}</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>{t('built_with_footer')}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  logoSection: {alignItems: 'center', paddingVertical: Spacing.xxl},
  logo: {fontSize: 64},
  appName: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.md},
  version: {color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.xs},
  section: {borderTopWidth: 1, borderTopColor: Colors.divider, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm},
  cryptoRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  cryptoLabel: {color: Colors.textSecondary, fontSize: FontSize.sm},
  cryptoValue: {color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: Spacing.md},
  linkRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  linkText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '500'},
  linkArrow: {color: Colors.textTertiary, fontSize: FontSize.lg},
  footer: {color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center', paddingVertical: Spacing.xxl, lineHeight: 20},
});

export default AboutScreen;
