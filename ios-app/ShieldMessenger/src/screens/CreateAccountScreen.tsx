import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

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
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Step {step === 'name' ? '1' : '2'} of 2</Text>
      </View>

      {step === 'name' ? (
        <View style={styles.content}>
          <Text style={styles.title}>Choose a Display Name</Text>
          <Text style={styles.subtitle}>This is how others will see you. It's not linked to any real identity.</Text>
          <TextInput
            style={styles.input}
            placeholder="Display name"
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
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Set Your Password</Text>
          <Text style={styles.subtitle}>Your password encrypts your local database with Argon2id. Minimum 12 characters.</Text>
          <TextInput
            style={styles.input}
            placeholder="Password (min 12 chars)"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoFocus
          />
          <TextInput
            style={[styles.input, !passwordsMatch && confirmPassword.length > 0 && styles.inputError]}
            placeholder="Confirm password"
            placeholderTextColor={Colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {!passwordsMatch && confirmPassword.length > 0 && (
            <Text style={styles.errorText}>Passwords don't match</Text>
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
              <Text style={styles.nextBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.warning}>⚠️ There is no password recovery. Write it down securely.</Text>
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
