import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
}

const DEMO_LOGS: LogEntry[] = [
  {id: '1', timestamp: Date.now() - 1000, level: 'info', module: 'Tor', message: 'Circuit established via DE→CH→IS'},
  {id: '2', timestamp: Date.now() - 2000, level: 'info', module: 'Crypto', message: 'ML-KEM encapsulation succeeded'},
  {id: '3', timestamp: Date.now() - 3000, level: 'debug', module: 'Ratchet', message: 'Double ratchet step: sending chain advanced'},
  {id: '4', timestamp: Date.now() - 5000, level: 'warn', module: 'Tor', message: 'Circuit timeout, rebuilding...'},
  {id: '5', timestamp: Date.now() - 8000, level: 'info', module: 'DB', message: 'SQLCipher database opened with Argon2id key'},
  {id: '6', timestamp: Date.now() - 10000, level: 'error', module: 'Network', message: 'Hidden service publish failed, retrying'},
  {id: '7', timestamp: Date.now() - 15000, level: 'info', module: 'Tor', message: 'Hidden service published successfully'},
  {id: '8', timestamp: Date.now() - 20000, level: 'debug', module: 'Padding', message: 'PADME padding applied: 128 → 256 bytes'},
  {id: '9', timestamp: Date.now() - 30000, level: 'info', module: 'Init', message: 'Shield Messenger core initialized v0.1.0'},
];

const SystemLogScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const filtered = filter === 'all' ? DEMO_LOGS : DEMO_LOGS.filter(l => l.level === filter);

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return Colors.error;
      case 'warn': return Colors.warning;
      case 'debug': return Colors.textTertiary;
      default: return Colors.success;
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('system_log')}</Text>
        <TouchableOpacity>
          <Text style={styles.clearBtn}>{t('clear')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'info', 'warn', 'error', 'debug'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.logRow}>
            <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
            <Text style={[styles.logLevel, {color: levelColor(item.level)}]}>{item.level.toUpperCase().padEnd(5)}</Text>
            <Text style={styles.logModule}>[{item.module}]</Text>
            <Text style={styles.logMessage} numberOfLines={2}>{item.message}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  clearBtn: {color: Colors.error, fontSize: FontSize.md},
  filterRow: {flexDirection: 'row', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: 4},
  filterBtn: {paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, backgroundColor: Colors.surface},
  filterActive: {backgroundColor: Colors.primary},
  filterText: {color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600'},
  filterTextActive: {color: Colors.textOnPrimary},
  logRow: {flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider, alignItems: 'flex-start'},
  logTime: {color: Colors.textTertiary, fontSize: 10, fontFamily: 'monospace', width: 85},
  logLevel: {fontSize: 10, fontFamily: 'monospace', fontWeight: '700', width: 42},
  logModule: {color: Colors.primary, fontSize: 10, fontFamily: 'monospace', width: 60},
  logMessage: {color: Colors.textPrimary, fontSize: 11, fontFamily: 'monospace', flex: 1},
});

export default SystemLogScreen;
