import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t, setLocale, getLocale} from '../i18n';

const languages = [
  {code: 'en', name: 'English', nativeName: 'English'},
  {code: 'ar', name: 'Arabic', nativeName: 'العربية'},
  {code: 'fr', name: 'French', nativeName: 'Français'},
  {code: 'es', name: 'Spanish', nativeName: 'Español'},
  {code: 'de', name: 'German', nativeName: 'Deutsch'},
  {code: 'tr', name: 'Turkish', nativeName: 'Türkçe'},
  {code: 'fa', name: 'Persian', nativeName: 'فارسی'},
  {code: 'ur', name: 'Urdu', nativeName: 'اردو'},
  {code: 'zh', name: 'Chinese', nativeName: '中文'},
  {code: 'ja', name: 'Japanese', nativeName: '日本語'},
  {code: 'ko', name: 'Korean', nativeName: '한국어'},
  {code: 'ru', name: 'Russian', nativeName: 'Русский'},
  {code: 'pt', name: 'Portuguese', nativeName: 'Português'},
  {code: 'it', name: 'Italian', nativeName: 'Italiano'},
  {code: 'hi', name: 'Hindi', nativeName: 'हिन्दी'},
  {code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia'},
  {code: 'nl', name: 'Dutch', nativeName: 'Nederlands'},
];

const LanguageScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [selectedLang, setSelectedLang] = useState(getLocale());

  const handleSelect = (code: string) => {
    setSelectedLang(code);
    setLocale(code);
    // Force re-render by navigating
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('select_language')}</Text>
        <View style={{width: 60}} />
      </View>

      <FlatList
        data={languages}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.langRow, selectedLang === item.code && styles.langRowActive]}
            onPress={() => handleSelect(item.code)}>
            <View style={styles.langInfo}>
              <Text style={styles.langNative}>{item.nativeName}</Text>
              <Text style={styles.langName}>{item.name}</Text>
            </View>
            {selectedLang === item.code && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  backBtn: {color: Colors.primary, fontSize: FontSize.md},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  list: {padding: Spacing.xl},
  langRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  langRowActive: {borderColor: Colors.primary, backgroundColor: Colors.surfaceVariant},
  langInfo: {},
  langNative: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600'},
  langName: {color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: 2},
  checkmark: {color: Colors.primary, fontSize: 20, fontWeight: '700'},
});

export default LanguageScreen;
