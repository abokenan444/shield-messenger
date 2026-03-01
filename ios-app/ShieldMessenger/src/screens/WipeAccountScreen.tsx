import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const WipeAccountScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');

  const handleWipe = () => {
    Alert.alert(
      t('final_warning'),
      t('wipe_final_warning_desc'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('wipe_everything'),
          style: 'destructive',
          onPress: () => {
            // TODO: Call Rust core secure_wipe_all()
            // This will: zero all memory, drop SQLCipher tables, overwrite key files, clear keychain
          },
        },
      ],
    );
  };

  const canWipe = confirmation === 'WIPE' && password.length >= 12;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('wipe_account')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningTitle}>{t('permanent_data_destruction')}</Text>
        <Text style={styles.warningText}>
          {t('wipe_warning_text')}
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t('what_will_be_destroyed')}</Text>
          <Text style={styles.cardItem}>🔑 {t('all_crypto_keys')}</Text>
          <Text style={styles.cardItem}>💬 {t('all_messages_media')}</Text>
          <Text style={styles.cardItem}>👥 {t('all_contacts_groups')}</Text>
          <Text style={styles.cardItem}>💰 {t('wallet_keys_history')}</Text>
          <Text style={styles.cardItem}>🗄️ {t('entire_sqlcipher_db')}</Text>
          <Text style={styles.cardItem}>🧅 {t('tor_hidden_service_keys')}</Text>
        </View>

        <Text style={styles.inputLabel}>{t('type_wipe_to_confirm')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('type_wipe')}
          placeholderTextColor={Colors.textTertiary}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
        />

        <Text style={styles.inputLabel}>{t('enter_your_password')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('your_current_password')}
          placeholderTextColor={Colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.wipeBtn, !canWipe && styles.btnDisabled]}
          disabled={!canWipe}
          onPress={handleWipe}>
          <Text style={styles.wipeBtnText}>{t('wipe_all_data')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.error, fontSize: FontSize.xl, fontWeight: '700'},
  content: {flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg},
  warningIcon: {fontSize: 48},
  warningTitle: {color: Colors.error, fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.md},
  warningText: {color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 24, marginTop: Spacing.sm},
  infoCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', marginTop: Spacing.xl, borderLeftWidth: 3, borderLeftColor: Colors.error},
  cardTitle: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm},
  cardItem: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 24},
  inputLabel: {color: Colors.textSecondary, fontSize: FontSize.sm, alignSelf: 'flex-start', marginTop: Spacing.lg, marginBottom: Spacing.xs},
  input: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, width: '100%', borderWidth: 1, borderColor: Colors.border},
  wipeBtn: {backgroundColor: Colors.error, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.lg, marginTop: Spacing.xl},
  wipeBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  btnDisabled: {opacity: 0.4},
});

export default WipeAccountScreen;
