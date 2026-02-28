import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const ContactInfoScreen: React.FC<{route: any; navigation: any}> = ({route, navigation}) => {
  const {contactId} = route.params || {contactId: '1'};
  const [blocked, setBlocked] = useState(false);

  // Demo contact data
  const contact = {
    name: 'Khalid',
    onionAddress: 'khalid7x3f...onion',
    trustLevel: 2,
    verified: true,
    safetyNumber: '05 42 68 13 97 24 56 81 03 69 45 72',
    lastSeen: 'Online',
    sharedGroups: ['Dev Team', 'Security Research'],
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contact.name[0]}</Text>
        </View>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.address}>{contact.onionAddress}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, styles.trustBadge]}>
            <Text style={styles.badgeText}>Trust L{contact.trustLevel}</Text>
          </View>
          {contact.verified && (
            <View style={[styles.badge, styles.verifiedBadge]}>
              <Text style={styles.badgeText}>✓ QR Verified</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Chat', {contactId, contactName: contact.name})}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('VoiceCall', {contactId, contactName: contact.name})}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QRCode')}>
          <Text style={styles.actionIcon}>📱</Text>
          <Text style={styles.actionLabel}>Verify</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Number</Text>
        <TouchableOpacity style={styles.safetyRow}>
          <Text style={styles.safetyNumber}>{contact.safetyNumber}</Text>
          <Text style={styles.compareBtn}>Compare ›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shared Groups</Text>
        {contact.sharedGroups.map(g => (
          <View key={g} style={styles.groupRow}>
            <Text style={styles.groupIcon}>👥</Text>
            <Text style={styles.groupName}>{g}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Block Contact</Text>
          <Switch value={blocked} onValueChange={setBlocked} trackColor={{false: Colors.border, true: Colors.error}} thumbColor={Colors.textPrimary} />
        </View>
        <TouchableOpacity style={styles.optionRow} onPress={() => Alert.alert('Delete Contact', 'This will remove all messages. Continue?', [{text: 'Cancel'}, {text: 'Delete', style: 'destructive'}])}>
          <Text style={styles.dangerText}>Delete Contact</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  profileSection: {alignItems: 'center', paddingVertical: Spacing.xl},
  avatar: {width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: Colors.primary, fontSize: 32, fontWeight: '600'},
  name: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginTop: Spacing.md},
  address: {color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 4},
  badges: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md},
  badge: {paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full},
  trustBadge: {backgroundColor: Colors.surface},
  verifiedBadge: {backgroundColor: 'rgba(76,175,80,0.15)'},
  badgeText: {color: Colors.success, fontSize: FontSize.xs, fontWeight: '600'},
  actionRow: {flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  actionBtn: {alignItems: 'center'},
  actionIcon: {fontSize: 24},
  actionLabel: {color: Colors.primary, fontSize: FontSize.xs, marginTop: 4},
  section: {borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingVertical: Spacing.md},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  safetyRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg},
  safetyNumber: {color: Colors.textPrimary, fontSize: FontSize.sm, fontFamily: 'monospace'},
  compareBtn: {color: Colors.primary, fontSize: FontSize.sm},
  groupRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  groupIcon: {fontSize: 16, marginRight: Spacing.sm},
  groupName: {color: Colors.textPrimary, fontSize: FontSize.md},
  optionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  optionLabel: {color: Colors.textPrimary, fontSize: FontSize.md},
  dangerText: {color: Colors.error, fontSize: FontSize.md, fontWeight: '500'},
});

export default ContactInfoScreen;
