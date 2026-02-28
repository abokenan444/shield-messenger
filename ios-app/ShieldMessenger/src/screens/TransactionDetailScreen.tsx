import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const TransactionDetailScreen: React.FC<{route: any; navigation: any}> = ({route, navigation}) => {
  const tx = route.params?.tx || {
    id: 'tx1', type: 'received', amount: 0.5, address: '47sgh...3k2',
    timestamp: Date.now() - 3600000, confirmations: 12, fee: 0.0001,
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transaction</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.amountSection}>
        <View style={[styles.icon, tx.type === 'received' ? styles.receivedIcon : styles.sentIcon]}>
          <Text style={styles.iconText}>{tx.type === 'received' ? '↓' : '↑'}</Text>
        </View>
        <Text style={[styles.amount, tx.type === 'received' ? styles.amountReceived : styles.amountSent]}>
          {tx.type === 'received' ? '+' : '-'}{tx.amount.toFixed(4)} XMR
        </Text>
        <Text style={styles.status}>
          {tx.confirmations >= 10 ? '✓ Confirmed' : `⏳ ${tx.confirmations} confirmations`}
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{tx.type === 'received' ? 'Received' : 'Sent'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formatDate(tx.timestamp)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={[styles.detailValue, styles.mono]}>{tx.address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Confirmations</Text>
          <Text style={styles.detailValue}>{tx.confirmations}</Text>
        </View>
        {tx.fee && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Fee</Text>
            <Text style={styles.detailValue}>{tx.fee} XMR</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID</Text>
          <Text style={[styles.detailValue, styles.mono]}>{tx.id}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          🔐 Monero transactions use RingCT and stealth addresses. The actual amounts and addresses are hidden on the blockchain.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  amountSection: {alignItems: 'center', paddingVertical: Spacing.xxl, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  icon: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center'},
  receivedIcon: {backgroundColor: 'rgba(76,175,80,0.15)'},
  sentIcon: {backgroundColor: 'rgba(239,83,80,0.15)'},
  iconText: {fontSize: 28, fontWeight: '700'},
  amount: {fontSize: FontSize.title, fontWeight: '700', marginTop: Spacing.md},
  amountReceived: {color: Colors.success},
  amountSent: {color: Colors.error},
  status: {color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.sm},
  details: {padding: Spacing.lg},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  detailLabel: {color: Colors.textSecondary, fontSize: FontSize.sm},
  detailValue: {color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: Spacing.lg},
  mono: {fontFamily: 'monospace'},
  infoCard: {margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default TransactionDetailScreen;
