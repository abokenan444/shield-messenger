import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const RestoreAccountScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [restoring, setRestoring] = useState(false);

  const wordCount = seedPhrase.trim().split(/\s+/).filter(Boolean).length;
  const validSeed = wordCount === 24;

  const handleRestore = () => {
    if (!validSeed || password.length < 12) return;
    setRestoring(true);
    // TODO: Call Rust core to restore from BIP39 seed phrase
    setTimeout(() => {
      setRestoring(false);
      navigation.navigate('AccountCreated');
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('restore_account')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('enter_seed_phrase')}</Text>
        <Text style={styles.subtitle}>{t('enter_seed_words')}</Text>

        <TextInput
          style={styles.seedInput}
          placeholder="word1 word2 word3 ... word24"
          placeholderTextColor={Colors.textTertiary}
          value={seedPhrase}
          onChangeText={setSeedPhrase}
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.wordCount, validSeed && styles.wordCountValid]}>
          {t('words_count').replace('%s', String(wordCount))}
        </Text>

        <Text style={[styles.sectionTitle, {marginTop: Spacing.xl}]}>{t('set_new_password')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('password_min_chars')}
          placeholderTextColor={Colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.restoreBtn, (!validSeed || password.length < 12) && styles.btnDisabled]}
          disabled={!validSeed || password.length < 12 || restoring}
          onPress={handleRestore}>
          {restoring ? (
            <View style={styles.restoringRow}>
              <ActivityIndicator color={Colors.textOnPrimary} />
              <Text style={styles.restoreBtnText}> {t('restoring')}</Text>
            </View>
          ) : (
            <Text style={styles.restoreBtnText}>{t('restore_account')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ {t('security_notice')}</Text>
          <Text style={styles.warningText}>
            Never enter your seed phrase on any website or share it with anyone. Shield Messenger will never ask for it outside of this restore flow.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg},
  sectionTitle: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600', marginBottom: Spacing.xs},
  subtitle: {color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.md},
  seedInput: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, color: Colors.textPrimary, fontSize: FontSize.md, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.border},
  wordCount: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: Spacing.sm, textAlign: 'right'},
  wordCountValid: {color: Colors.success},
  input: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border},
  restoreBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.xl},
  restoreBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  restoringRow: {flexDirection: 'row', alignItems: 'center'},
  btnDisabled: {opacity: 0.4},
  warningCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.xl, borderLeftWidth: 3, borderLeftColor: Colors.warning},
  warningTitle: {color: Colors.warning, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm},
  warningText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default RestoreAccountScreen;
