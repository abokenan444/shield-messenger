import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

interface FriendRequest {
  id: string;
  name: string;
  onionAddress: string;
  timestamp: number;
  message?: string;
}

const DEMO_REQUESTS: FriendRequest[] = [
  {id: '1', name: 'Fatima', onionAddress: 'fatima3x...onion', timestamp: Date.now() - 3600000, message: 'Hey, met you at the conference'},
  {id: '2', name: 'Youssef', onionAddress: 'youssef8k...onion', timestamp: Date.now() - 86400000},
  {id: '3', name: 'Nora', onionAddress: 'nora5p...onion', timestamp: Date.now() - 172800000, message: 'Co-worker from security team'},
];

const FriendRequestsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [requests, setRequests] = useState(DEMO_REQUESTS);

  const handleAccept = (id: string) => {
    // TODO: Accept via Rust core
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleDecline = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friend Requests</Text>
        <View style={{width: 60}} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{item.name}</Text>
                <Text style={styles.requestAddress}>{item.onionAddress}</Text>
                {item.message && <Text style={styles.requestMessage}>"{item.message}"</Text>}
              </View>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  list: {padding: Spacing.lg},
  requestCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md},
  requestHeader: {flexDirection: 'row', alignItems: 'flex-start'},
  avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: Colors.primary, fontSize: FontSize.lg, fontWeight: '600'},
  requestInfo: {flex: 1, marginLeft: Spacing.md},
  requestName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600'},
  requestAddress: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  requestMessage: {color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.sm, fontStyle: 'italic'},
  time: {color: Colors.textTertiary, fontSize: FontSize.xs},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md, gap: Spacing.md},
  declineBtn: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceVariant},
  declineText: {color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '500'},
  acceptBtn: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.primary},
  acceptText: {color: Colors.textOnPrimary, fontSize: FontSize.sm, fontWeight: '600'},
  emptyContainer: {alignItems: 'center', marginTop: 100},
  emptyIcon: {fontSize: 48},
  emptyText: {color: Colors.textTertiary, fontSize: FontSize.lg, marginTop: Spacing.md},
});

export default FriendRequestsScreen;
