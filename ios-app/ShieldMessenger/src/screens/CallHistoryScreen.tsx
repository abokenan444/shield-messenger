import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

interface CallRecord {
  id: string;
  contactName: string;
  contactId: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  duration: number;
  encrypted: boolean;
}

const DEMO_CALLS: CallRecord[] = [
  {id: '1', contactName: 'Khalid', contactId: 'u1', type: 'outgoing', timestamp: Date.now() - 3600000, duration: 342, encrypted: true},
  {id: '2', contactName: 'Sara', contactId: 'u2', type: 'incoming', timestamp: Date.now() - 7200000, duration: 128, encrypted: true},
  {id: '3', contactName: 'Omar', contactId: 'u3', type: 'missed', timestamp: Date.now() - 86400000, duration: 0, encrypted: true},
  {id: '4', contactName: 'Layla', contactId: 'u4', type: 'outgoing', timestamp: Date.now() - 172800000, duration: 567, encrypted: true},
  {id: '5', contactName: 'Ahmed', contactId: 'u5', type: 'incoming', timestamp: Date.now() - 259200000, duration: 89, encrypted: true},
];

const CallHistoryScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const filtered = filter === 'missed' ? DEMO_CALLS.filter(c => c.type === 'missed') : DEMO_CALLS;

  const formatDuration = (s: number) => s === 0 ? '' : `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    return d.toLocaleDateString();
  };
  const typeIcon = (type: string) => type === 'incoming' ? '📥' : type === 'outgoing' ? '📤' : '📵';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Call History</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'missed'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'all' ? 'All' : 'Missed'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.callRow} onPress={() => navigation.navigate('VoiceCall', {contactId: item.contactId, contactName: item.contactName})}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.contactName[0]}</Text>
            </View>
            <View style={styles.callInfo}>
              <Text style={[styles.callName, item.type === 'missed' && styles.missedText]}>{item.contactName}</Text>
              <Text style={styles.callMeta}>{typeIcon(item.type)} {item.type} {formatDuration(item.duration)}</Text>
            </View>
            <View style={styles.callRight}>
              <Text style={styles.callDate}>{formatDate(item.timestamp)}</Text>
              {item.encrypted && <Text style={styles.lockIcon}>🔐</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No {filter} calls</Text>}
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
  callRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: Colors.primary, fontSize: FontSize.lg, fontWeight: '600'},
  callInfo: {flex: 1, marginLeft: Spacing.md},
  callName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  missedText: {color: Colors.error},
  callMeta: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  callRight: {alignItems: 'flex-end'},
  callDate: {color: Colors.textTertiary, fontSize: FontSize.xs},
  lockIcon: {fontSize: 12, marginTop: 4},
  empty: {color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.xxl, fontSize: FontSize.md},
});

export default CallHistoryScreen;
