import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface Contact {
  id: string;
  name: string;
  address: string;
  isVerified: boolean;
  isOnline: boolean;
  lastSeen?: number;
}

interface ContactsScreenProps {
  navigation: any;
}

const DEMO_CONTACTS: Contact[] = [
  {id: '1', name: 'Alice', address: 'abc123...def.onion', isVerified: true, isOnline: true},
  {id: '2', name: 'Bob', address: 'ghi456...jkl.onion', isVerified: true, isOnline: true},
  {id: '3', name: 'Charlie', address: 'mno789...pqr.onion', isVerified: false, isOnline: false, lastSeen: Date.now() - 86400000},
  {id: '4', name: 'Diana', address: 'stu012...vwx.onion', isVerified: true, isOnline: false, lastSeen: Date.now() - 3600000},
];

const ContactsScreen: React.FC<ContactsScreenProps> = ({navigation}) => {
  const [contacts] = useState(DEMO_CONTACTS);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatLastSeen = (ts?: number): string => {
    if (!ts) return 'Unknown';
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const renderContact = ({item}: {item: Contact}) => (
    <TouchableOpacity
      style={styles.contactRow}
      onPress={() =>
        navigation.navigate('Chat', {contactId: item.id, contactName: item.name})
      }
      onLongPress={() =>
        Alert.alert(item.name, 'Contact options', [
          {text: 'View Info', onPress: () => {}},
          {text: 'Verify Safety Number', onPress: () => {}},
          {text: 'Delete Contact', style: 'destructive', onPress: () => {}},
          {text: 'Cancel', style: 'cancel'},
        ])
      }
      accessibilityLabel={`${item.name}. ${item.isOnline ? 'Online' : `Last seen ${formatLastSeen(item.lastSeen)}`}. ${item.isVerified ? 'Verified' : 'Not verified'}`}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.isVerified && (
            <Text style={styles.verifiedBadge} accessibilityLabel="Verified contact">
              ✓
            </Text>
          )}
        </View>
        <Text style={styles.contactAddress} numberOfLines={1}>
          {item.address}
        </Text>
      </View>

      <Text style={styles.statusText}>
        {item.isOnline ? t('online') : formatLastSeen(item.lastSeen)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('contacts')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddFriend')}
          accessibilityLabel={t('add_new_contact')}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Friend Requests */}
      <TouchableOpacity
        style={styles.pendingRow}
        onPress={() => navigation.navigate('FriendRequests')}>
        <Text style={styles.pendingIcon}>📩</Text>
        <Text style={styles.pendingText}>{t('friend_requests')}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>2</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_contacts')}
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderContact}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('no_contacts_found')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {fontSize: FontSize.title, fontWeight: '700', color: Colors.textPrimary},
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  addButtonText: {fontSize: 20, color: Colors.primary, fontWeight: '600'},
  pendingRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
  },
  pendingIcon: {fontSize: 18, marginRight: Spacing.md},
  pendingText: {flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500'},
  pendingBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  pendingBadgeText: {fontSize: FontSize.xs, fontWeight: '700', color: Colors.textOnPrimary},
  searchContainer: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  searchInput: {
    height: 40, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg,
    color: Colors.textPrimary, fontSize: FontSize.md,
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  avatarContainer: {position: 'relative', marginRight: Spacing.md},
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {fontSize: FontSize.lg, fontWeight: '600', color: Colors.primary},
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background,
  },
  contactInfo: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center'},
  contactName: {fontSize: FontSize.lg, fontWeight: '500', color: Colors.textPrimary},
  verifiedBadge: {
    fontSize: FontSize.sm, color: Colors.primary,
    marginLeft: Spacing.xs, fontWeight: '700',
  },
  contactAddress: {fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  statusText: {fontSize: FontSize.xs, color: Colors.textTertiary},
  separator: {height: 1, backgroundColor: Colors.divider, marginLeft: 72},
  emptyContainer: {alignItems: 'center', paddingVertical: Spacing.xxl * 2},
  emptyText: {fontSize: FontSize.lg, color: Colors.textSecondary},
});

export default ContactsScreen;
