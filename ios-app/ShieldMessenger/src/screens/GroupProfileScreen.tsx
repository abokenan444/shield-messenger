import React, {useState} from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet, Switch, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface Member {
  id: string;
  name: string;
  role: 'admin' | 'member';
  onionAddress: string;
  trustLevel: number;
}

const DEMO_MEMBERS: Member[] = [
  {id: 'me', name: 'You', role: 'admin', onionAddress: 'you...onion', trustLevel: 2},
  {id: '1', name: 'Khalid', role: 'admin', onionAddress: 'khalid...onion', trustLevel: 2},
  {id: '2', name: 'Sara', role: 'member', onionAddress: 'sara...onion', trustLevel: 1},
  {id: '3', name: 'Omar', role: 'member', onionAddress: 'omar...onion', trustLevel: 1},
  {id: '4', name: 'Layla', role: 'member', onionAddress: 'layla...onion', trustLevel: 0},
];

const GroupProfileScreen: React.FC<{route: any; navigation: any}> = ({route, navigation}) => {
  const {groupId, groupName} = route.params || {groupId: '1', groupName: 'Dev Team'};
  const [disappearing, setDisappearing] = useState(true);
  const [members] = useState(DEMO_MEMBERS);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.groupAvatar}>
          <Text style={styles.avatarEmoji}>👥</Text>
        </View>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.groupMeta}>{members.length} members · Created Jan 2025</Text>
        <Text style={styles.e2eeLabel}>🔐 {t('encrypted_sender_keys')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>{t('disappearing_messages')}</Text>
          <Switch
            value={disappearing}
            onValueChange={setDisappearing}
            trackColor={{false: Colors.border, true: Colors.primary}}
            thumbColor={Colors.textPrimary}
          />
        </View>
        <TouchableOpacity style={styles.optionRow}>
          <Text style={styles.optionLabel}>{t('shared_media')}</Text>
          <Text style={styles.optionValue}>23 items ›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionRow}>
          <Text style={styles.optionLabel}>{t('search_in_group')}</Text>
          <Text style={styles.optionValue}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('group_members')} ({members.length})</Text>
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.memberRow} onPress={() => item.id !== 'me' && navigation.navigate('ContactInfo', {contactId: item.id})}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name} {item.id === 'me' ? t('member_you') : ''}</Text>
              <Text style={styles.memberAddress}>{item.onionAddress}</Text>
            </View>
            <View style={styles.memberMeta}>
              {item.role === 'admin' && <Text style={styles.adminBadge}>{t('admin')}</Text>}
              <Text style={styles.trustBadge}>L{item.trustLevel}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.dangerSection}>
        <TouchableOpacity style={styles.dangerRow} onPress={() => Alert.alert(t('leave_group'), t('are_you_sure'))}>
          <Text style={styles.dangerText}>{t('leave_group')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  profileSection: {alignItems: 'center', paddingVertical: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  groupAvatar: {width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarEmoji: {fontSize: 36},
  groupName: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.md},
  groupMeta: {color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4},
  e2eeLabel: {color: Colors.success, fontSize: FontSize.xs, marginTop: Spacing.sm},
  section: {borderBottomWidth: 1, borderBottomColor: Colors.divider},
  optionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  optionLabel: {color: Colors.textPrimary, fontSize: FontSize.md},
  optionValue: {color: Colors.textTertiary, fontSize: FontSize.md},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm},
  memberRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  memberAvatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  memberAvatarText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '600'},
  memberInfo: {flex: 1, marginLeft: Spacing.md},
  memberName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  memberAddress: {color: Colors.textTertiary, fontSize: FontSize.xs},
  memberMeta: {flexDirection: 'row', gap: 6},
  adminBadge: {color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600', backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm, overflow: 'hidden'},
  trustBadge: {color: Colors.success, fontSize: FontSize.xs, fontWeight: '600'},
  dangerSection: {marginTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.divider},
  dangerRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  dangerText: {color: Colors.error, fontSize: FontSize.md, fontWeight: '500'},
});

export default GroupProfileScreen;
