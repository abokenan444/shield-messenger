import React, {useState} from 'react';
import {View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Switch, Image} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

interface Contact {
  id: string;
  name: string;
  onionAddress: string;
  selected: boolean;
}

const DEMO_CONTACTS: Contact[] = [
  {id: '1', name: 'Khalid', onionAddress: 'khalid...onion', selected: false},
  {id: '2', name: 'Sara', onionAddress: 'sara...onion', selected: false},
  {id: '3', name: 'Omar', onionAddress: 'omar...onion', selected: false},
  {id: '4', name: 'Layla', onionAddress: 'layla...onion', selected: false},
  {id: '5', name: 'Ahmed', onionAddress: 'ahmed...onion', selected: false},
];

const CreateGroupScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState(DEMO_CONTACTS);
  const [disappearingMessages, setDisappearingMessages] = useState(false);

  const toggleContact = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? {...c, selected: !c.selected} : c));
  };

  const selectedCount = contacts.filter(c => c.selected).length;

  const handleCreate = () => {
    if (groupName.trim() && selectedCount >= 1) {
      // TODO: Create group via CryptoService + CRDT
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Group</Text>
        <TouchableOpacity onPress={handleCreate} disabled={!groupName.trim() || selectedCount < 1}>
          <Text style={[styles.createButton, (!groupName.trim() || selectedCount < 1) && styles.disabled]}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nameSection}>
        <View style={styles.groupAvatar}>
          <Text style={styles.groupAvatarText}>📷</Text>
        </View>
        <TextInput
          style={styles.nameInput}
          placeholder="Group name"
          placeholderTextColor={Colors.textTertiary}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={50}
        />
      </View>

      <View style={styles.optionRow}>
        <Text style={styles.optionLabel}>Disappearing Messages</Text>
        <Switch
          value={disappearingMessages}
          onValueChange={setDisappearingMessages}
          trackColor={{false: Colors.border, true: Colors.primary}}
          thumbColor={Colors.textPrimary}
        />
      </View>

      <Text style={styles.sectionTitle}>Add Members ({selectedCount} selected)</Text>

      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity style={styles.contactRow} onPress={() => toggleContact(item.id)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactAddress}>{item.onionAddress}</Text>
            </View>
            <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
              {item.selected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.encryptionBanner}>
        <Text style={styles.encryptionText}>🔐 Group uses Sender Keys + PQ Double Ratchet</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backButton: {color: Colors.textPrimary, fontSize: FontSize.xl},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  createButton: {color: Colors.primary, fontSize: FontSize.lg, fontWeight: '600'},
  disabled: {opacity: 0.4},
  nameSection: {flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  groupAvatar: {width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  groupAvatarText: {fontSize: 24},
  nameInput: {flex: 1, marginLeft: Spacing.lg, color: Colors.textPrimary, fontSize: FontSize.lg},
  optionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  optionLabel: {color: Colors.textPrimary, fontSize: FontSize.md},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm},
  contactRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: Colors.primary, fontSize: FontSize.lg, fontWeight: '600'},
  contactInfo: {flex: 1, marginLeft: Spacing.md},
  contactName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  contactAddress: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  checkbox: {width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  checkboxSelected: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  checkmark: {color: Colors.textOnPrimary, fontSize: FontSize.sm, fontWeight: '700'},
  encryptionBanner: {padding: Spacing.md, backgroundColor: Colors.surface, alignItems: 'center'},
  encryptionText: {color: Colors.textTertiary, fontSize: FontSize.xs},
});

export default CreateGroupScreen;
