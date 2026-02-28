import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const WalletSettingsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wallet Settings</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.sectionTitle}>Display</Text>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>Display Currency</Text>
        <Text style={styles.rowValue}>XMR ›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>Decimal Places</Text>
        <Text style={styles.rowValue}>4 ›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Network</Text>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>Node</Text>
        <Text style={styles.rowValue}>Local (Tor) ›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>Network</Text>
        <Text style={styles.rowValue}>Mainnet ›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Security</Text>
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('BackupSeed')}>
        <Text style={styles.rowLabel}>View Seed Phrase</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>View Keys</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Advanced</Text>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>Rescan Blockchain</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.rowLabel}>Export Key Images</Text>
        <Text style={styles.rowValue}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dangerRow} onPress={() => Alert.alert('Remove Wallet', 'This will delete the wallet from this device. Make sure you have your seed phrase backed up.', [{text: 'Cancel'}, {text: 'Remove', style: 'destructive'}])}>
        <Text style={styles.dangerText}>Remove Wallet</Text>
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
