import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const WalletSettingsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('wallet_settings')}</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.sectionTitle}>{t('display')}</Text>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('display_currency')}</Text>
        <Text style={styles.rowValue}>XMR ›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('decimal_places')}</Text>
        <Text style={styles.rowValue}>4 ›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('network')}</Text>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('node')}</Text>
        <Text style={styles.rowValue}>Local (Tor) ›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('network')}</Text>
        <Text style={styles.rowValue}>Mainnet ›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('security')}</Text>
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('BackupSeed')}>
        <Text style={styles.rowLabel}>{t('view_seed_phrase')}</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('view_keys')}</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('advanced')}</Text>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('rescan_blockchain')}</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>{t('export_key_images')}</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dangerRow} onPress={() => Alert.alert(t('remove_wallet'), t('remove_wallet_warning'), [{text: t('cancel')}, {text: t('remove'), style: 'destructive'}])}>
        <Text style={styles.dangerText}>{t('remove_wallet')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  rowLabel: {color: Colors.textPrimary, fontSize: FontSize.md},
  rowValue: {color: Colors.textTertiary, fontSize: FontSize.md},
  dangerRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, marginTop: Spacing.xxl, borderTopWidth: 1, borderTopColor: Colors.divider},
  dangerText: {color: Colors.error, fontSize: FontSize.md, fontWeight: '500'},
});

export default WalletSettingsScreen;
