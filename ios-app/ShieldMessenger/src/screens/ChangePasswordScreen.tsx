import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const ChangePasswordScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordValid = newPassword.length >= 12;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleChange = () => {
    if (!currentPassword || !passwordValid || !passwordsMatch) return;
    // TODO: Verify current password against Argon2id hash, re-encrypt SQLCipher DB with new key
    Alert.alert(t('password_changed'), t('password_changed_msg'), [
      {text: t('ok'), onPress: () => navigation.goBack()},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('change_password')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder={t('current_password')}
          placeholderTextColor={Colors.textTertiary}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoFocus
        />

        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          placeholder={t('new_password_min')}
          placeholderTextColor={Colors.textTertiary}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, !passwordsMatch && confirmPassword.length > 0 && styles.inputError]}
          placeholder={t('confirm_password')}
          placeholderTextColor={Colors.textTertiary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {!passwordsMatch && confirmPassword.length > 0 && (
          <Text style={styles.errorText}>{t('passwords_dont_match')}</Text>
        )}

        <View style={styles.strengthRow}>
          <View style={[styles.strengthBar, newPassword.length >= 4 && {backgroundColor: Colors.error}]} />
          <View style={[styles.strengthBar, newPassword.length >= 8 && {backgroundColor: Colors.warning}]} />
          <View style={[styles.strengthBar, newPassword.length >= 12 && {backgroundColor: Colors.success}]} />
          <View style={[styles.strengthBar, newPassword.length >= 16 && {backgroundColor: Colors.primary}]} />
        </View>

        <TouchableOpacity
          style={[styles.changeBtn, (!currentPassword || !passwordValid || !passwordsMatch) && styles.btnDisabled]}
          disabled={!currentPassword || !passwordValid || !passwordsMatch}
          onPress={handleChange}>
          <Text style={styles.changeBtnText}>{t('change_password')}</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🔐 {t('password_argon2id')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl},
  input: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border},
  inputError: {borderColor: Colors.error},
  errorText: {color: Colors.error, fontSize: FontSize.xs, marginBottom: Spacing.sm},
  divider: {height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.lg},
  strengthRow: {flexDirection: 'row', gap: 4, marginBottom: Spacing.xl},
  strengthBar: {flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border},
  changeBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  changeBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  btnDisabled: {opacity: 0.4},
  infoCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.xl},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default ChangePasswordScreen;
