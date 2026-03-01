import React, {useState} from 'react';
import {View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface Contact {
  id: string;
  name: string;
  onionAddress: string;
  online: boolean;
}

const DEMO_CONTACTS: Contact[] = [
  {id: '1', name: 'Khalid', onionAddress: 'khalid...onion', online: true},
  {id: '2', name: 'Sara', onionAddress: 'sara...onion', online: true},
  {id: '3', name: 'Omar', onionAddress: 'omar...onion', online: false},
  {id: '4', name: 'Layla', onionAddress: 'layla...onion', online: true},
  {id: '5', name: 'Ahmed', onionAddress: 'ahmed...onion', online: false},
];

const NewCallScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [search, setSearch] = useState('');
  const filtered = DEMO_CONTACTS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('new_call')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_contacts')}
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.contactRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
              </View>
              {item.online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactAddress}>{item.onionAddress}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('VoiceCall', {contactId: item.id, contactName: item.name})}>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>🔐 {t('all_calls_encrypted')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  searchContainer: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.md},
  searchInput: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md},
  contactRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  avatarContainer: {position: 'relative'},
  avatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: Colors.primary, fontSize: FontSize.lg, fontWeight: '600'},
  onlineDot: {position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background},
  contactInfo: {flex: 1, marginLeft: Spacing.md},
  contactName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  contactAddress: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  callBtn: {padding: Spacing.sm},
  callIcon: {fontSize: 24},
  footer: {padding: Spacing.md, alignItems: 'center'},
  footerText: {color: Colors.textTertiary, fontSize: FontSize.xs},
});

export default NewCallScreen;
