import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const WelcomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <Text style={styles.logo}>🛡️</Text>
        <Text style={styles.appName}>{t('app_name')}</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🔐</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{t('feature_mlkem')}</Text>
            <Text style={styles.featureDesc}>{t('feature_mlkem_desc')}</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>🧅</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{t('feature_tor')}</Text>
            <Text style={styles.featureDesc}>{t('feature_tor_desc')}</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>💰</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{t('feature_wallet')}</Text>
            <Text style={styles.featureDesc}>{t('feature_wallet_desc')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateAccount')}>
          <Text style={styles.createBtnText}>{t('create_account')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.restoreBtn} onPress={() => navigation.navigate('RestoreAccount')}>
          <Text style={styles.restoreBtnText}>{t('restore_from_backup')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>{t('no_phone_required')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between', paddingBottom: 50},
  logoSection: {alignItems: 'center', paddingTop: 120},
  logo: {fontSize: 72},
  appName: {color: Colors.textPrimary, fontSize: FontSize.title, fontWeight: '800', marginTop: Spacing.lg},
  tagline: {color: Colors.textSecondary, fontSize: FontSize.md, marginTop: Spacing.sm},
  features: {paddingHorizontal: Spacing.xl},
  featureRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl},
  featureIcon: {fontSize: 32, marginRight: Spacing.lg},
  featureText: {flex: 1},
  featureTitle: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600'},
  featureDesc: {color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2},
  actions: {paddingHorizontal: Spacing.xl, gap: Spacing.md},
  createBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  createBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  restoreBtn: {backgroundColor: Colors.surface, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  restoreBtnText: {color: Colors.primary, fontSize: FontSize.lg, fontWeight: '600'},
  footer: {color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center'},
});

export default WelcomeScreen;
