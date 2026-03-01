import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const CreateWalletScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    setCreating(true);
    // TODO: Generate Monero wallet via Rust core
    setTimeout(() => {
      setCreating(false);
      navigation.navigate('Wallet');
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('create_wallet')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>💰</Text>
        <Text style={styles.heading}>{t('create_monero_wallet')}</Text>
        <Text style={styles.subtitle}>{t('create_wallet_subtitle')}</Text>

        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🔐</Text>
            <Text style={styles.featureText}>{t('keys_in_secure_enclave')}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🧅</Text>
            <Text style={styles.featureText}>{t('transactions_via_tor')}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>👤</Text>
            <Text style={styles.featureText}>{t('ringct_privacy')}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>{t('send_xmr_in_chats')}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
          {creating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.textOnPrimary} />
              <Text style={styles.createBtnText}> {t('generating_keys')}</Text>
            </View>
          ) : (
            <Text style={styles.createBtnText}>{t('create_wallet')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.importBtn} onPress={() => navigation.navigate('ImportWallet')}>
          <Text style={styles.importBtnText}>{t('import_existing_wallet')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl},
  icon: {fontSize: 64},
  heading: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.lg},
  subtitle: {color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22},
  featureList: {width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.xl},
  featureRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md},
  featureIcon: {fontSize: 20, marginRight: Spacing.md},
  featureText: {color: Colors.textSecondary, fontSize: FontSize.md, flex: 1},
  createBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, width: '100%', alignItems: 'center', marginTop: Spacing.xl},
  createBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  loadingRow: {flexDirection: 'row', alignItems: 'center'},
  importBtn: {paddingVertical: Spacing.md, marginTop: Spacing.md},
  importBtnText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '600'},
});

export default CreateWalletScreen;
