import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const CreateAccountScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<'name' | 'password'>('name');

  const passwordValid = password.length >= 12;
  const passwordsMatch = password === confirmPassword;

  const handleCreate = async () => {
    if (!passwordValid || !passwordsMatch) return;
    setCreating(true);
    // TODO: Call Rust core to generate Ed25519 + X25519 keypairs, ML-KEM keys, derive Argon2id key
    setTimeout(() => {
      setCreating(false);
      navigation.navigate('AccountCreated');
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'password' ? setStep('name') : navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>{t('step_of').replace('%s', step === 'name' ? '1' : '2').replace('%s', '2')}</Text>
      </View>

      {step === 'name' ? (
        <View style={styles.content}>
          <Text style={styles.title}>{t('choose_display_name')}</Text>
          <Text style={styles.subtitle}>{t('display_name_hint')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('display_name')}
            placeholderTextColor={Colors.textTertiary}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.nextBtn, !displayName.trim() && styles.btnDisabled]}
            disabled={!displayName.trim()}
            onPress={() => setStep('password')}>
            <Text style={styles.nextBtnText}>{t('next')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>{t('set_your_password')}</Text>
          <Text style={styles.subtitle}>{t('password_encrypts_db')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('password_min_chars')}
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoFocus
          />
          <TextInput
            style={[styles.input, !passwordsMatch && confirmPassword.length > 0 && styles.inputError]}
            placeholder={t('confirm_password_input')}
            placeholderTextColor={Colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {!passwordsMatch && confirmPassword.length > 0 && (
            <Text style={styles.errorText}>{t('passwords_dont_match')}</Text>
          )}

          <View style={styles.strengthRow}>
            <View style={[styles.strengthBar, password.length >= 4 && styles.strengthWeak]} />
            <View style={[styles.strengthBar, password.length >= 8 && styles.strengthMedium]} />
            <View style={[styles.strengthBar, password.length >= 12 && styles.strengthStrong]} />
            <View style={[styles.strengthBar, password.length >= 16 && styles.strengthVeryStrong]} />
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, (!passwordValid || !passwordsMatch) && styles.btnDisabled]}
            disabled={!passwordValid || !passwordsMatch || creating}
            onPress={handleCreate}>
            {creating ? (
              <ActivityIndicator color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.nextBtnText}>{t('create_account')}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.warning}>⚠️ {t('no_password_recovery')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  stepText: {color: Colors.textTertiary, fontSize: FontSize.sm},
  content: {flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl},
  title: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.sm},
  subtitle: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.xl},
  input: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border},
  inputError: {borderColor: Colors.error},
  errorText: {color: Colors.error, fontSize: FontSize.xs, marginBottom: Spacing.sm},
  strengthRow: {flexDirection: 'row', gap: 4, marginBottom: Spacing.xl},
  strengthBar: {flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border},
  strengthWeak: {backgroundColor: Colors.error},
  strengthMedium: {backgroundColor: Colors.warning},
  strengthStrong: {backgroundColor: Colors.success},
  strengthVeryStrong: {backgroundColor: Colors.primary},
  nextBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  nextBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  btnDisabled: {opacity: 0.4},
  warning: {color: Colors.warning, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.lg},
});

export default CreateAccountScreen;
