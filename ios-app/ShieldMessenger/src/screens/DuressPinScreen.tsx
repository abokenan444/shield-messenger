import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const DuressPinScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'info' | 'setup' | 'confirm'>('info');

  const handleSetPin = () => {
    if (pin.length < 4) return;
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (pin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match. Try again.');
      setConfirmPin('');
      return;
    }
    // TODO: Save duress PIN via Rust core (separate from main PIN)
    Alert.alert('Duress PIN Set', 'Your duress PIN has been configured. Using this PIN at unlock will securely wipe sensitive data.', [
      {text: 'OK', onPress: () => navigation.goBack()},
    ]);
  };

  if (step === 'info') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Duress PIN</Text>
          <View style={{width: 60}} />
        </View>
        <View style={styles.content}>
          <Text style={styles.infoIcon}>🚨</Text>
          <Text style={styles.infoTitle}>What is a Duress PIN?</Text>
          <Text style={styles.infoText}>
            A duress PIN is a secondary PIN that, when entered, appears to unlock the app normally but silently wipes all sensitive data in the background.
          </Text>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>When activated:</Text>
            <Text style={styles.cardItem}>• All messages are securely wiped</Text>
            <Text style={styles.cardItem}>• Private keys are destroyed</Text>
            <Text style={styles.cardItem}>• Wallet data is removed</Text>
            <Text style={styles.cardItem}>• App shows empty state</Text>
            <Text style={styles.cardItem}>• No evidence of data destruction</Text>
          </View>
          <TouchableOpacity style={styles.setupBtn} onPress={() => setStep('setup')}>
            <Text style={styles.setupBtnText}>Set Up Duress PIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'confirm' ? setStep('setup') : setStep('info')}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{step === 'setup' ? 'Set PIN' : 'Confirm PIN'}</Text>
        <View style={{width: 60}} />
      </View>
      <View style={styles.pinContent}>
        <Text style={styles.pinInstruction}>
          {step === 'setup' ? 'Enter a duress PIN (min 4 digits)' : 'Re-enter your duress PIN'}
        </Text>
        <Text style={styles.pinWarning}>Must be different from your unlock PIN</Text>

        <View style={styles.pinDots}>
          {Array.from({length: 6}).map((_, i) => (
            <View key={i} style={[styles.dot, i < (step === 'setup' ? pin : confirmPin).length && styles.dotFilled]} />
          ))}
        </View>

        <TextInput
          style={styles.hiddenInput}
          value={step === 'setup' ? pin : confirmPin}
          onChangeText={step === 'setup' ? setPin : setConfirmPin}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.confirmBtn, (step === 'setup' ? pin.length < 4 : confirmPin.length < 4) && styles.btnDisabled]}
          disabled={step === 'setup' ? pin.length < 4 : confirmPin.length < 4}
          onPress={step === 'setup' ? handleSetPin : handleConfirm}>
          <Text style={styles.confirmBtnText}>{step === 'setup' ? 'Next' : 'Confirm'}</Text>
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
  infoIcon: {fontSize: 64},
  infoTitle: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.lg},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', lineHeight: 24, marginTop: Spacing.md},
  infoCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', marginTop: Spacing.xl},
  cardTitle: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm},
  cardItem: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 24},
  setupBtn: {backgroundColor: Colors.error, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.lg, marginTop: Spacing.xxl},
  setupBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  pinContent: {flex: 1, alignItems: 'center', paddingTop: 80},
  pinInstruction: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '500'},
  pinWarning: {color: Colors.warning, fontSize: FontSize.xs, marginTop: Spacing.sm},
  pinDots: {flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xxl},
  dot: {width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.border},
  dotFilled: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  hiddenInput: {position: 'absolute', opacity: 0},
  confirmBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.lg, marginTop: Spacing.xxl},
  confirmBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  btnDisabled: {opacity: 0.4},
});

export default DuressPinScreen;
