import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  contact: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
}

interface WalletScreenProps {
  navigation: any;
}

const DEMO_TRANSACTIONS: Transaction[] = [
  {id: '1', type: 'receive', amount: '0.05', contact: 'Alice', timestamp: Date.now() - 3600000, status: 'confirmed'},
  {id: '2', type: 'send', amount: '0.02', contact: 'Bob', timestamp: Date.now() - 86400000, status: 'confirmed'},
  {id: '3', type: 'receive', amount: '0.10', contact: 'Charlie', timestamp: Date.now() - 172800000, status: 'pending'},
];

const WalletScreen: React.FC<WalletScreenProps> = ({navigation}) => {
  const [transactions] = useState(DEMO_TRANSACTIONS);

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  };

  const renderTransaction = ({item}: {item: Transaction}) => (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, item.type === 'receive' ? styles.txIconReceive : styles.txIconSend]}>
        <Text style={styles.txIconText}>{item.type === 'receive' ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.txContent}>
        <Text style={styles.txContact}>{item.type === 'receive' ? `From ${item.contact}` : `To ${item.contact}`}</Text>
        <Text style={styles.txDate}>{formatDate(item.timestamp)} {item.status === 'pending' ? '· Pending' : ''}</Text>
      </View>
      <Text style={[styles.txAmount, item.type === 'receive' ? styles.txAmountReceive : styles.txAmountSend]}>
        {item.type === 'receive' ? '+' : '-'}{item.amount} ZEC
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('wallet')}</Text>
        <View style={{width: 50}} />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('shielded_balance')}</Text>
        <Text style={styles.balanceAmount}>0.13 ZEC</Text>
        <Text style={styles.balanceFiat}>≈ $4.52 USD</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.balanceButton} accessibilityLabel="Send Zcash">
            <Text style={styles.balanceButtonText}>{t('send_money')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.balanceButton, styles.balanceButtonOutline]} accessibilityLabel={t('receive_money')}>
            <Text style={[styles.balanceButtonText, styles.balanceButtonOutlineText]}>{t('receive_money')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.shieldedNote}>🔒 {t('all_shielded')}</Text>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>{t('recent_transactions')}</Text>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.txList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('no_transactions')}</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl + Spacing.lg, paddingBottom: Spacing.md,
  },
  backText: {fontSize: FontSize.lg, color: Colors.primary},
  headerTitle: {fontSize: FontSize.xl, fontWeight: '600', color: Colors.textPrimary},
  balanceCard: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    padding: Spacing.xl, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, alignItems: 'center',
  },
  balanceLabel: {fontSize: FontSize.sm, color: Colors.textTertiary, marginBottom: Spacing.xs},
  balanceAmount: {fontSize: 36, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums']},
  balanceFiat: {fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs},
  balanceActions: {flexDirection: 'row', marginTop: Spacing.xl},
  balanceButton: {
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    marginHorizontal: Spacing.sm,
  },
  balanceButtonText: {fontSize: FontSize.md, fontWeight: '600', color: Colors.textOnPrimary},
  balanceButtonOutline: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary,
  },
  balanceButtonOutlineText: {color: Colors.primary},
  shieldedNote: {fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.lg},
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '600', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
  txList: {paddingHorizontal: Spacing.lg},
  txRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  txIconReceive: {backgroundColor: 'rgba(76, 175, 80, 0.15)'},
  txIconSend: {backgroundColor: 'rgba(244, 67, 54, 0.15)'},
  txIconText: {fontSize: 18, fontWeight: '700'},
  txContent: {flex: 1},
  txContact: {fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500'},
  txDate: {fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  txAmount: {fontSize: FontSize.md, fontWeight: '600', fontVariant: ['tabular-nums']},
  txAmountReceive: {color: Colors.success},
  txAmountSend: {color: Colors.error},
  separator: {height: 1, backgroundColor: Colors.divider},
  emptyText: {fontSize: FontSize.md, color: Colors.textTertiary, textAlign: 'center', paddingVertical: Spacing.xxl},
});

export default WalletScreen;
