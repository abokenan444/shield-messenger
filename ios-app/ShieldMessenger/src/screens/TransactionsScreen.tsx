import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  address: string;
  timestamp: number;
  confirmations: number;
  fee?: number;
}

const DEMO_TXS: Transaction[] = [
  {id: 'tx1', type: 'received', amount: 0.5, address: '47sgh...3k2', timestamp: Date.now() - 3600000, confirmations: 12},
  {id: 'tx2', type: 'sent', amount: 0.1, address: '48bcd...9x1', timestamp: Date.now() - 86400000, confirmations: 256, fee: 0.0001},
  {id: 'tx3', type: 'received', amount: 1.0, address: '49efg...7y4', timestamp: Date.now() - 172800000, confirmations: 512},
  {id: 'tx4', type: 'sent', amount: 0.05, address: '4ahij...2z8', timestamp: Date.now() - 604800000, confirmations: 2048, fee: 0.0001},
];

const TransactionsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const filtered = filter === 'all' ? DEMO_TXS : DEMO_TXS.filter(t => t.type === filter);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transactions</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'sent', 'received'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.txRow} onPress={() => navigation.navigate('TransactionDetail', {tx: item})}>
            <View style={[styles.txIcon, item.type === 'received' ? styles.receivedIcon : styles.sentIcon]}>
              <Text style={styles.txIconText}>{item.type === 'received' ? '↓' : '↑'}</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txType}>{item.type === 'received' ? 'Received' : 'Sent'}</Text>
              <Text style={styles.txAddress}>{item.address}</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, item.type === 'received' ? styles.amountReceived : styles.amountSent]}>
                {item.type === 'received' ? '+' : '-'}{item.amount.toFixed(4)} XMR
              </Text>
              <Text style={styles.txDate}>{formatDate(item.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  filterRow: {flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm},
  filterBtn: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface},
  filterActive: {backgroundColor: Colors.primary},
  filterText: {color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '500'},
  filterTextActive: {color: Colors.textOnPrimary},
  txRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  txIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  receivedIcon: {backgroundColor: 'rgba(76,175,80,0.15)'},
  sentIcon: {backgroundColor: 'rgba(239,83,80,0.15)'},
  txIconText: {fontSize: 20, fontWeight: '700'},
  txInfo: {flex: 1, marginLeft: Spacing.md},
  txType: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  txAddress: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2, fontFamily: 'monospace'},
  txRight: {alignItems: 'flex-end'},
  txAmount: {fontSize: FontSize.md, fontWeight: '600'},
  amountReceived: {color: Colors.success},
  amountSent: {color: Colors.error},
  txDate: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  empty: {color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSize.md},
});

export default TransactionsScreen;
