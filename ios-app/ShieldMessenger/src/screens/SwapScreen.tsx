import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const SwapScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [fromCurrency, setFromCurrency] = useState('SOL');
  const [toCurrency, setToCurrency] = useState('ZEC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

  const currencies = [
    {symbol: 'SOL', name: 'Solana', balance: '2.5000', icon: '◎'},
    {symbol: 'ZEC', name: 'Zcash', balance: '0.1300', icon: 'ⓩ'},
  ];

  const exchangeRate = fromCurrency === 'SOL' ? 0.85 : 1.18; // Mock rate

  const handleAmountChange = (val: string) => {
    setFromAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setToAmount((num * exchangeRate).toFixed(4));
    } else {
      setToAmount('');
    }
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      Alert.alert(t('error'), t('enter_amount'));
      return;
    }
    Alert.alert(
      t('confirm'),
      `${t('swap')} ${fromAmount} ${fromCurrency} → ${toAmount} ${toCurrency}?`,
      [
        {text: t('cancel'), style: 'cancel'},
        {text: t('confirm'), onPress: () => {
          Alert.alert(t('success'), `${t('swap')} complete!`);
          navigation.goBack();
        }},
      ],
    );
  };

  const fromCurrencyData = currencies.find(c => c.symbol === fromCurrency)!;
  const toCurrencyData = currencies.find(c => c.symbol === toCurrency)!;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('swap')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        {/* From */}
        <View style={styles.currencyBox}>
          <View style={styles.currencyHeader}>
            <Text style={styles.currencyLabel}>From</Text>
            <Text style={styles.balanceText}>
              {t('balance')}: {fromCurrencyData.balance} {fromCurrency}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={fromAmount}
              onChangeText={handleAmountChange}
              placeholder="0.0000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
            />
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyIcon}>{fromCurrencyData.icon}</Text>
              <Text style={styles.currencySymbol}>{fromCurrency}</Text>
            </View>
          </View>
        </View>

        {/* Swap Arrow */}
        <TouchableOpacity style={styles.swapArrow} onPress={handleSwapCurrencies}>
          <Text style={styles.swapArrowText}>⇅</Text>
        </TouchableOpacity>

        {/* To */}
        <View style={styles.currencyBox}>
          <View style={styles.currencyHeader}>
            <Text style={styles.currencyLabel}>To</Text>
            <Text style={styles.balanceText}>
              {t('balance')}: {toCurrencyData.balance} {toCurrency}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <TextInput
              style={[styles.amountInput, {color: Colors.textSecondary}]}
              value={toAmount}
              editable={false}
              placeholder="0.0000"
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyIcon}>{toCurrencyData.icon}</Text>
              <Text style={styles.currencySymbol}>{toCurrency}</Text>
            </View>
          </View>
        </View>

        {/* Rate */}
        <View style={styles.rateBox}>
          <Text style={styles.rateLabel}>Exchange Rate</Text>
          <Text style={styles.rateValue}>
            1 {fromCurrency} ≈ {exchangeRate.toFixed(4)} {toCurrency}
          </Text>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
          <Text style={styles.swapButtonText}>{t('swap')}</Text>
        </TouchableOpacity>
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
  content: {flex: 1, padding: Spacing.xl},
  currencyBox: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  currencyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  currencyLabel: {color: Colors.textTertiary, fontSize: FontSize.sm},
  balanceText: {color: Colors.textTertiary, fontSize: FontSize.sm},
  amountRow: {flexDirection: 'row', alignItems: 'center'},
  amountInput: {
    flex: 1, fontSize: 28, fontWeight: '700', color: Colors.textPrimary,
  },
  currencyBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
  },
  currencyIcon: {fontSize: 18, marginRight: 4},
  currencySymbol: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600'},
  swapArrow: {
    alignSelf: 'center', width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceVariant, justifyContent: 'center',
    alignItems: 'center', marginVertical: -10, zIndex: 1,
    borderWidth: 3, borderColor: Colors.background,
  },
  swapArrowText: {fontSize: 20, color: Colors.primary},
  rateBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.surface, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, marginTop: Spacing.xl,
  },
  rateLabel: {color: Colors.textTertiary, fontSize: FontSize.sm},
  rateValue: {color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600'},
  swapButton: {
    height: 56, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl,
  },
  swapButtonText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
});

export default SwapScreen;
