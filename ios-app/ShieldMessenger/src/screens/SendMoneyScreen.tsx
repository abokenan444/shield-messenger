import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const SendMoneyScreen: React.FC<{route: any; navigation: any}> = ({route, navigation}) => {
  const [address, setAddress] = useState(route.params?.address || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const balance = 2.847; // Demo XMR balance
  const fee = 0.0001;
  const amountNum = parseFloat(amount) || 0;
  const total = amountNum + fee;
  const canSend = amountNum > 0 && amountNum <= balance && address.length > 10;

  const handleSend = () => {
    Alert.alert(
      t('confirm_transaction'),
      `${t('send')} ${amount} XMR ${t('to')} ${address.substring(0, 12)}...?\n${t('fee')}: ${fee} XMR`,
      [{text: t('cancel')}, {text: t('send'), onPress: () => navigation.goBack()}],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('send_xmr')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('available_balance')}</Text>
          <Text style={styles.balanceValue}>{balance.toFixed(4)} XMR</Text>
        </View>

        <Text style={styles.inputLabel}>{t('recipient_address')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('monero_address_or_onion')}
          placeholderTextColor={Colors.textTertiary}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.inputLabel}>{t('amount_xmr')}</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={[styles.input, {flex: 1}]}
            placeholder="0.0000"
            placeholderTextColor={Colors.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.maxBtn} onPress={() => setAmount((balance - fee).toFixed(4))}>
            <Text style={styles.maxBtnText}>MAX</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>{t('note_optional')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('payment_note')}
          placeholderTextColor={Colors.textTertiary}
          value={note}
          onChangeText={setNote}
        />

        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>{t('network_fee')}</Text>
          <Text style={styles.feeValue}>{fee} XMR</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>{t('total')}</Text>
          <Text style={styles.totalValue}>{total.toFixed(4)} XMR</Text>
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.btnDisabled]}
          disabled={!canSend}
          onPress={handleSend}>
          <Text style={styles.sendBtnText}>{t('send')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('QRScanner')}>
          <Text style={styles.scanBtnText}>📷 {t('scan_qr_code')}</Text>
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
  content: {flex: 1, paddingHorizontal: Spacing.lg},
  balanceCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.xl},
  balanceLabel: {color: Colors.textTertiary, fontSize: FontSize.sm},
  balanceValue: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginTop: 4},
  inputLabel: {color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.xs, marginTop: Spacing.md},
  input: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border},
  amountRow: {flexDirection: 'row', gap: Spacing.sm},
  maxBtn: {backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center'},
  maxBtnText: {color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700'},
  feeRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, marginTop: Spacing.sm},
  feeLabel: {color: Colors.textTertiary, fontSize: FontSize.sm},
  feeValue: {color: Colors.textSecondary, fontSize: FontSize.sm},
  totalValue: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600'},
  sendBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.xl},
  sendBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  btnDisabled: {opacity: 0.4},
  scanBtn: {paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md},
  scanBtnText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '500'},
});

export default SendMoneyScreen;
