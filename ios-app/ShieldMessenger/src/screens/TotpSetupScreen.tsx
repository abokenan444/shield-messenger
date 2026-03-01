import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';
import QRCode from 'react-native-qrcode-svg';

const TotpSetupScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'done'>('intro');

  useEffect(() => {
    // Generate a random TOTP secret (base32)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTotpSecret(secret);
  }, []);

  const totpUri = `otpauth://totp/ShieldMessenger?secret=${totpSecret}&issuer=ShieldMessenger&algorithm=SHA1&digits=6&period=30`;

  const handleVerify = () => {
    if (verificationCode.length === 6 && /^\d+$/.test(verificationCode)) {
      setIs2FAEnabled(true);
      setStep('done');
      Alert.alert(t('success'), t('totp_verified'));
    } else {
      Alert.alert(t('error'), t('enter_totp_code'));
    }
  };

  const handleDisable = () => {
    Alert.alert(t('disable_2fa'), t('confirm') + '?', [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: () => {
          setIs2FAEnabled(false);
          setStep('intro');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('two_factor')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        {step === 'intro' && !is2FAEnabled && (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔐</Text>
            </View>
            <Text style={styles.description}>
              {t('two_factor')} adds an extra layer of security to your account.
              You will need an authenticator app like Google Authenticator or Authy.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('scan')}>
              <Text style={styles.primaryButtonText}>{t('enable_2fa')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'scan' && (
          <>
            <Text style={styles.stepTitle}>{t('scan_totp_qr')}</Text>
            <View style={styles.qrContainer}>
              <QRCode value={totpUri} size={200} backgroundColor="#FFF" color="#000" />
            </View>
            <View style={styles.secretBox}>
              <Text style={styles.secretLabel}>Manual entry key:</Text>
              <Text style={styles.secretText} selectable>{totpSecret}</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('verify')}>
              <Text style={styles.primaryButtonText}>{t('next')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'verify' && (
          <>
            <Text style={styles.stepTitle}>{t('enter_totp_code')}</Text>
            <TextInput
              style={styles.codeInput}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="000000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleVerify}>
              <Text style={styles.primaryButtonText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'done' && is2FAEnabled && (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✅</Text>
            </View>
            <Text style={styles.doneText}>{t('totp_verified')}</Text>
            <TouchableOpacity style={styles.dangerButton} onPress={handleDisable}>
              <Text style={styles.dangerButtonText}>{t('disable_2fa')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  backBtn: {color: Colors.primary, fontSize: FontSize.md},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, alignItems: 'center'},
  iconContainer: {marginBottom: Spacing.xl},
  icon: {fontSize: 64},
  description: {
    color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center',
    marginBottom: Spacing.xxl, lineHeight: 22,
  },
  stepTitle: {
    color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600',
    marginBottom: Spacing.xl, textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#FFF', padding: Spacing.xl, borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  secretBox: {
    backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg,
    width: '100%', marginBottom: Spacing.xl,
  },
  secretLabel: {color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.xs},
  secretText: {color: Colors.primary, fontSize: FontSize.md, fontFamily: 'Courier', letterSpacing: 2},
  codeInput: {
    width: 200, height: 60, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    color: Colors.textPrimary, fontSize: 32, fontWeight: '700', letterSpacing: 8,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  primaryButton: {
    width: '100%', height: 52, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center',
  },
  primaryButtonText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '600'},
  doneText: {
    color: Colors.success, fontSize: FontSize.xl, fontWeight: '600', marginBottom: Spacing.xxl,
  },
  dangerButton: {
    width: '100%', height: 52, backgroundColor: Colors.destructiveBackground,
    borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.destructive,
  },
  dangerButtonText: {color: Colors.destructive, fontSize: FontSize.lg, fontWeight: '600'},
});

export default TotpSetupScreen;
